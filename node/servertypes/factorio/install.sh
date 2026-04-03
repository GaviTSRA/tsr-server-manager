FACTORIO_USER="factorio"
API_URL="https://factorio.com/api/latest-releases"

# Function: Get current installed version (if any)
get_local_version() {
  if [ -f "/server/bin/x64/factorio" ]; then
    "/server/bin/x64/factorio" --version | grep -oP 'Version: \K[0-9.]+(?= \(build)'
  else
    echo "none"
  fi
}

# Determine target version (from env or API)
if [ -z "$VERSION" ]; then
  TARGET_VERSION=$(curl -s "$API_URL" \
  | grep -oP '"stable":\{.*?\}' \
  | grep -oP '"headless":"\K[^"]+')
else
  TARGET_VERSION="$VERSION"
fi

# Construct download URL for specified version
FACTORIO_URL="https://factorio.com/get-download/${TARGET_VERSION}/headless/linux64"

# Get local version
LOCAL_VERSION=$(get_local_version)
echo "Local version:  $LOCAL_VERSION"
echo "Target version: $TARGET_VERSION"

if [ "$TARGET_VERSION" = "$LOCAL_VERSION" ]; then
  echo "Factorio is up to date"
else
  echo "! New version available. Updating to $TARGET_VERSION ..."

  TMP_FILE="/server/factorio_headless_${TARGET_VERSION}.tar.xz"
  curl -L "$FACTORIO_URL" -o "$TMP_FILE"
  tar -xJf "$TMP_FILE" -C "/server" --strip-components=1
  rm -f "$TMP_FILE"

  echo "Updated Factorio to version $TARGET_VERSION."
fi
