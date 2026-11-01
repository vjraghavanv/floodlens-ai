# FloodLens AI — Mapping Chennai's Flood History Against Its Water Bodies

**Tagline:** Understand Flood History. Explore Water Bodies. Discover Urban Risks.

🔗 **Live map:** _<PASTE your Amplify URL here, e.g. https://main.xxxx.amplifyapp.com>_
🎥 **Demo video (< 3 min):** _<PASTE your YouTube/Vimeo link here>_
💻 **Code repository:** _<PASTE your public GitHub URL here>_

> FloodLens AI is a **historical and geographical** intelligence tool. It does **not** predict floods. Where two things are near each other on the map, that is a geographic fact — not a claim that one caused the other.

---

## What I built

Chennai flooded catastrophically in 2015. Years later, the question residents still ask is simple and spatial: *where did it flood, and what water bodies are around me?* Public answers exist, but they're scattered across PDFs, research papers, and portals — not on one map you can open and explore.

**FloodLens AI** puts Chennai's flood history and its water bodies on a single interactive map. You can toggle layers, cluster dense areas, click any feature for details, search a neighbourhood, see analytical charts, and run a proximity analysis between a flood hotspot and the nearest lakes and tanks — all in a clean, responsive dashboard that runs in the browser.

## The dataset I started with

The headline dataset is **real and verified**: **57 named Chennai water bodies** — lakes, reservoirs, ponds, and the city's many temple tanks (*kulam*) — pulled live from **OpenStreetMap via the Overpass API**, licensed under the **Open Database License (ODbL)**. Each record carries its real coordinates, OSM feature type, and OSM way ID (e.g. `way/23633592` for Porur Lake).

I was deliberately honest about data provenance — a point I think matters for this challenge:

| Layer | Source | Status |
|-------|--------|--------|
| Water bodies | OpenStreetMap / Overpass (ODbL) | ✅ **Verified, real** — 57 features |
| Flood hotspots | 2015 Chennai flood literature | 🟡 **Demonstration** (labelled) — real neighbourhoods, illustrative depths |
| Rainfall sites | IMD / TN-WRD gauge localities | 🟡 **Demonstration** (labelled) |
| Hazard zones | Known low-lying basins | 🟡 **Demonstration** (labelled) |

I evaluated the Jal Shakti Water Bodies Census, data.gov.in, and IMD rainfall feeds for the other layers. None were available as an openly-downloadable, machine-readable file (they sit behind portals or exist only as PDFs). Rather than fabricate "real" data, I shipped those layers as **clearly-labelled demonstration data** — badged `DEMO` in the UI and documented in a provenance page. **Every statistic on the dashboard is computed from the loaded data at runtime; nothing is hardcoded.** That honesty is part of the project, not a caveat hidden in a footnote.

## How I put it on the map

The app is a **React + TypeScript + Vite** single-page app styled with Tailwind, rendering an interactive **MapLibre GL JS** map of Chennai. On the map:

- **Four independent layers** — flood hotspots, water bodies, rainfall sites, and hazard-zone polygons — each toggled on/off on its own.
- **Marker clustering** for dense areas (the temple tanks cluster tightly downtown).
- **Clickable features** with popups showing coordinates, type, source, and attributes — rendering "not available" wherever a value is genuinely missing, never invented.
- **Search** by neighbourhood or location that flies the map to the result.
- **A legend** and live layer counts.

Beyond the map, three analysis views turn the data into understanding:
- **Insights** — Recharts views (hotspots by neighbourhood, events by year, a flood-depth histogram, water bodies by type), all driven by the loaded data with live neighbourhood/year filters.
- **Proximity Analysis** — pick a flood hotspot and get the *k* nearest water bodies with real great-circle (Haversine) distances, drawn as lines on the map. With an explicit reminder that proximity is geographic, not causal.
- **Dataset Explorer** — a full data-provenance page: source, license, record count, CRS, and processing status for every layer.

## The AWS location & data services I used, and why

The architecture is **serverless and cost-conscious**:

- **Amazon S3** — two buckets (raw and processed), keeping source downloads separate from the validated GeoJSON the app consumes. Private and encrypted.
- **AWS Lambda** (`datasets_api`, Python 3.12) — reads the processed GeoJSON from S3 and serves it as JSON. IAM is **least privilege**: `s3:GetObject` on the processed prefix only.
- **Amazon API Gateway** (HTTP API) — exposes `/flood-hotspots`, `/water-bodies`, `/rainfall-sites`, `/hazard-zones`, and `/datasets`, with CORS locked to the hosting origin.
- **AWS Amplify Hosting** — builds and serves the React SPA from the repo.
- **Amazon Location Service** *(optional)* — the map can swap its MapLibre style to an Amazon Location basemap; it's wired behind an environment variable and off by default so the app also runs with zero AWS.

**Why this shape?** MapLibre GL renders the same style spec as Amazon Location Service, so I get a map that works offline during development *and* a documented one-line path to Amazon Location in production — no rewrite. The data layer is a clean seam: a `DataProvider` abstraction means the exact same UI reads either bundled local GeoJSON (demo mode, no AWS) **or** the AWS REST API when `VITE_API_BASE` is set. That makes the app genuinely explorable by anyone, while the AWS pipeline is real and documented.

A repeatable **Python ingestion pipeline** (`ingest.py` → `validators.py` → `to_geojson.py`) does the data shaping: it fetches from Overpass, validates every latitude/longitude against a Chennai bounding box, removes duplicates, handles missing values, preserves the WGS84 (EPSG:4326) CRS, and writes GeoJSON plus a provenance manifest. Re-runnable any time.

## What the map reveals

Open it and a pattern jumps out: Chennai's worst-hit 2015 neighbourhoods — Velachery, Mudichur, Pallikaranai, Kotturpuram — sit right against the city's lakes, tanks, and the Pallikaranai marsh. Run the proximity tool on Velachery and the nearest water body is **742 m away**. The map doesn't *prove* causation — and the UI says so plainly — but it makes the geography of risk legible in a way a PDF never could, and it hands planners and residents a reusable pattern for any city with open water-body data.

## Quality

The project ships with **60 automated tests, all passing**: data-validation and geo-math unit tests, Lambda/API handler tests, frontend component tests, and **Playwright end-to-end tests covering all the major journeys on both desktop and mobile** — map render, layer toggles, feature clicks, search, filter-driven charts, proximity distances, and graceful handling of missing values. It runs locally with one command (`cd web && npm run dev`) and deploys to Amplify with a committed `amplify.yml`.

## How others can reuse it

The pattern is portable: swap the Overpass bounding box and the demo datasets, and FloodLens AI becomes a flood-and-water explorer for any city with open OSM water data. The `DataProvider` seam, the validation pipeline, and the serverless S3→Lambda→API Gateway backend are all generic. The repo includes architecture docs, a dataset-provenance doc, AWS deployment instructions, and both a Mermaid and two draw.io architecture diagrams.

---

## Mapping to the judging criteria

- **Technical innovation & originality (25%):** a provider-abstraction seam that runs the identical UI on local GeoJSON *or* an AWS REST API; proximity analysis with real Haversine distances; honest verified-vs-demo data badging computed live.
- **Craft & execution (25%):** 60 passing tests (unit + API + component + Playwright E2E on desktop & mobile), clustering, graceful empty/error/loading states, responsive dark-navy UI.
- **Usefulness & impact (25%):** makes Chennai's flood-and-water geography explorable for citizens, researchers and planners; the whole pattern is reusable for any city with open water data.
- **Creativity & storytelling (25%):** a clear narrative — flood history meets water bodies — a scripted < 3-min demo, and two architecture diagrams including official AWS icons.

### Entry-requirement checklist

- ✅ **Dataset & what's in it** — 57 real Chennai water bodies from OpenStreetMap (ODbL), plus clearly-labelled demo layers.
- ✅ **How I put it on the map + which AWS service & why** — MapLibre GL rendering; Amazon Location Service (optional, documented) + the S3/Lambda/API Gateway data pipeline.
- ✅ **At least one AWS service** — S3, Lambda, API Gateway, Amplify Hosting (and optional Amazon Location Service).
- ✅ **Live map link / demo** — _link above_ + the demo video.
- ✅ **Public repo** — _link above_.
- ✅ **< 3-min demo video** — _link above_.
