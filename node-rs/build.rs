fn main() {
    println!("cargo:rerun-if-changed=../proto/node.proto");
    tonic_prost_build::configure()
        .type_attribute(
            "node.Manifest",
            "#[derive(serde::Serialize, serde::Deserialize)]",
        )
        .type_attribute("node.Manifest", "#[serde(rename_all=\"camelCase\")]")
        .type_attribute(
            "node.ManifestServerOption",
            "#[derive(serde::Serialize, serde::Deserialize)]",
        )
        .field_attribute(
            "node.ManifestServerOption.type",
            "#[serde(with = \"crate::server_types::option_type_as_str\")]",
        )
        .type_attribute(
            "node.ManifestServerOptionType",
            "#[derive(serde::Serialize, serde::Deserialize)]",
        )
        .compile_protos(&["../proto/node.proto"], &["../proto"])
        .unwrap();
}
