#!/usr/bin/env python3
"""
FloodLens AI — repeatable data ingestion pipeline.

Usage:
    python pipeline/ingest.py                # fetch live + build processed GeoJSON
    python pipeline/ingest.py --offline      # skip network; demo-only datasets
    python pipeline/ingest.py --out DIR      # override output dir

What it does
------------
1. Water bodies  : LIVE fetch from OpenStreetMap via the Overpass API (ODbL).
                   Real named Chennai lakes/ponds/reservoirs with coordinates.
                   Falls back to a bundled snapshot if the network is unavailable.
2. Flood hotspots: DEMONSTRATION dataset. Locations are real Chennai
                   neighbourhoods documented as badly affected in the 2015
                   floods (peer-reviewed / news sources), but depth/date values
                   are illustrative and every record is flagged demo=true.
3. Hazard zones  : DEMONSTRATION polygons around known low-lying basins.
4. Rainfall sites: DEMONSTRATION observation points at real station localities.

Every output records provenance into data/metadata/datasets.json. Nothing is
presented as authoritative that is not actually sourced; demo records are
explicitly labelled so the frontend can badge them.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from validators import (  # noqa: E402
    clean_str,
    dedupe_points,
    validate_point_record,
)
from to_geojson import feature_collection, point_feature, points_to_geojson  # noqa: E402

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_QUERY = """
[out:json][timeout:60];
area["name"="Chennai"]["boundary"="administrative"]->.chn;
(
  way["natural"="water"](area.chn);
  relation["natural"="water"](area.chn);
  way["water"="lake"](area.chn);
  way["water"="pond"](area.chn);
  way["water"="reservoir"](area.chn);
);
out center tags 120;
"""

NOW = dt.datetime.now(dt.timezone.utc).isoformat()


# --------------------------------------------------------------------------- #
# 1. Water bodies — LIVE OpenStreetMap (real, ODbL)
# --------------------------------------------------------------------------- #
def fetch_water_bodies(offline: bool) -> tuple[list[dict], dict]:
    provenance = {
        "id": "water_bodies",
        "name": "Chennai Water Bodies (lakes, ponds, reservoirs)",
        "source_org": "OpenStreetMap contributors",
        "description": "Named water bodies within the Chennai administrative area.",
        "source_url": "https://overpass-api.de/api/interpreter",
        "license": "Open Database License (ODbL) 1.0",
        "coverage": "Chennai, Tamil Nadu, India",
        "format": "GeoJSON (Point, from OSM way centroids)",
        "crs_source": "EPSG:4326 (WGS84)",
        "demo": False,
    }
    records: list[dict] = []

    if not offline:
        try:
            data = OVERPASS_QUERY.encode("utf-8")
            req = urllib.request.Request(
                OVERPASS_URL,
                data=b"data=" + urllib.parse.quote(OVERPASS_QUERY).encode(),
                headers={"User-Agent": "FloodLens/1.0"},
            )
            with urllib.request.urlopen(req, timeout=75) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            for el in payload.get("elements", []):
                tags = el.get("tags", {})
                name = clean_str(tags.get("name"))
                if not name:
                    continue
                center = el.get("center") or {}
                lon, lat = center.get("lon"), center.get("lat")
                if lon is None or lat is None:
                    continue
                kind = tags.get("water") or tags.get("natural") or "water"
                records.append(
                    {
                        "lon": lon,
                        "lat": lat,
                        "name": name,
                        "waterbody_type": clean_str(kind),
                        "osm_id": f"{el.get('type')}/{el.get('id')}",
                        "source": "OpenStreetMap (ODbL)",
                        "demo": False,
                    }
                )
            provenance["fetched_at"] = NOW
            provenance["last_updated"] = NOW
        except Exception as exc:  # noqa: BLE001
            provenance["fetch_error"] = str(exc)
            print(f"  ! Overpass fetch failed ({exc}); using bundled snapshot", file=sys.stderr)

    if not records:
        # Bundled minimal snapshot of real OSM-sourced Chennai water bodies so the
        # pipeline is deterministic offline. Values are real; still ODbL-sourced.
        provenance["offline_snapshot"] = True
        snapshot = [
            ("Porur Lake", 80.1499163, 13.0311084, "lake"),
            ("Ambattur Lake", 80.1423361, 13.1063301, "reservoir"),
            ("ICF Lake", 80.217535, 13.1033995, "reservoir"),
            ("Chembarambakkam Lake", 80.0577, 13.0106, "reservoir"),
            ("Retteri Lake", 80.2061, 13.1356, "lake"),
            ("Sholinganallur Lake", 80.2279, 12.9009, "lake"),
            ("Madhavaram Lake", 80.2322, 13.1487, "lake"),
            ("Velachery Lake", 80.2197, 12.9792, "lake"),
            ("Perumbakkam Lake", 80.1949, 12.8977, "lake"),
            ("Pallikaranai Marsh", 80.2100, 12.9400, "wetland"),
        ]
        for name, lon, lat, kind in snapshot:
            records.append(
                {
                    "lon": lon, "lat": lat, "name": name,
                    "waterbody_type": kind, "osm_id": None,
                    "source": "OpenStreetMap (ODbL) — bundled snapshot",
                    "demo": False,
                }
            )
        provenance["last_updated"] = provenance.get("last_updated", NOW)

    records = _validate(records, provenance)
    provenance["record_count"] = len(records)
    return records, provenance


# --------------------------------------------------------------------------- #
# 2. Flood hotspots — DEMONSTRATION (labelled)
# --------------------------------------------------------------------------- #
def flood_hotspots() -> tuple[list[dict], dict]:
    provenance = {
        "id": "flood_hotspots",
        "name": "Chennai Historical Flood Hotspots (demonstration)",
        "source_org": "FloodLens AI (illustrative)",
        "description": (
            "Neighbourhoods widely documented as severely flood-affected during the "
            "Nov–Dec 2015 Chennai floods. Locations are real; flood depth and event "
            "attributes are ILLUSTRATIVE demonstration values, not measured records."
        ),
        "source_url": "https://en.wikipedia.org/wiki/2015_South_India_floods",
        "license": "Demonstration data — not for operational use",
        "coverage": "Chennai, Tamil Nadu, India",
        "format": "GeoJSON (Point)",
        "crs_source": "EPSG:4326 (WGS84)",
        "demo": True,
        "last_updated": NOW,
    }
    # (name, lon, lat, neighbourhood, year, depth_m|None)
    raw = [
        ("Velachery", 80.2197, 12.9792, "Velachery", 2015, 2.0),
        ("T. Nagar", 80.2340, 13.0418, "T. Nagar", 2015, 0.9),
        ("Mudichur", 80.0640, 12.9080, "Tambaram", 2015, 3.0),
        ("Adyar", 80.2574, 13.0067, "Adyar", 2015, 1.5),
        ("Kotturpuram", 80.2456, 13.0180, "Kotturpuram", 2015, 2.2),
        ("Mylapore", 80.2686, 13.0334, "Mylapore", 2015, 0.6),
        ("Saidapet", 80.2235, 13.0211, "Saidapet", 2015, 1.8),
        ("Ashok Nagar", 80.2110, 13.0356, "Ashok Nagar", 2015, 1.1),
        ("Pallikaranai", 80.2100, 12.9400, "Pallikaranai", 2015, 2.5),
        ("Mambalam", 80.2200, 13.0380, "West Mambalam", 2015, 1.0),
        ("Perungudi", 80.2420, 12.9630, "Perungudi", 2015, 1.4),
        ("Tambaram", 80.1000, 12.9250, "Tambaram", 2015, 1.9),
        ("Madipakkam", 80.1990, 12.9630, "Madipakkam", 2015, 1.6),
        ("Kolathur", 80.2190, 13.1230, "Kolathur", 2015, 1.2),
        ("Villivakkam", 80.2110, 13.1050, "Villivakkam", 2015, 0.8),
    ]
    records = []
    for name, lon, lat, nbhd, year, depth in raw:
        records.append(
            {
                "lon": lon, "lat": lat, "name": name,
                "neighbourhood": nbhd, "event_year": year,
                "flood_depth_m": depth, "source": "Demonstration dataset",
                "demo": True,
            }
        )
    records = _validate(records, provenance)
    provenance["record_count"] = len(records)
    return records, provenance


# --------------------------------------------------------------------------- #
# 3. Hazard zones — DEMONSTRATION polygons
# --------------------------------------------------------------------------- #
def hazard_zones() -> tuple[dict, dict]:
    provenance = {
        "id": "hazard_zones",
        "name": "Chennai Flood Hazard Zones (demonstration)",
        "source_org": "FloodLens AI (illustrative)",
        "description": (
            "Illustrative hazard polygons over known low-lying basins (Pallikaranai "
            "marsh catchment, Adyar/Cooum floodplain). DEMONSTRATION geometry only."
        ),
        "source_url": "https://en.wikipedia.org/wiki/2015_South_India_floods",
        "license": "Demonstration data — not for operational use",
        "coverage": "Chennai, Tamil Nadu, India",
        "format": "GeoJSON (Polygon)",
        "crs_source": "EPSG:4326 (WGS84)",
        "demo": True,
        "last_updated": NOW,
        "record_count": 2,
    }

    def box(name, risk, lon0, lat0, lon1, lat1):
        return {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [lon0, lat0], [lon1, lat0], [lon1, lat1], [lon0, lat1], [lon0, lat0],
                ]],
            },
            "properties": {"name": name, "risk": risk, "source": "Demonstration dataset", "demo": True},
        }

    fc = feature_collection(
        [
            box("Pallikaranai Marsh Catchment", "high", 80.19, 12.92, 80.24, 12.97),
            box("Adyar Floodplain", "high", 80.23, 13.00, 80.27, 13.03),
        ],
        provenance,
    )
    return fc, provenance


# --------------------------------------------------------------------------- #
# 4. Rainfall sites — DEMONSTRATION
# --------------------------------------------------------------------------- #
def rainfall_sites() -> tuple[list[dict], dict]:
    provenance = {
        "id": "rainfall_sites",
        "name": "Chennai Rainfall Observation Sites (demonstration)",
        "source_org": "FloodLens AI (illustrative; station localities after IMD/WRD network)",
        "description": (
            "Observation-point localities approximating the IMD / TN-WRD rain-gauge "
            "network around Chennai. DEMONSTRATION values; not measured rainfall."
        ),
        "source_url": "https://mausam.imd.gov.in/",
        "license": "Demonstration data — not for operational use",
        "coverage": "Chennai, Tamil Nadu, India",
        "format": "GeoJSON (Point)",
        "crs_source": "EPSG:4326 (WGS84)",
        "demo": True,
        "last_updated": NOW,
    }
    raw = [
        ("Nungambakkam", 80.2417, 13.0604),
        ("Meenambakkam", 80.1800, 12.9894),
        ("Ennore", 80.3200, 13.2200),
        ("Tambaram", 80.1000, 12.9250),
        ("Red Hills", 80.1860, 13.1900),
        ("Chembarambakkam", 80.0577, 13.0106),
    ]
    records = [
        {"lon": lon, "lat": lat, "name": n, "station_locality": n,
         "source": "Demonstration dataset", "demo": True}
        for n, lon, lat in raw
    ]
    records = _validate(records, provenance)
    provenance["record_count"] = len(records)
    return records, provenance


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _validate(records: list[dict], provenance: dict) -> list[dict]:
    kept, rejected = [], 0
    for r in records:
        ok, reason = validate_point_record(r)
        if ok:
            kept.append(r)
        else:
            rejected += 1
    kept = dedupe_points(kept)
    if rejected:
        provenance["rejected_records"] = rejected
    return kept


def _write_json(path: str, obj) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def run(out_dir: str, offline: bool) -> dict:
    processed = os.path.join(out_dir, "data", "processed")
    metadata = os.path.join(out_dir, "data", "metadata")
    web_public = os.path.join(out_dir, "web", "public", "data")

    datasets_meta = []

    print("• Water bodies (OpenStreetMap / Overpass)…")
    wb, wb_meta = fetch_water_bodies(offline)
    wb_gj = points_to_geojson(wb, ["name", "waterbody_type", "osm_id", "source", "demo"], wb_meta)

    print("• Flood hotspots (demonstration)…")
    fh, fh_meta = flood_hotspots()
    fh_gj = points_to_geojson(
        fh, ["name", "neighbourhood", "event_year", "flood_depth_m", "source", "demo"], fh_meta
    )

    print("• Hazard zones (demonstration)…")
    hz_gj, hz_meta = hazard_zones()

    print("• Rainfall sites (demonstration)…")
    rf, rf_meta = rainfall_sites()
    rf_gj = points_to_geojson(rf, ["name", "station_locality", "source", "demo"], rf_meta)

    outputs = {
        "flood_hotspots.geojson": fh_gj,
        "water_bodies.geojson": wb_gj,
        "hazard_zones.geojson": hz_gj,
        "rainfall_sites.geojson": rf_gj,
    }
    for fname, gj in outputs.items():
        _write_json(os.path.join(processed, fname), gj)
        _write_json(os.path.join(web_public, fname), gj)  # bundle for local/demo mode

    datasets_meta = [fh_meta, wb_meta, hz_meta, rf_meta]
    manifest = {
        "generated_at": NOW,
        "datasets": datasets_meta,
        "totals": {
            "flood_hotspots": fh_meta["record_count"],
            "water_bodies": wb_meta["record_count"],
            "hazard_zones": hz_meta["record_count"],
            "rainfall_sites": rf_meta["record_count"],
        },
    }
    _write_json(os.path.join(metadata, "datasets.json"), manifest)
    _write_json(os.path.join(web_public, "datasets.json"), manifest)

    print("\nSummary:")
    for k, v in manifest["totals"].items():
        print(f"  {k:16s}: {v}")
    print(f"  written to     : {processed}")
    print(f"  bundled for web: {web_public}")
    return manifest


def main() -> int:
    ap = argparse.ArgumentParser(description="FloodLens AI data ingestion")
    ap.add_argument("--offline", action="store_true", help="skip network fetches")
    ap.add_argument("--out", default=ROOT, help="project root to write under")
    args = ap.parse_args()
    run(args.out, args.offline)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
