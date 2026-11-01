# FloodLens AI: Putting Chennai's Flood History on a Map People Can Actually Explore

**Understand Flood History. Explore Water Bodies. Discover Urban Risks.**

🔗 **Live map:** _<PASTE your Amplify URL>_ · 🎥 **Demo (< 3 min):** _<PASTE your YouTube/Vimeo link>_ · 💻 **Code:** _<PASTE your public GitHub repo>_

---

## The question a map should answer

In November and December of 2015, Chennai received more rain in a single day than it had seen since 1901. The Adyar river overflowed, Pallikaranai marsh filled and spread, and whole neighbourhoods went under. Years later, the questions residents, researchers, and city planners still ask are fundamentally *spatial*:

- Where did it actually flood?
- What lakes, tanks, and marshland sit near those places?
- If I live in Velachery or Mudichur, what's around me — and what's the pattern?

The information to answer those questions exists. But it lives in PDFs, academic papers, government portals, and scattered datasets. None of it is a map you can simply open and explore. **FloodLens AI** is my attempt to fix exactly that: take real spatial data about Chennai's water, put it on an interactive map, and make the geography of flood risk legible to anyone with a browser.

This post walks through what I built, the dataset decisions I made (including the honest ones), how I put it on the map with AWS, and what the finished map reveals.

## Starting from a real dataset — and being honest about it

The challenge asks you to start with a real dataset that has places in it. I did, and I want to be transparent about where the line between "real" and "demonstration" falls, because I think that honesty *is* part of good spatial data work.

**The verified, real layer — Chennai's water bodies.** I pulled **57 named water bodies** inside the Chennai administrative area live from **OpenStreetMap via the Overpass API**, licensed under the **Open Database License (ODbL)**. These aren't a curated handful — they're the city's real hydrology: Porur Lake, Ambattur Lake, Chembarambakkam reservoir, Retteri, the Pallikaranai marsh, and dozens of the temple tanks (*kulam*) that dot the old city. Every record carries real coordinates and its OpenStreetMap feature id, for example `way/23633592` for Porur Lake. This is the dataset the map is built around.

**The demonstration layers — and why I labelled them.** For flood hotspots, rainfall observation sites, and hazard zones, I went looking for openly-downloadable, machine-readable sources: the Ministry of Jal Shakti's First Census of Water Bodies, data.gov.in, and India Meteorological Department rainfall feeds. What I found is a common reality of open government data: the material exists, but behind JavaScript portals, login walls, or only as PDFs — not as a clean file I had the right to pull and reshape. Rather than fabricate "real" numbers, I shipped those three layers as **clearly-labelled demonstration data**. Every demo record is flagged `demo: true`, badged `DEMO` in the UI, and documented on a provenance page with its real-vs-illustrative status. The neighbourhoods are real (they're the places the 2015 flood literature names); the depths and dates are illustrative placeholders.

Why make a point of this? Because a map that quietly mixes real and invented data is worse than useless — it's misleading. **Every statistic on the FloodLens dashboard is computed from the loaded data at runtime; nothing is hardcoded.** If a source doesn't have a value, the UI shows "not available" rather than inventing one. The integrity of the data story is a feature, not a footnote.

## Putting it on the map

FloodLens AI is a **React + TypeScript + Vite** single-page app, styled with Tailwind in a dark navy and cyan theme, rendering an interactive **MapLibre GL JS** map centred on Chennai.

On the map itself:

- **Four independent layers** — flood hotspots, water bodies, rainfall sites, and hazard-zone polygons — each toggled on and off on its own, so you can isolate exactly what you want to see.
- **Marker clustering** for dense areas. The temple tanks cluster tightly in the old city centre and expand as you zoom — the map stays readable instead of becoming a wall of pins.
- **Clickable features** with popups showing coordinates, type, data source, and any available attributes — and "not available" wherever a value is genuinely missing.
- **Search** by neighbourhood or location that flies the map straight to the result.
- **A legend and live layer counts**, so the map is self-explanatory.

Then three analysis views turn the dots into understanding:

- **Historical Insights** — four Recharts visualisations (flood hotspots by neighbourhood, events by year, a flood-depth histogram, and water bodies by type) that recompute live as you apply neighbourhood and year filters.
- **Proximity Analysis** — pick a flood hotspot, and the app computes the *k* nearest water bodies using real great-circle (**Haversine**) distances, draws the connections on the map, and lists them. It states plainly that proximity is a geographic fact and does **not** establish that a water body caused flooding.
- **Dataset Explorer** — a full data-provenance page listing every layer's source, license, record count, coordinate reference system, and processing status, with verified-vs-demo badges.

## The AWS architecture — and the one decision that made it reusable

The whole thing is **serverless and cost-conscious**:

```
OpenStreetMap (Overpass)  →  ingestion pipeline  →  Amazon S3 (processed)
                                                         ↓
                                              AWS Lambda (datasets_api)
                                                         ↓
                                              Amazon API Gateway (HTTP, CORS)
                                                         ↓
                              React SPA on AWS Amplify Hosting  →  MapLibre map
                                       (optional: Amazon Location Service basemap)
```

- **Amazon S3** holds raw source downloads and processed GeoJSON in separate, private, encrypted buckets — raw data never leaks through the API.
- **AWS Lambda** (`datasets_api`, Python 3.12) reads the processed GeoJSON from S3 and serves it as JSON. Its IAM role is **least privilege**: `s3:GetObject` on the processed prefix only — nothing more.
- **Amazon API Gateway** (HTTP API) exposes `/flood-hotspots`, `/water-bodies`, `/rainfall-sites`, `/hazard-zones`, and `/datasets`, with CORS locked to the hosting origin.
- **AWS Amplify Hosting** builds and serves the SPA straight from the repository.
- **Amazon Location Service** is wired in as an optional basemap, behind an environment variable and off by default.

**The decision I'm proudest of** is a small abstraction called `DataProvider`. The entire UI reads its data through this one seam. When no AWS is configured, a `LocalGeoJSONProvider` serves GeoJSON bundled with the app; when `VITE_API_BASE` is set, an `AwsApiProvider` reads the live REST API. The identical interface, the identical components, the identical map — two data backends.

Two things fall out of that:

1. **The app runs with zero AWS.** Anyone can clone it and explore the real Chennai water-body data offline, which matters enormously for a project meant to be *reusable*.
2. **MapLibre and Amazon Location Service speak the same style spec.** So moving from the free OpenStreetMap basemap to a managed Amazon Location basemap is a one-line configuration swap, not a rewrite.

Feeding all of this is a **repeatable Python ingestion pipeline** — `ingest.py` → `validators.py` → `to_geojson.py`. It fetches from Overpass, validates every latitude and longitude against a Chennai bounding box, removes duplicate records, handles missing values, preserves the WGS84 (EPSG:4326) coordinate reference system, and writes GeoJSON plus a provenance manifest. Run it again any time and the data refreshes.

## What the map actually reveals

Here's the payoff. Turn on the flood-hotspot and water-body layers together and a pattern emerges immediately: Chennai's worst-hit 2015 neighbourhoods — Velachery, Mudichur, Pallikaranai, Kotturpuram — sit right up against the city's lakes, tanks, and the Pallikaranai marsh. Open the Proximity tool, select **Velachery**, and the nearest mapped water body is **742 metres away**.

The map does not — and must not — claim the lake *caused* the flood; urban flooding is a story of drainage, encroachment, rainfall, and terrain, not a single nearby lake. FloodLens says so, out loud, in the UI. But what it *does* is make the geography of risk legible in a way a research PDF never can. You can see, pan, zoom, and feel the relationship between where water collects and where the city floods. And because the pattern is driven by open data and a generic pipeline, the same map works for **any city** with OpenStreetMap water data — swap the bounding box and you have a new flood-and-water explorer.

## Craft: making it reliable

A map people can "explore" has to actually work, every time. FloodLens ships with **60 automated tests, all passing**:

- Unit tests for the geographic maths (Haversine distances, nearest-neighbour, bounding boxes) and the statistics that feed the charts.
- Data-validation tests proving the pipeline rejects bad coordinates and never fabricates missing values.
- Lambda/API handler tests (with a mocked S3, so no AWS account needed) covering routing, CORS, and error paths.
- Frontend component tests, including that missing attributes render as "not available."
- **Playwright end-to-end tests covering every major user journey — on both desktop and mobile** — from map render and layer toggles to search, filter-driven charts, proximity distances, and graceful handling of missing data.

It runs locally with a single command (`cd web && npm run dev`) and deploys to Amplify with a committed `amplify.yml` and SPA rewrite rules.

## Why this pattern is worth reusing

The honest takeaway for other builders: the hard part of a spatial data app isn't the map library — it's the *data discipline* and the *seam*. FloodLens's reusable ideas are:

- A **provider abstraction** so your UI never cares whether data is local or cloud-hosted.
- A **validation-first ingestion pipeline** that treats coordinate integrity and provenance as first-class.
- **Honest data labelling** — verified vs demonstration — computed and surfaced in the UI.
- A **serverless, least-privilege backend** that idles at near-zero cost.

Point all of that at any open geospatial dataset and you have a map people can open, trust, and explore.

---

## How this meets the challenge criteria

- **Technical innovation & originality:** the local-or-cloud `DataProvider` seam, real Haversine proximity analysis drawn on the map, and live-computed verified-vs-demo data badging.
- **Craft & execution:** 60 passing tests across four suites including desktop + mobile E2E, clustering, and graceful empty/error/loading states.
- **Usefulness & impact:** makes Chennai's flood-and-water geography explorable for citizens, researchers, and planners — and the whole pattern is reusable for any city with open water data.
- **Creativity & storytelling:** a clear narrative (flood history meets water bodies), a scripted sub-3-minute demo, and two architecture diagrams including one with official AWS icons.

### Entry requirements
- ✅ Dataset described — 57 real Chennai water bodies from OpenStreetMap (ODbL), plus labelled demo layers.
- ✅ How it's mapped + which AWS service & why — MapLibre GL; optional Amazon Location Service + the S3 → Lambda → API Gateway pipeline.
- ✅ At least one AWS service — S3, Lambda, API Gateway, Amplify Hosting (+ optional Amazon Location Service).
- ✅ Live map link / demo video — _links above_.
- ✅ Public repository — _link above_.
- ✅ Sub-3-minute public demo video — _link above_.
