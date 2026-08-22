use std::path::Path;

use crate::grpc::proto::node::server_types_response::Manifest;

pub mod option_type_as_str {
    use crate::grpc::proto::node::server_types_response::manifest::manifest_server_option::ManifestServerOptionType;
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(value: &i32, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let name = ManifestServerOptionType::try_from(*value)
            .map(|v| v.as_str_name())
            .unwrap_or("UNSPECIFIED");
        serializer.serialize_str(name)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<i32, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        ManifestServerOptionType::from_str_name(&s.to_uppercase())
            .map(|v| v as i32)
            .ok_or_else(|| serde::de::Error::custom(format!("unknown option type: {s}")))
    }
}

#[derive(Clone)]
pub struct ServerType {
    pub manifest: Manifest,
}

impl ServerType {
    pub fn load(path: &Path) -> Option<ServerType> {
        let manifest_data: String = match std::fs::read_to_string(path.join("manifest.json")) {
            Ok(res) => res,
            Err(err) => {
                println!(
                    "Failed to read server type manifest of {}: {err}",
                    path.display()
                );
                return None;
            }
        };
        let manifest: Manifest = match serde_json::from_str(&manifest_data) {
            Ok(res) => res,
            Err(err) => {
                println!(
                    "Failed to parse server type manifest of {}: {err}",
                    path.display()
                );
                return None;
            }
        };

        Some(ServerType { manifest })
    }
}

pub fn load_server_types() -> Vec<ServerType> {
    let mut server_types = vec![];
    for entry in std::fs::read_dir("servertypes").unwrap() {
        if let Ok(entry) = entry {
            if let Some(server_type) = ServerType::load(&entry.path().clone()) {
                server_types.push(server_type);
            }
        }
    }
    server_types
}
