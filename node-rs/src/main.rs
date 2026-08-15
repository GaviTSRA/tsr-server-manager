use sea_orm::{Database, DatabaseConnection, EntityTrait};
use tonic::{Request, Response, Status};
use tonic_middleware::InterceptorFor;

use crate::db::server::Entity as Server;
use crate::node::{PongResponse, node_server::NodeServer};
use crate::server_types::{ServerType, load_server_types};

mod db;
mod middleware;
mod server_types;

pub mod node {
    tonic::include_proto!("node");
}

#[derive(Default)]
pub struct Node {
    db: DatabaseConnection,
    server_types: Vec<ServerType>,
    password: String,
}

#[tonic::async_trait]
impl node::node_server::Node for Node {
    async fn ping(
        &self,
        _: Request<node::PingRequest>,
    ) -> Result<Response<node::PongResponse>, Status> {
        Ok(Response::new(PongResponse {}))
    }

    async fn authenticate(
        &self,
        request: Request<node::AuthenticateRequest>,
    ) -> Result<Response<node::AuthenticateResponse>, Status> {
        middleware::auth::auth_route(request.into_inner(), self.password.clone())
    }

    async fn get_servers(
        &self,
        _: Request<node::ServersRequest>,
    ) -> Result<Response<node::ServersResponse>, Status> {
        let servers = Server::find()
            .all(&self.db)
            .await
            .map_err(|_| Status::internal("Failed to load servers"))?;
        let loaded_servers = servers
            .iter()
            .map(|server| node::Server {
                id: server.id.to_string(),
                container_id: server.container_id.clone(),
                name: server.name.clone(),
                status: Some(node::ContainerStatus::Unspecified as i32),
                r#type: server.server_type.clone(),
                recent_stats: vec![],
            })
            .collect();
        Ok(Response::new(node::ServersResponse {
            servers: loaded_servers,
        }))
    }

    async fn get_server_types(
        &self,
        _: Request<node::ServerTypesRequest>,
    ) -> Result<Response<node::ServerTypesResponse>, Status> {
        Ok(Response::new(node::ServerTypesResponse {
            server_types: self
                .server_types
                .clone()
                .into_iter()
                .map(|server_type| server_type.manifest)
                .collect(),
        }))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Connecting to db...");
    let db: DatabaseConnection =
        Database::connect("postgres://postgres:postgres@localhost:5434/tsm-node").await?;
    println!("Connected to db");
    println!("Applying schema...");
    db.get_schema_registry("node-rs::db::*").sync(&db).await?;
    println!("Schema applied");

    println!("Loading server types...");
    let server_types = load_server_types();
    println!("Loaded {} server types", server_types.len());

    let addr = "0.0.0.0:8772".parse().unwrap();
    let node = Node {
        db,
        server_types,
        password: "Node".to_string(),
    };

    let auth_interceptor = middleware::auth::AuthInterceptor::new(node.password.clone());

    println!("Hosting...");
    tonic::transport::Server::builder()
        .add_service(InterceptorFor::new(NodeServer::new(node), auth_interceptor))
        .serve(addr)
        .await?;

    Ok(())
}
