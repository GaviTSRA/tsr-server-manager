
if [ -f "run.sh" ]; then
  echo "server.jar already exists. No download needed."

  output=$(curl https://files.minecraftforge.net/net/minecraftforge/forge/index_${VERSION}.html | grep -oP "(?<=forge-${VERSION}-)[^-]+(?=-installer\.jar)")
  FORGE_VERSION=$(echo "$output" | sed -n '2p')

  echo "Setting correct args"
  file="libraries/net/minecraftforge/forge/${VERSION}-${FORGE_VERSION}/unix_args.txt"
  updated_params="-Dterminal.jline=false -Dterminal.ansi=true -Xms128M -Xmx${SERVER_RAM}M"

  if grep -qE "^-Dterminal\.jline=.*-Xms[0-9]+M -Xmx[0-9]+M" "$file"; then
    # Line exists but might be outdated; replace it
    sed -i "s|^-Dterminal\.jline=.*-Xms[0-9]\+M -Xmx[0-9]\+M|$updated_params|" "$file"
    echo "Outdated parameters updated."
  else
    # Line doesn't exist; prepend it
    sed -i "1s|^|$updated_params |" "$file"
    echo "Parameters prepended to the file."
  fi

  echo "Done"

  exit 0
fi

output=$(curl https://files.minecraftforge.net/net/minecraftforge/forge/index_${VERSION}.html | grep -oP "(?<=forge-${VERSION}-)[^-]+(?=-installer\.jar)")
FORGE_VERSION=$(echo "$output" | sed -n '2p')

echo "Latest forge version for ${VERSION} is ${FORGE_VERSION}"
FORGE_INSTALLER_URL="https://maven.minecraftforge.net/net/minecraftforge/forge/${VERSION}-${FORGE_VERSION}/forge-${VERSION}-${FORGE_VERSION}-installer.jar"
INSTALLER_JAR="forge-${VERSION}-installer.jar"

echo "Downloading Forge installer for version ${VERSION}..."
curl -o "$INSTALLER_JAR" -L "$FORGE_INSTALLER_URL"

if [ $? -ne 0 ]; then
  echo "Error: Failed to download Forge installer from $FORGE_INSTALLER_URL"
  exit 1
fi

echo "Running Forge installer to generate server.jar..."
java -jar "$INSTALLER_JAR" --installServer

echo "Minecraft Forge server setup complete. server.jar is ready."

rm -f "$INSTALLER_JAR"
echo "Forge installer removed."

echo "Setting correct args"
file="libraries/net/minecraftforge/forge/${VERSION}-${FORGE_VERSION}/unix_args.txt"
updated_params="-Dterminal.jline=false -Dterminal.ansi=true -Xms128M -Xmx${SERVER_RAM}M"

if grep -qE "^-Dterminal\.jline=.*-Xms[0-9]+M -Xmx[0-9]+M" "$file"; then
  # Line exists but might be outdated; replace it
  sed -i "s|^-Dterminal\.jline=.*-Xms[0-9]\+M -Xmx[0-9]\+M|$updated_params|" "$file"
  echo "Outdated parameters updated."
else
  # Line doesn't exist; prepend it
  sed -i "1s|^|$updated_params |" "$file"
  echo "Parameters prepended to the file."
fi

echo "Done"