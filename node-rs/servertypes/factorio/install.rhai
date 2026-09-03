let target_version = VERSION;
if target_version == "" {
    let versions = http_get_json("https://factorio.com/api/latest-releases");
    target_version = versions.stable.headless;
}

let local_version = "";
if file_exists(SERVER_ID, "bin/x64/factorio") {
    let output = run_command(CONTAINER_ID, "bin/x64/factorio", ["--version"]);
    local_version = regex_match(output, "Version: ([0-9.]+) \\(build");
}

print(`Local version:  ${local_version}`);
print(`Target version: ${target_version}`);

if target_version != local_version {
    let archive = `factorio_headless_${target_version}.tar.xz`;
    http_get_file(SERVER_ID, `https://factorio.com/get-download/${target_version}/headless/linux64`, archive);
    extract_file(SERVER_ID, archive, ".", 1);
    remove_file(SERVER_ID, archive);
}
ready(SERVER_ID);