# FloodLens AI — Phase 1: Implementation Plan & Architecture

> **Tagline:** Understand Flood History. Explore Water Bodies. Discover Urban Risks.
> **Scope:** Chennai, Tamil Nadu, India. Historical + geographical intelligence only — **no real-time flood prediction is claimed.**

---

## 1. What we are building

An interactive geospatial dashboard that lets citizens, researchers and urban planners
explore **historical** flood hotspots, flood hazard zones, water bodies, rainfall
observation sites, and the geographic proximity between flood hotspots and water bodies
in Chennai.

This is explicitly a **historical / descriptive** tool. Proximity between a flood hotspot
and a lake is shown as a geographic fact and is **not** presented as causation.

## 2. Guiding constraints (from the brief)

- Real, verifiable public datasets only. No fabricated statistics; all overview numbers are
  computed from loaded data at runtime.
- Must run **locally with no AWS account** (demo mode), using a clearly-labelled sample dataset
  and local GeoJSON.
- A **data-provider abstraction** so the same UI reads either local GeoJSON or an AWS API.
- Serverless, cost-conscious AWS backend; no unnecessary services.
- No AWS credentials or secrets in frontend source.
- Graceful loading / empty / error states throughout.

## 3. Technology decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Build | Vite + React 18 + TypeScript | Fast, standard, matches brief |
| Styling | Tailwind CSS | Utility-first, dark-navy theme via config tokens |
| Map | **MapLibre GL JS** | Open, no vendor lock, runs fully offline/local with a free raster basemap; Amazon Location Service is documented as an optional drop-in (same GL style spec) |
| Charts | Recharts | Brief requirement |
| Clustering | MapLibre native `cluster: true` on GeoJSON sources | No extra deps |
| Geo math | Haversine (hand-rolled, unit-tested) | Proximity distances without pulling a heavy geo lib |
| Backend | S3 + Lambda + API Gateway | Serverless, matches data-architecture diagram |
| Map SDK on AWS | Amazon Location Service (optional) | Documented integration path; app does not depend on it |
| Hosting | CloudFront + S3 (or Amplify Hosting) | Static SPA |
| AWS SDK | AWS SDK for JS v3 (ingestion/Lambda only) | Not bundled into frontend |

### Why MapLibre over Amazon Location Service as the default
Amazon Location requires an AWS account + API key to render tiles, which breaks the
"runs locally with no AWS" acceptance criterion. MapLibre renders the same GL style spec,
so the AWS path is a **configuration swap** (style URL + auth), documented in `docs/AWS_DEPLOYMENT.md`,
not a rewrite.

## 4. Data-provider abstraction (the key design seam)

```
            ┌─────────────────────────────┐
            │     DataProvider (iface)     │
            │  getFloodHotspots()          │
            │  getWaterBodies()            │
            │  getRainfallSites()          │
            │  getHazardZones()            │
            │  getDatasets() (provenance)  │
            └──────────────┬──────────────┘
                 ┌─────────┴──────────┐
     ┌───────────▼─────────┐  ┌───────▼───────────────┐
     │ LocalGeoJSONProvider │  │ AwsApiProvider         │
     │ fetch /data/*.geojson│  │ fetch API Gateway REST │
     │ (default, no AWS)    │  │ (VITE_API_BASE set)    │
     └──────────────────────┘  └────────────────────────┘
```

Selection rule: if `VITE_API_BASE` is set at build/runtime → `AwsApiProvider`, else
`LocalGeoJSONProvider`. If the AWS provider errors, the UI shows an error state and (optionally)
falls back to local demo data with a visible "demo data" badge.

## 5. Repository structure

```
floodlens-ai/
├── README.md                      # overview + Mermaid architecture diagram
├── docs/
│   ├── PHASE1_PLAN.md             # this file
│   ├── ARCHITECTURE.md            # detailed architecture
│   ├── DATASETS.md                # dataset provenance (filled in Phase 2)
│   ├── AWS_DEPLOYMENT.md          # S3/Lambda/API GW/Location/CloudFront steps
│   ├── TESTING.md                 # how to run every test suite
│   └── DEMO_SCRIPT.md             # 3-minute demo script
├── data/
│   ├── raw/                       # downloaded source files (gitignored if large)
│   ├── processed/                 # validated GeoJSON output of the pipeline
│   └── metadata/                  # datasets.json provenance records
├── pipeline/
│   ├── ingest.py                  # repeatable download + validate + convert
│   ├── validators.py              # lat/lon validation, dedup, missing-value handling
│   ├── to_geojson.py              # CSV/KML/SHP -> GeoJSON (CRS preserved)
│   └── test_pipeline.py           # pytest unit + validation tests
├── infra/
│   ├── template.yaml              # SAM/CloudFormation: S3 + Lambda + API GW
│   ├── lambda/
│   │   └── datasets_api/          # Lambda handler serving processed GeoJSON from S3
│   └── iam_policy.json            # least-privilege policy (placeholder account id)
└── web/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── playwright.config.ts
    ├── public/data/               # local demo GeoJSON (symlink/copy of data/processed)
    ├── src/
    │   ├── main.tsx / App.tsx
    │   ├── types/                 # FloodHotspot, WaterBody, RainfallSite, Dataset…
    │   ├── data/                  # DataProvider, LocalGeoJSONProvider, AwsApiProvider
    │   ├── lib/                   # haversine, geo utils, stats aggregation
    │   ├── hooks/                 # useDatasets, useLayers
    │   ├── components/            # Map, LayerControls, Legend, StatCards, Charts,
    │   │                          #   LocationDetails, ProximityPanel, DatasetExplorer
    │   └── pages/                 # Overview, MapView, Insights, Proximity, Datasets
    └── tests/
        ├── unit/                  # vitest: geo math, stats, provider, validation
        └── e2e/                   # playwright: 10 user-journey tests from the brief
```

## 6. Phase roadmap & exit criteria

| Phase | Deliverable | Exit test |
|-------|-------------|-----------|
| **1** | Plan, architecture, repo skeleton, README w/ Mermaid | Tree exists; docs committed |
| **2** | Verified datasets + repeatable ingestion → processed GeoJSON | `pytest pipeline/` green; GeoJSON validates |
| **3** | React app + interactive Chennai map with all layers | `npm run dev` renders map + markers |
| **4** | Insights charts, location details, proximity analysis | Charts react to filters; distances correct |
| **5** | S3 + Lambda + API GW + Location Service integration | SAM template validates; AwsApiProvider wired (deploy only on approval) |
| **6** | Unit + API + component + Playwright E2E; fix defects | All 10 journeys pass locally |
| **7** | Deployment docs + 3-min demo script | Docs complete; demo rehearsed |

## 7. Candidate datasets to verify in Phase 2 (NOT yet confirmed)

These are **leads to verify**, not confirmed data. Phase 2 will test each URL, record
license/date/coverage, and discard any that cannot be downloaded.

1. Chennai 2015 flood inundation / affected-area datasets (research + govt open data).
2. Ministry of Jal Shakti — national waterbody census (water bodies / tanks / ponds).
3. IMD / data.gov.in rainfall observation station datasets for Tamil Nadu / Chennai.
4. OpenStreetMap water polygons for Chennai (ODbL) as a geometry fallback for lakes/tanks.
5. Registry of Open Data on AWS — any Chennai/India hydrology layers.

Until a dataset is verified, the app ships with a **clearly-labelled demonstration dataset**
(`demo: true` flag on each record and a visible banner) so the UI is testable without
asserting the sample is real.

## 8. Risks & honest caveats

- Some Indian govt portals rate-limit or geo-block automated downloads; Phase 2 will document
  any inaccessible source rather than fabricate a substitute.
- Historical flood "depth" and "event year" are sparsely attributed in open data; the UI must
  render "not available" gracefully and never invent values.
- AWS deploy incurs cost; per user standing directive, **no AWS resources are created and no
  billable calls are made until explicitly approved.**
