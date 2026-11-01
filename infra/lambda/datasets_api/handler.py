"""
FloodLens AI — datasets_api Lambda handler.

Serves the processed GeoJSON datasets (and the provenance manifest) from the
processed S3 bucket as JSON over API Gateway. Read-only; least privilege
(s3:GetObject on the processed bucket only).

Routes (API Gateway proxy or REST):
    GET /flood-hotspots   -> flood_hotspots.geojson
    GET /water-bodies     -> water_bodies.geojson
    GET /rainfall-sites   -> rainfall_sites.geojson
    GET /hazard-zones     -> hazard_zones.geojson
    GET /datasets         -> datasets.json

Environment:
    PROCESSED_BUCKET   S3 bucket holding processed/ objects
    PROCESSED_PREFIX   key prefix (default: "processed/")
    ALLOWED_ORIGIN     CORS origin (default: "*", tighten in prod)
"""
from __future__ import annotations

import json
import os

import boto3  # provided by the Lambda runtime

_s3 = boto3.client("s3")

ROUTE_TO_KEY = {
    "/flood-hotspots": "flood_hotspots.geojson",
    "/water-bodies": "water_bodies.geojson",
    "/rainfall-sites": "rainfall_sites.geojson",
    "/hazard-zones": "hazard_zones.geojson",
    "/datasets": "datasets.json",
    # bare-object paths (for S3-static style access) also accepted:
    "/flood_hotspots.geojson": "flood_hotspots.geojson",
    "/water_bodies.geojson": "water_bodies.geojson",
    "/rainfall_sites.geojson": "rainfall_sites.geojson",
    "/hazard_zones.geojson": "hazard_zones.geojson",
    "/datasets.json": "datasets.json",
}


def _cors_headers() -> dict:
    origin = os.environ.get("ALLOWED_ORIGIN", "*")
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
    }


def _resp(status: int, body) -> dict:
    return {
        "statusCode": status,
        "headers": _cors_headers(),
        "body": body if isinstance(body, str) else json.dumps(body),
    }


def _path_from_event(event: dict) -> str:
    # Support REST (path), HTTP API v2 (rawPath / requestContext.http.path),
    # and proxy resources.
    return (
        event.get("path")
        or event.get("rawPath")
        or event.get("requestContext", {}).get("http", {}).get("path")
        or "/"
    )


def handler(event, _context=None):
    method = (
        event.get("httpMethod")
        or event.get("requestContext", {}).get("http", {}).get("method")
        or "GET"
    )
    if method == "OPTIONS":
        return _resp(200, "")

    path = _path_from_event(event).rstrip("/") or "/"
    # normalize a stage prefix if present, e.g. "/prod/datasets"
    for route in ROUTE_TO_KEY:
        if path.endswith(route):
            path = route
            break

    key_name = ROUTE_TO_KEY.get(path)
    if not key_name:
        return _resp(404, {"error": "not found", "path": path})

    bucket = os.environ.get("PROCESSED_BUCKET")
    if not bucket:
        return _resp(500, {"error": "PROCESSED_BUCKET not configured"})
    prefix = os.environ.get("PROCESSED_PREFIX", "processed/")
    key = f"{prefix}{key_name}"

    try:
        obj = _s3.get_object(Bucket=bucket, Key=key)
        payload = obj["Body"].read().decode("utf-8")
    except _s3.exceptions.NoSuchKey:
        return _resp(404, {"error": "dataset not found", "key": key})
    except Exception as exc:  # noqa: BLE001
        return _resp(502, {"error": "s3 read failed", "detail": str(exc)})

    return _resp(200, payload)
