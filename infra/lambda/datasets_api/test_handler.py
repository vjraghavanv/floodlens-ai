"""
FloodLens AI — API/Lambda handler tests.

Run:  python -m pytest infra/lambda/datasets_api/ -q
Uses a fake S3 client so no AWS account or network is required.
"""
import importlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


class _FakeBody:
    def __init__(self, data: bytes):
        self._data = data

    def read(self):
        return self._data


class _NoSuchKey(Exception):
    pass


class _FakeS3:
    def __init__(self, store: dict):
        self._store = store

        class _Exc:
            NoSuchKey = _NoSuchKey

        self.exceptions = _Exc()

    def get_object(self, Bucket, Key):  # noqa: N803
        if Key not in self._store:
            raise _NoSuchKey()
        return {"Body": _FakeBody(self._store[Key].encode("utf-8"))}


def _load_handler(store):
    import handler as h  # type: ignore

    importlib.reload(h)
    h._s3 = _FakeS3(store)  # inject fake client
    return h


def _env():
    os.environ["PROCESSED_BUCKET"] = "floodlens-processed"
    os.environ["PROCESSED_PREFIX"] = "processed/"
    os.environ["ALLOWED_ORIGIN"] = "https://example.com"


def test_get_datasets_ok():
    _env()
    manifest = {"totals": {"water_bodies": 57}}
    h = _load_handler({"processed/datasets.json": json.dumps(manifest)})
    resp = h.handler({"httpMethod": "GET", "path": "/datasets"})
    assert resp["statusCode"] == 200
    assert resp["headers"]["Access-Control-Allow-Origin"] == "https://example.com"
    assert json.loads(resp["body"])["totals"]["water_bodies"] == 57


def test_get_water_bodies_route_maps_to_key():
    _env()
    fc = {"type": "FeatureCollection", "features": []}
    h = _load_handler({"processed/water_bodies.geojson": json.dumps(fc)})
    resp = h.handler({"httpMethod": "GET", "path": "/water-bodies"})
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["type"] == "FeatureCollection"


def test_stage_prefixed_path():
    _env()
    h = _load_handler({"processed/datasets.json": "{}"})
    resp = h.handler({"httpMethod": "GET", "path": "/prod/datasets"})
    assert resp["statusCode"] == 200


def test_unknown_route_404():
    _env()
    h = _load_handler({})
    resp = h.handler({"httpMethod": "GET", "path": "/nope"})
    assert resp["statusCode"] == 404


def test_missing_object_404():
    _env()
    h = _load_handler({})  # empty store
    resp = h.handler({"httpMethod": "GET", "path": "/datasets"})
    assert resp["statusCode"] == 404


def test_options_preflight():
    _env()
    h = _load_handler({})
    resp = h.handler({"httpMethod": "OPTIONS", "path": "/datasets"})
    assert resp["statusCode"] == 200
    assert "Access-Control-Allow-Methods" in resp["headers"]


def test_http_api_v2_event_shape():
    _env()
    h = _load_handler({"processed/datasets.json": "{}"})
    event = {"rawPath": "/datasets", "requestContext": {"http": {"method": "GET", "path": "/datasets"}}}
    resp = h.handler(event)
    assert resp["statusCode"] == 200
