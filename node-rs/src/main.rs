use sea_orm::{Database, DatabaseConnection};
use tonic_middleware::InterceptorFor;

use crate::grpc::auth::def::auth_server::AuthServer;
use crate::grpc::node::def::node_server::NodeServer;
use crate::server_types::{ServerType, load_server_types};

mod db;
mod grpc;
mod middleware;
mod server_types;

#[derive(Clone, Default)]
pub struct App {
    db: DatabaseConnection,
    server_types: Vec<ServerType>,
    password: String,
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
    let app = App {
        db,
        server_types,
        password: "Node".to_string(),
    };

    let auth_interceptor = middleware::auth::AuthInterceptor::new(app.password.clone());

    println!("Hosting...");
    tonic::transport::Server::builder()
        .add_service(AuthServer::new(app.clone()))
        .add_service(InterceptorFor::new(NodeServer::new(app), auth_interceptor))
        .serve(addr)
        .await?;

    Ok(())
}
