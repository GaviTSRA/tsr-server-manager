use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use tonic::{Status, async_trait, body::Body};
use tonic_middleware::RequestInterceptor;

use crate::node;

#[derive(Serialize, Deserialize)]
struct Claims {
    authenticated: bool,
    exp: usize,
}

fn create_token(secret: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let claims = Claims {
        authenticated: true,
        exp: (chrono::Utc::now() + chrono::Duration::days(30)).timestamp() as usize,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

pub fn auth_route(
    request: node::AuthenticateRequest,
    password: String,
) -> Result<tonic::Response<node::AuthenticateResponse>, Status> {
    if request.password != password {
        return Err(Status::unauthenticated("NODE_UNAUTHORIZED"));
    }
    let token = create_token(&password).map_err(|_| Status::internal("Failed to create token"))?;
    Ok(tonic::Response::new(node::AuthenticateResponse { token }))
}

fn verify_token(token: &str, secret: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
}

const ALLOWED_UNAUTHENTICATED_PATHS: [&str; 1] = ["/node.Node/Authenticate"];

#[derive(Clone)]
pub struct AuthInterceptor {
    pub secret: String,
}

impl AuthInterceptor {
    pub fn new(secret: String) -> Self {
        AuthInterceptor { secret }
    }
}

#[async_trait]
impl RequestInterceptor for AuthInterceptor {
    async fn intercept(
        &self,
        req: tonic::codegen::http::Request<Body>,
    ) -> Result<tonic::codegen::http::Request<Body>, Status> {
        if ALLOWED_UNAUTHENTICATED_PATHS.contains(&req.uri().path()) {
            return Ok(req);
        }

        let token = req
            .headers()
            .get("authorization")
            .and_then(|v| v.to_str().ok());

        let authorized = match token {
            Some(token) => verify_token(token, &self.secret).is_ok(),
            None => false,
        };

        if authorized {
            return Ok(req);
        } else {
            return Err(Status::unauthenticated("NODE_UNAUTHORIZED"));
        }
    }
}
