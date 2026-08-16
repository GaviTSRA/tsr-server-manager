fn main() {
    println!("cargo:rerun-if-changed=../proto/node.proto");
    tonic_prost_build::configure()
        .type_attribute(
            "node.ServerTypesResponse.Manifest",
            "#[derive(serde::Serialize, serde::Deserialize)]",
        )
        .type_attribute(
            "node.ServerTypesResponse.Manifest",
            "#[serde(rename_all=\"camelCase\")]",
        )
        .type_attribute(
            "node.ServerTypesResponse.Manifest.ManifestServerOption",
            "#[derive(serde::Serialize, serde::Deserialize)]",
        )
        .field_attribute(
            "node.ServerTypesResponse.Manifest.ManifestServerOption.type",
            "#[serde(with = \"crate::server_types::option_type_as_str\")]",
        )
        .type_attribute(
            "node.ServerTypesResponse.Manifest.ManifestServerOption.ManifestServerOptionType",
            "#[derive(serde::Serialize, serde::Deserialize)]",
        )
        .compile_protos(&["../proto/node.proto"], &["../proto"])
        .unwrap();
}
