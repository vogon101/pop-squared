#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."

cd "$PROJECT_DIR"

echo "=== Pop Squared Setup ==="
echo ""

# 1. Install dependencies
echo "Installing npm dependencies..."
npm install

# 2. Set up .env.local if missing
if [ ! -f .env.local ]; then
  if [ -n "${NEXT_PUBLIC_MAPBOX_TOKEN:-}" ]; then
    echo "NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN" > .env.local
    echo "Created .env.local from environment variable."
  else
    echo ""
    echo "No .env.local found. You need a Mapbox public token (pk.*)."
    echo "Get one free at: https://account.mapbox.com/access-tokens/"
    echo "  1. Sign up / log in at mapbox.com"
    echo "  2. Go to Access Tokens"
    echo "  3. Copy your Default public token (starts with pk.)"
    echo ""
    read -rp "Paste your Mapbox public token: " MAPBOX_TOKEN
    echo "NEXT_PUBLIC_MAPBOX_TOKEN=$MAPBOX_TOKEN" > .env.local
    echo "Created .env.local."
  fi
else
  echo ".env.local already exists, skipping."
fi

# 3. Download population data if missing
TIF_FILE="data/GHS_POP_E2025_GLOBE_R2023A_4326_30ss_V1_0.tif"
if [ ! -f "$TIF_FILE" ]; then
  echo ""
  echo "Downloading GHSL population data (~461MB)..."
  bash scripts/download-data.sh
else
  echo "Population data already downloaded."
fi

echo ""
echo "=== Setup complete ==="
echo "Run 'npm run dev' to start the development server."
