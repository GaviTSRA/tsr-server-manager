apt install openjdk-21-jdk

PROJECT="paper"
MINECRAFT_VERSION="1.21.3"

LATEST_BUILD=$(curl -s "https://api.papermc.io/v2/projects/${PROJECT}/versions/${MINECRAFT_VERSION}/builds" | \
    grep -o '"build":[0-9]*' | \
    awk -F: '{print $2}' | \
    tail -n 1)

if [ "$LATEST_BUILD" != "null" ]; then
    echo "Latest stable build is $LATEST_BUILD"
    JAR_NAME=${PROJECT}-${MINECRAFT_VERSION}-${LATEST_BUILD}.jar
    PAPERMC_URL="https://api.papermc.io/v2/projects/${PROJECT}/versions/${MINECRAFT_VERSION}/builds/${LATEST_BUILD}/downloads/${JAR_NAME}"
    echo $CURRENT_DIR
    echo "Downloading $JAR_NAME from $PAPERMC_URL"
    curl -o ./server.jar $PAPERMC_URL
    echo "Download completed"
else
    echo "No stable build for version $MINECRAFT_VERSION found :("
fi