use sea_orm::entity::prelude::*;

#[derive(EnumIter, DeriveActiveEnum)]
#[sea_orm(db_type = "Enum", enum_name = "RestartPolicy")]
pub enum RestartPolicy {
    No,
    OnFailure,
    UnlessStopped,
    Always,
}

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "Server")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: uuid::UUID,
    pub owner_id: uuid::UUID,
    pub name: String,
    #[sea_orm(rename = "type")]
    pub server_type: String,
    #[sea_orm(nullable)]
    pub container_id: String,
    // TODO options
    // TODO ports
    pub cpu_limit: f32,
    pub ram_limit: i32,
    #[sea_orm(default=RestartPolicy::No)]
    pub restart_policy: RestartPolicy,
    #[sea_orm(default = 1)]
    pub restart_retry_count: i32,
    // TODO metadata
}

impl ActiveModelBehavior for ActiveModel {}
