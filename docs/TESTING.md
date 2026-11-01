# FloodLens AI — Testing

The project has **60 automated tests** across four suites, all passing.

| Suite | Count | Tool | What it covers |
|-------|------:|------|----------------|
| Pipeline / data validation | 11 | pytest | lat/lon validation, Chennai bbox, missing-value cleaning, dedup, GeoJSON shape, demo-flagging, computed-totals |
| API / Lambda | 7 | pytest | route→S3-key mapping, CORS headers, stage-prefix handling, 404s, OPTIONS preflight, HTTP-API-v2 event shape (fake S3, no AWS) |
| Frontend unit + component | 22 | vitest | Haversine/geo math, stats aggregations, DataProvider mapping (missing props → null), LocationDetails rendering incl. "not available" |
| End-to-end user journeys | 20 | Playwright | the 10 required journeys × desktop + mobile viewports |

## Prerequisites

```bash
# Python suites — isolated venv (host Python is PEP-668 managed)
python3 -m venv .venv && . .venv/bin/activate
pip install pytest boto3

# Frontend
cd web && npm install
npx playwright install chromium   # one-time, for E2E
```

## Run each suite

```bash
# 1. Pipeline / data validation
python -m pytest pipeline/ -q

# 2. API / Lambda handler
python -m pytest infra/lambda/datasets_api/ -q

# 3. Frontend unit + component
cd web && npx vitest run

# 4. End-to-end (builds + previews automatically; serial, single worker)
cd web && npx playwright test
#   or against an already-running preview:
#   npm run build && npx vite preview --host 127.0.0.1 --port 4173 &
#   npx playwright test
```

## The 10 required user journeys (all covered by `web/tests/e2e/journeys.spec.ts`)

1. Dashboard loads with computed overview stats ✅
2. Map renders (MapLibre canvas present) ✅
3. Flood layer toggles off/on ✅
4. Waterbody layer toggles off/on ✅
5. Clicking a search result selects the location ✅
6. Location search returns matches ✅
7. Filters update the insights charts (15 → 1 hotspot) ✅
8. Proximity analysis returns formatted distances ✅
9. Missing dataset values do not crash the app (no pageerror across all tabs) ✅
10. Dataset explorer / mobile layout — run under the Pixel-5 project ✅

## Notes

- E2E runs with `workers: 1`, `fullyParallel: false` to stay light on memory.
- The desktop and mobile Playwright projects run the full journey set, so journey 10
  (mobile layout) is exercised by every test at a phone viewport.
- No AWS account or network is required for any suite (Overpass is only hit by the live
  `ingest.py`, not by tests; the Lambda suite uses a fake S3 client).
