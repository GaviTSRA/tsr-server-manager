use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(
    rs_type = "String",
    db_type = "Enum",
    enum_name = "restart_policy",
    rename_all = "camelCase"
)]
pub enum RestartPolicy {
    No,
    OnFailure,
    UnlessStopped,
    Always,
}
