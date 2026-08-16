use tonic::{Request, Response, Status};

use crate::App;
use crate::middleware::auth::create_token;
use def::*;

pub mod def {
    tonic::include_proto!("auth");
}

#[tonic::async_trait]
impl auth_server::Auth for App {
    async fn authenticate(
        &self,
        request: Request<AuthenticateRequest>,
    ) -> Result<Response<AuthenticateResponse>, Status> {
        let req = request.into_inner();
        if &req.password != &self.password {
            return Err(Status::unauthenticated("NODE_UNAUTHORIZED"));
        }
        let token =
            create_token(&self.password).map_err(|_| Status::internal("Failed to create token"))?;
        Ok(tonic::Response::new(AuthenticateResponse { token }))
    }
}
