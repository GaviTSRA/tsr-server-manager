use std::collections::HashMap;
use std::fs;
use std::path::Path;

use bollard::container::AttachContainerResults;
use bollard::plugin::{
    ContainerCreateBody, HostConfig, PortBinding, RestartPolicy, RestartPolicyNameEnum,
};
use bollard::query_parameters::{AttachContainerOptionsBuilder, CreateContainerOptionsBuilder};
use rhai::Scope;
use sea_orm::ActiveModelTrait;
use sea_orm::ActiveValue::Set;
use tokio::io::AsyncWriteExt;
use tonic::{Request, Response, Status};

use super::proto::common::ServerRequest;
use super::proto::server_power::*;
use crate::db::restart_policy;
use crate::{App, db};

#[tonic::async_trait]
impl server_power_server::ServerPower for App {
    async fn start(&self, request: Request<ServerRequest>) -> Result<Response<()>, Status> {
        let req = request.into_inner();
        let server = self.resolve_server(&req.server_id).await?;
        let server_type = self.resolve_server_type(&server)?;

        let container_id = match server.container_id {
            Some(container_id) => container_id,
            None => {
                let mut env = vec![];
                for (key, value) in &server.options.0 {
                    env.push(format!("{}={}", key.to_uppercase(), value));
                }
                env.push(format!("SERVER_RAM={}", server.ram_limit));

                let mut start_command = vec![];
                for part in &server_type.manifest.start_command {
                    let mut part = part.clone();
                    for (key, value) in &server.options.0 {
                        part = part
                            .replace("${SERVER_RAM}", &server.ram_limit.to_string())
                            .replace(&format!("${{{}}}", key), &value);
                    }
                    start_command.push(part);
                }
                println!("{start_command:?}");

                // TODO: Server level config for tcp/udp/mapping per port
                let mut exposed_ports = vec![];
                let mut port_bindings = HashMap::new();
                for port in &server.ports {
                    exposed_ports.push(format!("{port}/tcp"));
                    exposed_ports.push(format!("{port}/udp"));
                    let binding = PortBinding {
                        host_port: Some(port.to_string()),
                        ..Default::default()
                    };
                    port_bindings.insert(format!("{port}/tcp"), Some(vec![binding.clone()]));
                    port_bindings.insert(format!("{port}/udp"), Some(vec![binding]));
                }

                let image = match &server_type.manifest.image {
                    Some(image) => image.clone(),
                    None => server
                        .options
                        .0
                        .get("image")
                        .ok_or(Status::internal("Failed to find image to use"))?
                        .to_string(),
                };

                let retry_count =
                    if server.restart_policy == db::restart_policy::RestartPolicy::OnFailure {
                        Some(server.restart_retry_count as i64)
                    } else {
                        None
                    };

                // TODO: env for init path and other path handling here
                let root_dir = std::env::var("SERVERS_DIRECTORY").unwrap();
                let root = Path::new(&root_dir).parent().unwrap();
                let server_dir = root.join("servers").join(&server.id.to_string());
                println!("{server_dir:?}");
                if !server_dir.exists() {
                    fs::create_dir_all(&server_dir).unwrap();
                }

                let container = self
                    .docker
                    .create_container(
                        Some(
                            CreateContainerOptionsBuilder::new()
                                .name(&server.name.to_lowercase().replace(" ", "-"))
                                .build(),
                        ),
                        ContainerCreateBody {
                            attach_stdin: Some(true),
                            attach_stdout: Some(true),
                            attach_stderr: Some(true),
                            entrypoint: Some(vec!["/init/entrypoint.sh".to_string()]),
                            exposed_ports: Some(exposed_ports),
                            tty: Some(false),
                            open_stdin: Some(true),
                            stdin_once: Some(false),
                            env: Some(env),
                            cmd: Some(start_command),
                            image: Some(image),
                            working_dir: Some("/server".to_string()),
                            host_config: Some(HostConfig {
                                binds: Some(vec![
                                    format!("{}:/server", server_dir.to_string_lossy()),
                                    format!("{}/init/:/init:ro", root.to_string_lossy()),
                                ]),
                                port_bindings: Some(port_bindings),
                                memory: Some(server.ram_limit as i64 * 1024 * 1024),
                                nano_cpus: Some((1_000_000_000.0 * server.cpu_limit) as i64),
                                restart_policy: Some(RestartPolicy {
                                    name: match server.restart_policy {
                                        restart_policy::RestartPolicy::No => {
                                            Some(RestartPolicyNameEnum::NO)
                                        }
                                        restart_policy::RestartPolicy::UnlessStopped => {
                                            Some(RestartPolicyNameEnum::UNLESS_STOPPED)
                                        }
                                        restart_policy::RestartPolicy::OnFailure => {
                                            Some(RestartPolicyNameEnum::ON_FAILURE)
                                        }
                                        restart_policy::RestartPolicy::Always => {
                                            Some(RestartPolicyNameEnum::ALWAYS)
                                        }
                                    },
                                    maximum_retry_count: retry_count,
                                }),
                                ..Default::default()
                            }),
                            ..Default::default()
                        },
                    )
                    .await
                    .or_else(|err| {
                        Err(Status::internal(format!(
                            "Failed to create container: {err}"
                        )))
                    })?;

                let mut server: db::server::ActiveModel = server.clone().into();
                server.container_id = Set(Some(container.id.clone()));
                server
                    .update(&self.db)
                    .await
                    .or(Err(Status::internal("Failed to update container id")))?;

                container.id
            }
        };

        self.docker
            .start_container(&container_id, None)
            .await
            .or_else(|err| Err(Status::internal(format!("Failed to start server: {err}"))))?;

        let rhai = self.rhai.clone();
        let install_script = server_type.install_script.clone();
        tokio::task::spawn_blocking(move || -> Result<(), Status> {
            let mut scope = Scope::new();
            for (key, value) in server.options.0 {
                scope.push_constant(key.to_uppercase(), value);
            }
            scope.push_constant("SERVER_ID", server.id.to_string());
            scope.push_constant("CONTAINER_ID", container_id);
            rhai.run_ast_with_scope(&mut scope, &install_script)
                .or_else(|err| Err(Status::internal(format!("Install script failed: {err}"))))?;
            Ok(())
        })
        .await
        .unwrap()?;

        // TODO: Watch stats and send log events
        Ok(Response::new(()))
    }

    async fn restart(&self, request: Request<ServerRequest>) -> Result<Response<()>, Status> {
        let req = request.into_inner();
        let server = self.resolve_server(&req.server_id).await?;
        let container_id = server
            .container_id
            .ok_or(Status::invalid_argument("Server not installed"))?;

        // TODO: Send stop command first and then restart?
        self.docker
            .restart_container(&container_id, None)
            .await
            .or_else(|err| Err(Status::internal(format!("Failed to restart server: {err}"))))?;

        Ok(Response::new(()))
    }

    async fn stop(&self, request: Request<ServerRequest>) -> Result<Response<()>, Status> {
        let req = request.into_inner();
        let server = self.resolve_server(&req.server_id).await?;
        let server_type = self.resolve_server_type(&server)?;
        let container_id = server
            .container_id
            .ok_or(Status::invalid_argument("Server not installed"))?;

        // TODO: Reusable attached stdin
        let AttachContainerResults {
            mut input,
            output: _,
        } = self
            .docker
            .attach_container(
                &container_id,
                Some(AttachContainerOptionsBuilder::new().stdin(true).build()),
            )
            .await
            .or(Err(Status::internal("Failed to attach to container")))?;
        input
            .write_all(&server_type.manifest.stop_command.as_bytes())
            .await
            .or_else(|err| {
                Err(Status::internal(format!(
                    "Failed to write command to container: {err}"
                )))
            })?;

        // TODO: Wait before stopping container?
        self.docker
            .stop_container(&container_id, None)
            .await
            .or_else(|err| Err(Status::internal(format!("Failed to stop server: {err}"))))?;

        Ok(Response::new(()))
    }

    async fn kill(&self, request: Request<ServerRequest>) -> Result<Response<()>, Status> {
        let req = request.into_inner();
        let server = self.resolve_server(&req.server_id).await?;
        let container_id = server
            .container_id
            .ok_or(Status::invalid_argument("Server not installed"))?;

        self.docker
            .kill_container(&container_id, None)
            .await
            .or_else(|err| Err(Status::internal(format!("Failed to kill server: {err}"))))?;

        Ok(Response::new(()))
    }
}
