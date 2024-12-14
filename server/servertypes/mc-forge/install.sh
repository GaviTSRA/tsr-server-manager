if [ -f "server.jar" ]; then
  echo "server.jar already exists. No download needed."
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
