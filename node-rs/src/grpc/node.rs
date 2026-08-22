use std::collections::HashMap;

use sea_orm::ActiveValue::Set;
use sea_orm::{ActiveModelTrait, EntityTrait};
use tonic::{Request, Response, Status};

use super::proto::common::ContainerStatus;
use super::proto::node::*;
use crate::App;
use crate::db;

#[tonic::async_trait]
impl node_server::Node for App {
    async fn ping(&self, _: Request<()>) -> Result<Response<()>, Status> {
        Ok(Response::new(()))
    }

    async fn get_servers(&self, _: Request<()>) -> Result<Response<ServersResponse>, Status> {
        let servers = db::server::Entity::find()
            .all(&self.db)
            .await
            .map_err(|e| Status::internal(format!("Failed to load servers: {e}")))?;

        let mut loaded_servers = vec![];
        for server in servers {
            let inspect = if let Some(container_id) = &server.container_id {
                Some(
                    self.docker
                        .inspect_container(container_id, None)
                        .await
                        .unwrap(),
                )
            } else {
                None
            };

            let status = if let Some(inspect) = inspect
                && let Some(state) = inspect.state
                && let Some(status) = state.status
            {
                Some(ContainerStatus::from(status))
            } else {
                None
            };

            loaded_servers.push(servers_response::Server {
                id: server.id.to_string(),
                container_id: server.container_id.clone(),
                name: server.name.clone(),
                status: match status {
                    Some(status) => status,
                    None => ContainerStatus::Unspecified,
                } as i32,
                r#type: server.server_type.clone(),
                recent_stats: vec![],
            });
        }
        Ok(Response::new(ServersResponse {
            servers: loaded_servers,
        }))
    }

    async fn get_server_types(
        &self,
        _: Request<()>,
    ) -> Result<Response<ServerTypesResponse>, Status> {
        Ok(Response::new(ServerTypesResponse {
            server_types: self
                .server_types
                .clone()
                .into_iter()
                .map(|server_type| server_type.manifest)
                .collect(),
        }))
    }

    async fn create_server(
        &self,
        request: Request<CreateServerRequest>,
    ) -> Result<Response<()>, Status> {
        let req = request.into_inner();

        let server_type = self
            .server_types
            .iter()
            .find(|server_type| server_type.manifest.id == req.r#type)
            .ok_or(Status::not_found("Servertype not found"))?;

        let mut options = HashMap::new();
        for (id, option) in &server_type.manifest.options {
            options.insert(id.clone(), option.default.clone());
        }

        db::server::ActiveModel::insert(
            db::server::ActiveModel {
                id: Set(uuid::Uuid::new_v4()),
                owner_id: Set(uuid::Uuid::parse_str(&req.user_id).unwrap()),
                name: Set(req.name),
                server_type: Set(server_type.manifest.id.clone()),
                container_id: Set(None),
                options: Set(db::server::ServerOptions(options)),
                ports: Set(vec![]),
                cpu_limit: Set(1.0),
                ram_limit: Set(1024),
                restart_policy: Set(db::restart_policy::RestartPolicy::No),
                restart_retry_count: Set(1),
            },
            &self.db,
        )
        .await
        .or(Err(Status::internal("Failed to insert server")))?;

        Ok(Response::new(()))
    }
}
