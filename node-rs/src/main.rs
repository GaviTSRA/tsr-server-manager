use sea_orm::{Database, DatabaseConnection};
use tonic::{Request, Response, Status, transport::Server};
use tonic_middleware::InterceptorFor;

use crate::node::{PongResponse, node_server::NodeServer};

mod middleware;

pub mod node {
    tonic::include_proto!("node");
}

#[derive(Default)]
pub struct Node {
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
        request: Request<node::ServersRequest>,
    ) -> Result<Response<node::ServersResponse>, Status> {
        todo!()
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let db: DatabaseConnection =
        Database::connect("postgres://postgres:postgres@localhost:5433/tsm-node").await?;
    db.get_schema_registry("node-rs::db::*").sync(&db).await?;

    let addr = "0.0.0.0:8772".parse().unwrap();
    let node = Node {
        password: "PASSWORD".to_string(),
    };

    let auth_interceptor = middleware::auth::AuthInterceptor::new(node.password.clone());

    Server::builder()
        .add_service(InterceptorFor::new(NodeServer::new(node), auth_interceptor))
        .serve(addr)
        .await?;

    Ok(())
}
