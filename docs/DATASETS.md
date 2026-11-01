# FloodLens AI — Datasets & Provenance

This document records every dataset the application uses, its source, license, coverage, and
processing status. It is the data-provenance section required by the brief. Data is produced by
the repeatable pipeline in [`../pipeline/ingest.py`](../pipeline/ingest.py).

> **Integrity rule:** real datasets and demonstration datasets are clearly separated below and
> flagged with a `demo` boolean on every record. The UI badges demo data. Missing attributes are
> written as `null` and rendered as "not available" — never fabricated.

Regenerate at any time:
```bash
python pipeline/ingest.py            # live fetch (OSM) + demo datasets
python pipeline/ingest.py --offline  # deterministic, no network
```

---

## 1. Water Bodies — ✅ REAL (verified, downloaded)

| Field | Value |
|-------|-------|
| **Source organization** | OpenStreetMap contributors |
| **Source** | Overpass API — `https://overpass-api.de/api/interpreter` |
| **Query** | Named `natural=water` / `water=lake|pond|reservoir` ways & relations within the Chennai administrative area |
| **License** | Open Database License (ODbL) 1.0 |
| **Coverage** | Chennai, Tamil Nadu, India |
| **Format** | GeoJSON (Point, from OSM way centroids) |
| **CRS** | EPSG:4326 (WGS84) |
| **Record count** | **57** (live fetch, 2026-11-01) |
| **Status** | ✅ Fetched and validated. Includes Porur Lake, Ambattur Lake, ICF Lake, Chembarambakkam, Retteri, Pallikaranai marsh, and 50+ temple tanks (*kulam*). Each carries its real OSM id (e.g. `way/23633592`). |
| **Attribution** | © OpenStreetMap contributors, ODbL. |

Verification performed in Phase 2: the Overpass endpoint returned HTTP 200 with 57 named
features and real coordinates. A bundled 10-record snapshot (also real OSM values) is included so
`--offline` runs are deterministic.

---

## 2. Flood Hotspots — 🟡 DEMONSTRATION (labelled)

| Field | Value |
|-------|-------|
| **Source organization** | FloodLens AI (illustrative) |
| **Reference** | 2015 South India floods — https://en.wikipedia.org/wiki/2015_South_India_floods |
| **License** | Demonstration data — not for operational use |
| **Coverage** | Chennai, Tamil Nadu, India |
| **Format** | GeoJSON (Point) |
| **CRS** | EPSG:4326 (WGS84) |
| **Record count** | 15 |
| **Status** | 🟡 Locations are **real** Chennai neighbourhoods widely documented as severely affected in the Nov–Dec 2015 floods (Velachery, Mudichur, Adyar, Kotturpuram, Pallikaranai, T. Nagar …). Flood **depth** and **event** attributes are **illustrative** demonstration values, not measured records. Every record is `demo: true`. |

**Why demo:** authoritative per-location historical flood-depth datasets for Chennai are not
openly downloadable in machine-readable form (the available material is in PDFs and research
papers — see "Sources evaluated" below). Rather than fabricate a "real" dataset, these records
are explicitly labelled demonstration data. Replacing them with a verified source is a
Phase-2-repeatable swap in `ingest.py`.

---

## 3. Flood Hazard Zones — 🟡 DEMONSTRATION (labelled)

| Field | Value |
|-------|-------|
| **Source organization** | FloodLens AI (illustrative) |
| **License** | Demonstration data — not for operational use |
| **Format** | GeoJSON (Polygon) |
| **CRS** | EPSG:4326 (WGS84) |
| **Record count** | 2 |
| **Status** | 🟡 Illustrative hazard polygons over known low-lying basins (Pallikaranai marsh catchment, Adyar floodplain). DEMONSTRATION geometry; `demo: true`. |

---

## 4. Rainfall Observation Sites — 🟡 DEMONSTRATION (labelled)

| Field | Value |
|-------|-------|
| **Source organization** | FloodLens AI (illustrative; localities after the IMD / TN-WRD gauge network) |
| **Reference** | India Meteorological Department — https://mausam.imd.gov.in/ |
| **License** | Demonstration data — not for operational use |
| **Format** | GeoJSON (Point) |
| **CRS** | EPSG:4326 (WGS84) |
| **Record count** | 6 |
| **Status** | 🟡 Observation-point localities approximating the real rain-gauge network (Nungambakkam, Meenambakkam, Ennore, Red Hills, Chembarambakkam, Tambaram). Values are demonstration only; `demo: true`. |

---

## Sources evaluated in Phase 2

| Source | URL | Outcome |
|--------|-----|---------|
| OpenStreetMap / Overpass | overpass-api.de | ✅ **Used** — scriptable, returned 57 real Chennai water bodies (ODbL). |
| Jal Shakti — First Census of Water Bodies, Tamil Nadu | aikosh.indiaai.gov.in | 🔎 Page reachable (HTTP 200) but the 33 MB dataset sits behind a JS/portal download gate; not a direct machine-readable URL. Documented for manual import; **not fabricated**. |
| data.gov.in | data.gov.in | 🔎 Portal reachable; datasets require API key / JS catalog navigation. Documented as a manual-import path. |
| ArcGIS "Chennai Floods 2015" analysis | developers.arcgis.com | 🔎 Tutorial + sample; underlying data tied to the ArcGIS sample notebook, not a clean open download. |
| IMD rainfall (mausam.imd.gov.in) | mausam.imd.gov.in | 🔎 Observational data is not offered as a bulk open GeoJSON/CSV download; used only as a locality reference for labelled demo points. |

**Honest status:** one dataset (water bodies) is real and verified end-to-end. The other three are
clearly-labelled demonstration data because no openly-downloadable machine-readable source was
confirmed for them in Phase 2. The pipeline is structured so each can be replaced by a verified
source without touching the frontend.
