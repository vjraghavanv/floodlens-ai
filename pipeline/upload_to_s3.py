#!/usr/bin/env python3
"""
FloodLens AI — upload processed GeoJSON to the processed S3 bucket.

Usage:
    python pipeline/upload_to_s3.py --bucket floodlens-processed-<ACCOUNT_ID> [--profile NAME] [--region us-east-1]

Requires AWS credentials configured in your terminal (aws configure / aws sso login).
Uploads data/processed/*.geojson and datasets.json under the "processed/" prefix,
matching what the datasets_api Lambda expects. Read-free, idempotent (overwrites).

This script does NOT create resources — deploy the SAM stack first (see
docs/AWS_DEPLOYMENT.md). It only puts objects into an existing bucket.
"""
from __future__ import annotations

import argparse
import glob
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bucket", required=True)
    ap.add_argument("--prefix", default="processed/")
    ap.add_argument("--profile", default=None)
    ap.add_argument("--region", default=None)
    args = ap.parse_args()

    try:
        import boto3  # noqa: WPS433
    except ImportError:
        print("boto3 not installed. Run: pip install boto3", file=sys.stderr)
        return 2

    session = boto3.Session(profile_name=args.profile, region_name=args.region)
    s3 = session.client("s3")

    processed_dir = os.path.join(ROOT, "data", "processed")
    files = sorted(glob.glob(os.path.join(processed_dir, "*.geojson")))
    manifest = os.path.join(ROOT, "data", "metadata", "datasets.json")
    if os.path.exists(manifest):
        files.append(manifest)

    if not files:
        print("No processed files found. Run pipeline/ingest.py first.", file=sys.stderr)
        return 1

    for path in files:
        key = f"{args.prefix}{os.path.basename(path)}"
        ctype = "application/geo+json" if path.endswith(".geojson") else "application/json"
        s3.upload_file(
            path, args.bucket, key,
            ExtraArgs={"ContentType": ctype, "CacheControl": "public, max-age=300"},
        )
        print(f"  uploaded {os.path.basename(path)} -> s3://{args.bucket}/{key}")

    print(f"Done. {len(files)} object(s) uploaded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
