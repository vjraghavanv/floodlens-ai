"""
FloodLens AI — pipeline unit & data-validation tests.

Run:  cd pipeline && python -m pytest -q
(or)  python -m pytest pipeline/ -q
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import validators as V  # noqa: E402
import to_geojson as G  # noqa: E402
import ingest  # noqa: E402


# ---- validators -------------------------------------------------------- #
def test_valid_lat_lon():
    assert V.is_valid_lat(13.0) and V.is_valid_lon(80.2)
    assert not V.is_valid_lat(91)
    assert not V.is_valid_lon(181)
    assert not V.is_valid_lat("abc")
    assert not V.is_valid_lon(None)


def test_chennai_bbox():
    assert V.is_in_chennai(80.2197, 12.9792)      # Velachery
    assert not V.is_in_chennai(0, 0)              # null island
    assert not V.is_in_chennai(77.59, 12.97)      # Bengaluru, out of bbox
    # swapped lat/lon should fail containment
    assert not V.is_in_chennai(12.9792, 80.2197)


def test_clean_str_missing_values():
    assert V.clean_str("  Porur  ") == "Porur"
    for junk in ["", "NA", "n/a", "null", "-", "NaN", None]:
        assert V.clean_str(junk) is None


def test_dedupe_points():
    recs = [
        {"lon": 80.21, "lat": 13.00, "name": "A"},
        {"lon": 80.21, "lat": 13.00, "name": "A"},   # exact dup
        {"lon": 80.210001, "lat": 13.000001, "name": "A"},  # within rounding
        {"lon": 80.30, "lat": 13.10, "name": "B"},
    ]
    out = V.dedupe_points(recs)
    assert len(out) == 2


def test_validate_point_record():
    ok, _ = V.validate_point_record({"lon": 80.2, "lat": 13.0})
    assert ok
    bad, reason = V.validate_point_record({"lon": 999, "lat": 13.0})
    assert not bad and "lon" in reason
    missing, reason2 = V.validate_point_record({"lat": 13.0})
    assert not missing and "missing" in reason2


# ---- geojson ----------------------------------------------------------- #
def test_point_feature_shape():
    f = G.point_feature(80.2, 13.0, {"name": "X"})
    assert f["type"] == "Feature"
    assert f["geometry"]["type"] == "Point"
    assert f["geometry"]["coordinates"] == [80.2, 13.0]  # lon, lat order
    assert f["properties"]["name"] == "X"


def test_points_to_geojson_missing_prop_is_null():
    recs = [{"lon": 80.2, "lat": 13.0, "name": "X"}]  # no 'depth' key
    fc = G.points_to_geojson(recs, ["name", "depth"])
    assert fc["type"] == "FeatureCollection"
    props = fc["features"][0]["properties"]
    assert props["name"] == "X"
    assert props["depth"] is None  # fabricated? no — null.


def test_feature_collection_is_wgs84():
    fc = G.feature_collection([])
    assert "CRS84" in fc["crs"]["properties"]["name"]


# ---- ingestion (offline, deterministic) -------------------------------- #
def test_ingest_offline_writes_valid_geojson(tmp_path):
    manifest = ingest.run(str(tmp_path), offline=True)
    proc = tmp_path / "data" / "processed"
    for fname in ("flood_hotspots.geojson", "water_bodies.geojson",
                  "hazard_zones.geojson", "rainfall_sites.geojson"):
        gj = json.loads((proc / fname).read_text())
        assert gj["type"] == "FeatureCollection"
        assert isinstance(gj["features"], list)
    # totals are computed, non-negative, and match feature counts for points
    assert manifest["totals"]["water_bodies"] > 0
    assert manifest["totals"]["flood_hotspots"] == 15


def test_demo_records_are_flagged(tmp_path):
    ingest.run(str(tmp_path), offline=True)
    fh = json.loads((tmp_path / "data" / "processed" / "flood_hotspots.geojson").read_text())
    assert all(feat["properties"]["demo"] is True for feat in fh["features"])
    # water bodies snapshot is real data, not demo
    wb = json.loads((tmp_path / "data" / "processed" / "water_bodies.geojson").read_text())
    assert all(feat["properties"]["demo"] is False for feat in wb["features"])


def test_overview_totals_not_hardcoded(tmp_path):
    """Totals must equal actual feature counts, proving they are computed."""
    m = ingest.run(str(tmp_path), offline=True)
    wb = json.loads((tmp_path / "data" / "processed" / "water_bodies.geojson").read_text())
    assert m["totals"]["water_bodies"] == len(wb["features"])
