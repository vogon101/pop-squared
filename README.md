# Pop Squared

Circle population calculator with inverse-square weighting. Click anywhere on a map to see how many people live within a given radius, plus a gravity-style 1/r² metric that weights nearby population more heavily.

Uses [GHSL GHS-POP R2023A](https://human-settlement.emergency.copernicus.eu/) (epoch 2025) at ~1km resolution, read directly from a local GeoTIFF file.

## Quick Start

```bash
bash scripts/setup.sh
npm run dev
```

The setup script will:
1. Install npm dependencies
2. Prompt for a Mapbox public token (if `.env.local` doesn't exist)
3. Download the ~461MB GHSL population GeoTIFF

Then open http://localhost:3000.

## Prerequisites

- **Node.js** >= 18
- **Mapbox public token** (free): sign up at https://account.mapbox.com/, go to Access Tokens, copy the default public token (starts with `pk.`). The token goes in `.env.local` as `NEXT_PUBLIC_MAPBOX_TOKEN`.
- **~500MB disk space** for the population data download

## Manual Setup

If you prefer to set up step by step:

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local with your Mapbox token
cp .env.example .env.local
# Edit .env.local and replace the placeholder with your pk.* token

# 3. Download population data (~461MB)
bash scripts/download-data.sh

# 4. Start dev server
npm run dev
```

## Non-Interactive Setup (CI / AI Agents)

If you already have the Mapbox token, pass it as an environment variable to skip the interactive prompt:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here bash scripts/setup.sh
npm run dev
```

## API

**POST** `/api/population`

```json
{ "lat": 51.5, "lng": -0.1, "radiusKm": 10 }
```

Returns:

```json
{
  "totalPopulation": 3842156,
  "inverseSqSum": 285643.12,
  "inverseSqNormalized": 8234.56,
  "rings": [
    { "innerKm": 0, "outerKm": 1, "population": 12500, "inverseSqContribution": 45000.0, "areaSqKm": 3.1, "density": 4032 }
  ],
  "pixelsProcessed": 314,
  "computeTimeMs": 42,
  "center": { "lat": 51.5, "lng": -0.1 },
  "radiusKm": 10
}
```

## How It Works

### Circle Population
Simple sum of all people within the chosen radius, read from the ~1km resolution GHSL raster grid.

### Inverse-Square Gravity

Each ~1km pixel has a population value P at distance r from the clicked point.

- **Raw** = Σ(P / r²) — analogous to gravitational pull. A person 1km away contributes 100× more than a person 10km away. Higher values mean more people packed close to the point. Units: people/km².
- **Normalized** = Raw / Σ(1/r²) — divides out the distance weighting to give a distance-weighted average population per cell. This removes the effect of the chosen radius, so you can compare locations fairly regardless of the radius setting.

Minimum distance is clamped to 0.1km to avoid division-by-zero for the pixel containing the clicked point.

## Project Structure

```
src/app/page.tsx              Main page: map + sidebar
src/app/api/population/route.ts  POST endpoint
src/lib/population.ts         Core GeoTIFF reading + computation
src/lib/geo.ts                Haversine distance, bounding box
src/lib/rings.ts              Adaptive ring boundaries
src/lib/circle-geojson.ts     GeoJSON circle for map overlay
src/hooks/usePopulation.ts    Fetch hook with abort controller
src/components/               Map, Controls, Results, RingTable
scripts/setup.sh              One-command project setup
scripts/download-data.sh      GHSL data download
data/                         GeoTIFF files (gitignored)
```

## Tech Stack

- Next.js 16, TypeScript, Tailwind CSS v4
- Mapbox GL JS (direct, no wrapper)
- `geotiff` npm package for server-side raster reading

## Data Source

GHSL GHS-POP R2023A, epoch 2025, 30-arcsecond (~1km), EPSG:4326. Published by the European Commission Joint Research Centre.
