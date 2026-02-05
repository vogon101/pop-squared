# Pop Squared — Agent Setup Guide

This file tells AI coding agents how to set up and work with this project.

## First-Time Setup

1. Run `npm install` to install dependencies.
2. Create `.env.local` with a Mapbox **public** token (starts with `pk.`). Copy from `.env.example`:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxx
   ```
   The user must provide this token. Get one at https://account.mapbox.com/access-tokens/ (free tier is fine). Ask the user for it if not provided.
3. Download population data (~461MB, one-time):
   ```bash
   bash scripts/download-data.sh
   ```
   This fetches a GeoTIFF from JRC servers into `data/`. The download takes a few minutes.

Alternatively, run `bash scripts/setup.sh` which does all three steps interactively, or non-interactively with:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.the_token bash scripts/setup.sh
```

## Development

```bash
npm run dev     # Start dev server at http://localhost:3000
npm run build   # Production build
```

## Testing the API

```bash
curl -X POST http://localhost:3000/api/population \
  -H 'Content-Type: application/json' \
  -d '{"lat":51.5,"lng":-0.1,"radiusKm":10}'
```

Expected: `totalPopulation` around 3-5M for central London at 10km radius.

## Key Files

- `src/lib/population.ts` — core computation, reads GeoTIFF, caches in module scope
- `src/lib/geo.ts` — haversine distance, bounding box helpers
- `src/lib/types.ts` — TypeScript interfaces for query/response
- `src/app/api/population/route.ts` — the POST endpoint
- `src/app/page.tsx` — main UI page
- `src/components/` — Map, Controls, Results, RingTable

## Notes

- The GeoTIFF is ~384MB and gitignored in `data/`. It must be downloaded via the script.
- `geotiff` is listed in `serverExternalPackages` in `next.config.ts` because it uses Node APIs.
- Tailwind v4: uses `@import "tailwindcss"` in globals.css, not `@tailwind` directives.
- The `getOrigin()` method on GeoTIFFImage returns `[x, y, z]` (3 elements), not 4.
