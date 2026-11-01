"""
FloodLens AI — GeoJSON construction.

Converts validated point/polygon records into RFC 7946 GeoJSON FeatureCollections.
CRS is always WGS84 (EPSG:4326), as required by GeoJSON; the source CRS is recorded
in each dataset's provenance metadata rather than in the GeoJSON itself.
"""
from __future__ import annotations

from typing import Iterable


def point_feature(lon: float, lat: float, props: dict) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
        "properties": props,
    }


def feature_collection(features: Iterable[dict], meta: dict | None = None) -> dict:
    fc = {
        "type": "FeatureCollection",
        # GeoJSON (RFC 7946) is always WGS84; we state it explicitly for clarity.
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": list(features),
    }
    if meta:
        fc["metadata"] = meta
    return fc


def points_to_geojson(records: Iterable[dict], prop_keys: list[str], meta: dict | None = None) -> dict:
    """Build a FeatureCollection of Points.

    `prop_keys` lists which keys from each record become feature properties.
    Missing keys are written as null (never fabricated).
    """
    feats = []
    for r in records:
        props = {k: r.get(k, None) for k in prop_keys}
        feats.append(point_feature(r["lon"], r["lat"], props))
    return feature_collection(feats, meta)
