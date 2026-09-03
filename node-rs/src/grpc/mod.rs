pub mod auth;
pub mod node;
pub mod server;
pub mod server_power;

pub mod proto {
    use bollard::plugin::{ContainerInspectResponse, ContainerStateStatusEnum};

    pub mod common {
        tonic::include_proto!("common");
    }

    use common::ContainerStatus;
    impl From<ContainerStateStatusEnum> for ContainerStatus {
        fn from(status: ContainerStateStatusEnum) -> ContainerStatus {
            match status {
                ContainerStateStatusEnum::EMPTY => ContainerStatus::Unspecified,
                ContainerStateStatusEnum::CREATED => ContainerStatus::Created,
                ContainerStateStatusEnum::RUNNING => ContainerStatus::Running,
                ContainerStateStatusEnum::PAUSED => ContainerStatus::Paused,
                ContainerStateStatusEnum::RESTARTING => ContainerStatus::Restarting,
                ContainerStateStatusEnum::REMOVING => ContainerStatus::Removing,
                ContainerStateStatusEnum::EXITED => ContainerStatus::Exited,
                ContainerStateStatusEnum::DEAD => ContainerStatus::Dead,
                ContainerStateStatusEnum::STOPPING => ContainerStatus::Stopping,
            }
        }
    }
    impl From<Option<ContainerInspectResponse>> for ContainerStatus {
        fn from(inspect: Option<ContainerInspectResponse>) -> ContainerStatus {
            if let Some(inspect) = inspect
                && let Some(state) = inspect.state
                && let Some(status) = state.status
            {
                ContainerStatus::from(status)
            } else {
                ContainerStatus::Unspecified
            }
        }
    }

    pub mod auth {
        tonic::include_proto!("auth");
    }
    pub mod node {
        tonic::include_proto!("node");
    }
    pub mod server {
        tonic::include_proto!("server");
    }
    pub mod server_power {
        tonic::include_proto!("server_power");
    }
}
