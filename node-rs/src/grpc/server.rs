use tonic::{Request, Response, Status};

use crate::App;
use def::*;

pub mod common {
    tonic::include_proto!("common");
}
pub mod def {
    tonic::include_proto!("server");
}

#[tonic::async_trait]
impl server_server::Server for App {
    async fn info(
        &self,
        request: Request<common::ServerRequest>,
    ) -> Result<Response<ServerInfoResponse>, Status> {
        let req = request.into_inner();
        let server = self.resolve_server(req.server_id).await?;
        Ok(Response::new(ServerInfoResponse {
            id: server.id.to_string(),
            name: server.name,
            container_id: server.container_id,
            r#type: server.server_type,
            status: common::ContainerStatus::Unspecified as i32,
        }))
    }
}
