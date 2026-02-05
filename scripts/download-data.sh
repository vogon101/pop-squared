#!/usr/bin/env bash
set -euo pipefail

# Downloads GHSL GHS-POP R2023A (epoch 2025, 30-arcsecond/~1km, WGS84)
# Source: https://human-settlement.emergency.copernicus.eu/

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../data"
ZIP_URL="https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_GLOBE_R2023A/GHS_POP_E2025_GLOBE_R2023A_4326_30ss/V1-0/GHS_POP_E2025_GLOBE_R2023A_4326_30ss_V1_0.zip"
ZIP_FILE="$DATA_DIR/GHS_POP_E2025_GLOBE_R2023A_4326_30ss_V1_0.zip"
TIF_FILE="$DATA_DIR/GHS_POP_E2025_GLOBE_R2023A_4326_30ss_V1_0.tif"

mkdir -p "$DATA_DIR"

if [ -f "$TIF_FILE" ]; then
  echo "GeoTIFF already exists at $TIF_FILE"
  echo "Delete it and re-run to re-download."
  exit 0
fi

echo "Downloading GHSL GHS-POP R2023A (epoch 2025, ~1km, WGS84)..."
echo "File size: ~461MB"
echo ""

curl -L --progress-bar -o "$ZIP_FILE" "$ZIP_URL"

echo ""
echo "Extracting GeoTIFF..."
unzip -o "$ZIP_FILE" -d "$DATA_DIR"

# Clean up zip
rm -f "$ZIP_FILE"

echo ""
echo "Done! GeoTIFF saved to $DATA_DIR"
ls -lh "$DATA_DIR"/*.tif
