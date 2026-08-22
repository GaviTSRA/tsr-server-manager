pub mod auth;
pub mod node;
pub mod server;

pub mod proto {
    use bollard::plugin::ContainerStateStatusEnum;

    pub mod common {
        tonic::include_proto!("common");
    }

    use common::ContainerStatus;
    impl From<ContainerStateStatusEnum> for common::ContainerStatus {
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

    pub mod auth {
        tonic::include_proto!("auth");
    }
    pub mod node {
        tonic::include_proto!("node");
    }
    pub mod server {
        tonic::include_proto!("server");
    }
}
