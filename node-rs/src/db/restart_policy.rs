use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "restart_policy")]
pub enum RestartPolicy {
    #[sea_orm(string_value = "no")]
    No,
    #[sea_orm(string_value = "on-failure")]
    OnFailure,
    #[sea_orm(string_value = "unless-stopped")]
    UnlessStopped,
    #[sea_orm(string_value = "always")]
    Always,
}
