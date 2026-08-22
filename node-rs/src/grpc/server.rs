use tonic::{Request, Response, Status};

use super::proto::common::{ContainerStatus, ServerRequest};
use super::proto::server::*;
use crate::App;

#[tonic::async_trait]
impl server_server::Server for App {
    async fn info(
        &self,
        request: Request<ServerRequest>,
    ) -> Result<Response<ServerInfoResponse>, Status> {
        let req = request.into_inner();
        let server = self.resolve_server(req.server_id).await?;
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
        Ok(Response::new(ServerInfoResponse {
            id: server.id.to_string(),
            name: server.name,
            container_id: server.container_id,
            r#type: server.server_type,
            status: match status {
                Some(status) => status,
                None => ContainerStatus::Unspecified,
            } as i32,
        }))
    }
}
