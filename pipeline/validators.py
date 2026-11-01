"""
FloodLens AI — data validation utilities.

Pure functions for validating and cleaning geospatial records before they are
written as GeoJSON. Unit-tested in test_pipeline.py.
"""
from __future__ import annotations

from typing import Iterable

# Chennai Metropolitan Area rough bounding box (lon/lat), used as a sanity gate.
# These bounds are generous and only reject clearly-wrong coordinates
# (e.g. 0,0 or swapped lat/lon). They are NOT a precise boundary.
CHENNAI_BBOX = {
    "min_lon": 79.90,
    "max_lon": 80.45,
    "min_lat": 12.75,
    "max_lat": 13.35,
}


def is_valid_lat(lat) -> bool:
    try:
        lat = float(lat)
    except (TypeError, ValueError):
        return False
    return -90.0 <= lat <= 90.0


def is_valid_lon(lon) -> bool:
    try:
        lon = float(lon)
    except (TypeError, ValueError):
        return False
    return -180.0 <= lon <= 180.0


def is_in_chennai(lon, lat, bbox: dict | None = None) -> bool:
    """Loose bounding-box containment for the Chennai region."""
    b = bbox or CHENNAI_BBOX
    if not (is_valid_lat(lat) and is_valid_lon(lon)):
        return False
    lon, lat = float(lon), float(lat)
    return (
        b["min_lon"] <= lon <= b["max_lon"]
        and b["min_lat"] <= lat <= b["max_lat"]
    )


def clean_str(value) -> str | None:
    """Trim whitespace; return None for empty/placeholder values.

    Never invents data: unknown values become None so the UI can render
    'not available' rather than a fabricated string.
    """
    if value is None:
        return None
    s = str(value).strip()
    if s == "" or s.lower() in {"na", "n/a", "null", "none", "-", "nan"}:
        return None
    return s


def dedupe_points(records: Iterable[dict], key=("lon", "lat", "name"), ndigits: int = 5) -> list[dict]:
    """Remove duplicate point records.

    Two records are duplicates if their rounded coordinates and name match.
    Coordinates are rounded to `ndigits` (~1m at 5 dp) to absorb float noise.
    """
    seen = set()
    out: list[dict] = []
    for r in records:
        try:
            k = (
                round(float(r["lon"]), ndigits),
                round(float(r["lat"]), ndigits),
                (r.get("name") or "").strip().lower(),
            )
        except (KeyError, TypeError, ValueError):
            # Keep records we cannot key rather than silently dropping them.
            out.append(r)
            continue
        if k in seen:
            continue
        seen.add(k)
        out.append(r)
    return out


def validate_point_record(r: dict) -> tuple[bool, str | None]:
    """Return (ok, reason_if_rejected) for a single point record."""
    if "lon" not in r or "lat" not in r:
        return False, "missing lon/lat"
    if not is_valid_lon(r["lon"]):
        return False, f"invalid lon {r.get('lon')!r}"
    if not is_valid_lat(r["lat"]):
        return False, f"invalid lat {r.get('lat')!r}"
    if not is_in_chennai(r["lon"], r["lat"]):
        return False, "outside Chennai bbox"
    return True, None
