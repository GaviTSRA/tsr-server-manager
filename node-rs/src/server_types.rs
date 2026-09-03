use std::{
    fs::{self, File},
    io::{Read, Write},
    path::{Path, PathBuf},
};

use bollard::{
    Docker,
    exec::{CreateExecOptions, StartExecResults},
};
use futures::StreamExt;
use rhai::{AST, Dynamic, Engine};
use tar::Archive;
use xz2::read::XzDecoder;

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
    pub install_script: AST,
}

impl ServerType {
    pub fn load(path: &Path, engine: &Engine) -> Option<ServerType> {
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

        let install_script = match engine.compile_file(path.join("install.rhai")) {
            Ok(res) => res,
            Err(err) => {
                println!(
                    "Failed to compile server type install script of {}: {err}",
                    path.display()
                );
                return None;
            }
        };

        Some(ServerType {
            manifest,
            install_script,
        })
    }
}

pub fn load_server_types(engine: &Engine) -> Vec<ServerType> {
    let mut server_types = vec![];
    for entry in std::fs::read_dir("servertypes").unwrap() {
        if let Ok(entry) = entry {
            if let Some(server_type) = ServerType::load(&entry.path().clone(), engine) {
                server_types.push(server_type);
            }
        }
    }
    server_types
}

fn download_with_progress(
    url: &str,
    dest_path: PathBuf,
    on_progress: impl Fn(u64, Option<u64>), // (bytes_downloaded, total_bytes)
) -> Result<(), Box<dyn std::error::Error>> {
    let response = reqwest::blocking::get(url)?;
    let total_size = response.content_length();

    let mut file = File::create(dest_path)?;
    let mut downloaded: u64 = 0;
    let mut buffer = [0u8; 8192];
    let mut reader = response;

    loop {
        let bytes_read = reader.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        file.write_all(&buffer[..bytes_read])?;
        downloaded += bytes_read as u64;
        on_progress(downloaded, total_size);
        if let Some(total) = total_size
            && downloaded == total
        {
            break;
        }
    }
    Ok(())
}

async fn run_command_in_container(
    docker: &bollard::Docker,
    container_id: &str,
    program: &str,
    args: &[String],
) -> Result<String, String> {
    let cmd: Vec<String> = std::iter::once(program.to_string())
        .chain(args.iter().cloned())
        .collect();

    let exec = docker
        .create_exec(
            container_id,
            CreateExecOptions {
                cmd: Some(cmd),
                attach_stdout: Some(true),
                attach_stderr: Some(true),
                working_dir: Some("/server".to_string()),
                ..Default::default()
            },
        )
        .await
        .map_err(|e| e.to_string())?;

    let mut output_str = String::new();

    if let StartExecResults::Attached { mut output, .. } = docker
        .start_exec(&exec.id, None)
        .await
        .map_err(|e| e.to_string())?
    {
        while let Some(Ok(msg)) = output.next().await {
            output_str.push_str(&msg.to_string());
        }
    }

    Ok(output_str)
}

pub fn get_rhai_engine(docker: Docker) -> Engine {
    // TODO: Better error handling in these
    let mut engine = Engine::new();
    engine.register_fn("file_exists", move |server_id: &str, path: &str| -> bool {
        let check_path = Path::new(&std::env::var("SERVERS_DIRECTORY").unwrap())
            .join(server_id)
            .join(path);
        check_path.exists()
    });
    engine.register_fn("http_get_json", move |url: &str| -> Dynamic {
        let body = match reqwest::blocking::get(url) {
            Ok(res) => res.text().unwrap(),
            Err(_) => return Dynamic::UNIT,
        };
        let json: serde_json::Value =
            serde_json::from_str(&body).unwrap_or(serde_json::Value::Null);
        rhai::serde::to_dynamic(json).unwrap_or(Dynamic::UNIT)
    });
    engine.register_fn(
        "http_get_file",
        move |server_id: &str, url: &str, path: &str| -> () {
            let root = std::env::var("SERVERS_DIRECTORY").unwrap();
            let file_path = Path::new(&root).join(server_id).join(path);

            download_with_progress(url, file_path, |downloaded, total| {
                if let Some(total) = total {
                    let percent = (downloaded as f64 / total as f64 * 100.0) as u8;
                    println!("Downloading... {downloaded} / {total} bytes ({percent}%)");
                } else {
                    println!("Downloading... {downloaded} bytes");
                }
            })
            .unwrap();
        },
    );
    engine.register_fn("regex_match", move |text: &str, pattern: &str| -> String {
        let re = regex::Regex::new(pattern).expect("Invalid regex");
        re.captures(text)
            .and_then(|caps| caps.get(1))
            .map(|m| m.as_str().to_string())
            .unwrap_or_default()
    });
    engine.register_fn(
        "extract_file",
        move |server_id: &str, archive_path: &str, target_path: &str, strip_components: i64| {
            let root = Path::new(&std::env::var("SERVERS_DIRECTORY").unwrap()).join(server_id);
            let file = File::open(root.join(archive_path)).unwrap();
            let destination = root.join(target_path);
            let xz_decoder = XzDecoder::new(file);
            let mut archive = Archive::new(xz_decoder);

            std::fs::create_dir_all(&destination).unwrap();

            for entry in archive.entries().unwrap() {
                let mut entry = entry.unwrap();
                let path = entry.path().unwrap().into_owned();

                let stripped: PathBuf = path.components().skip(strip_components as usize).collect();
                if stripped.as_os_str().is_empty() {
                    continue;
                }

                let dest_path = Path::new(&destination).join(&stripped);

                if entry.header().entry_type().is_dir() {
                    std::fs::create_dir_all(&dest_path).unwrap();
                } else {
                    if let Some(parent) = dest_path.parent() {
                        std::fs::create_dir_all(parent).unwrap();
                    }
                    entry.unpack(&dest_path).unwrap();
                }
            }
        },
    );
    engine.register_fn("remove_file", move |server_id: &str, path: &str| {
        let resolved_path = Path::new(&std::env::var("SERVERS_DIRECTORY").unwrap())
            .join(server_id)
            .join(path);
        fs::remove_file(resolved_path).unwrap();
    });
    engine.register_fn(
        "run_command",
        move |server_id: &str, program: &str, args: rhai::Array| -> String {
            let program = program.to_string();
            let args: Vec<String> = args
                .into_iter()
                .map(|v| v.into_string().unwrap_or_default())
                .collect();
            let docker = docker.clone();

            tokio::task::block_in_place(|| {
                tokio::runtime::Handle::current().block_on(async move {
                    run_command_in_container(&docker, &server_id, &program, &args)
                        .await
                        .unwrap_or_else(|e| format!("error: {e}"))
                })
            })
        },
    );
    engine.register_fn("ready", move |server_id: &str| {
        let path = Path::new(&std::env::var("SERVERS_DIRECTORY").unwrap())
            .join(server_id)
            .join(".ready");
        fs::write(path, b"").unwrap();
    });

    engine
}
