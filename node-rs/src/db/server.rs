use std::collections::HashMap;

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use crate::db::restart_policy::RestartPolicy;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct ServerOptions(pub HashMap<String, String>);

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "Server", rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: uuid::Uuid,
    pub owner_id: uuid::Uuid,
    pub name: String,
    #[sea_orm(column_name = "type")]
    pub server_type: String,
    pub container_id: Option<String>,
    #[sea_orm(column_type = "Json")]
    pub options: ServerOptions,
    pub ports: Vec<i32>,
    pub cpu_limit: f32,
    pub ram_limit: i32,
    #[sea_orm(default=RestartPolicy::No)]
    pub restart_policy: RestartPolicy,
    #[sea_orm(default = 1)]
    pub restart_retry_count: i32,
    // TODO metadata (rework?)
}

impl ActiveModelBehavior for ActiveModel {}
