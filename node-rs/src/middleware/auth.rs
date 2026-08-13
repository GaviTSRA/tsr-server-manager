use std::task::{Context, Poll};

use futures::future::BoxFuture;
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use tonic::Status;
use tower::{Layer, Service};

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
pub struct AuthLayer {
    secret: String,
}
impl AuthLayer {
    pub fn new(secret: String) -> Self {
        AuthLayer { secret }
    }
}
impl<S> Layer<S> for AuthLayer {
    type Service = AuthMiddleware<S>;

    fn layer(&self, inner: S) -> Self::Service {
        AuthMiddleware {
            inner,
            secret: self.secret.clone(),
        }
    }
}

#[derive(Clone)]
pub struct AuthMiddleware<S> {
    inner: S,
    secret: String,
}

impl<S> Service<http::Request<tonic::body::Body>> for AuthMiddleware<S>
where
    S: Service<http::Request<tonic::body::Body>, Response = http::Response<tonic::body::Body>>
        + Clone
        + Send
        + 'static,
    S::Future: Send + 'static,
    S::Error: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = BoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: http::Request<tonic::body::Body>) -> Self::Future {
        let clone = self.inner.clone();
        let mut inner = std::mem::replace(&mut self.inner, clone);
        let secret = self.secret.clone();

        Box::pin(async move {
            if ALLOWED_UNAUTHENTICATED_PATHS.contains(&req.uri().path()) {
                return inner.call(req).await;
            }

            let token = req
                .headers()
                .get("authorization")
                .and_then(|v| v.to_str().ok());

            let authorized = match token {
                Some(token) => verify_token(token, &secret).is_ok(),
                None => false,
            };

            if authorized {
                inner.call(req).await
            } else {
                Ok(Status::unauthenticated("NODE_UNAUTHORIZED").into_http())
            }
        })
    }
}
