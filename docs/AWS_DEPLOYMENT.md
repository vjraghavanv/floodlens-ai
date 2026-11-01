# FloodLens AI — AWS Deployment

This guide deploys the serverless backend (S3 + Lambda + API Gateway) and hosts the
frontend on **AWS Amplify Hosting**. The app runs fully **without** any of this (local/demo
mode); these steps are for the public, AWS-integrated deployment.

> **Cost note:** all services are pay-per-use and idle at ~$0 — a few MB of S3, Lambda only
> on API calls, HTTP API per-request, Amplify build+hosting on the free tier. Amazon Location
> Service is optional and off by default.

## Prerequisites

- AWS account and credentials configured in your terminal:
  ```bash
  aws configure            # or: aws sso login
  aws sts get-caller-identity   # confirm you're authenticated
  ```
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Python 3.12, Node.js 20+

Region used in examples: `us-east-1` (change `--region` as needed).

---

## 1. Deploy the data backend (S3 + Lambda + API Gateway)

```bash
cd infra
sam validate -t template.yaml --lint         # already verified in this repo
sam build -t template.yaml
sam deploy --guided \
  --stack-name floodlens \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides AllowedOrigin='*'     # tighten to your Amplify domain later
```

On success, note the stack outputs:
- `ApiBaseUrl` — e.g. `https://abc123.execute-api.us-east-1.amazonaws.com/prod`
- `RawBucketName`, `ProcessedBucketName`

What this creates (least privilege throughout):
- Two **S3 buckets** — `floodlens-raw-<acct>` (private) and `floodlens-processed-<acct>` (private),
  both encrypted (SSE-S3) with public access fully blocked.
- A **Lambda** (`floodlens-datasets-api`, Python 3.12, arm64, 256 MB/15 s) with an IAM policy
  limited to `s3:GetObject` on `processed/*` only (see `iam_policy.json`).
- An **HTTP API** with CORS (GET/OPTIONS) exposing `/flood-hotspots`, `/water-bodies`,
  `/rainfall-sites`, `/hazard-zones`, `/datasets`.

## 2. Generate and upload the datasets

```bash
# from repo root
python pipeline/ingest.py                       # produces data/processed/*.geojson
pip install boto3
python pipeline/upload_to_s3.py \
  --bucket floodlens-processed-<ACCOUNT_ID> \
  --region us-east-1
```

Verify:
```bash
curl "https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/datasets" | head
```

## 3. Host the frontend on AWS Amplify

The repo includes `amplify.yml` (build spec, `appRoot: web`) and
`web/public/_redirects.json` (SPA rewrite).

**Console path (recommended):**
1. Push this repo to GitHub.
2. Amplify Console → **New app → Host web app** → connect the repo/branch.
3. Amplify auto-detects `amplify.yml`.
4. Under **Environment variables**, set:
   - `VITE_API_BASE` = the `ApiBaseUrl` output from step 1
   - `VITE_FALLBACK_TO_DEMO` = `true` (optional)
   - *(optional)* `VITE_LOCATION_STYLE_URL`, `VITE_LOCATION_API_KEY` for Amazon Location Service
5. Deploy. Amplify gives you a `https://<branch>.<app-id>.amplifyapp.com` URL.
6. **Tighten CORS:** redeploy the SAM stack with
   `--parameter-overrides AllowedOrigin='https://<your-amplify-domain>'`.

**CLI alternative:** `npm i -g @aws-amplify/cli` then `amplify init` / `amplify add hosting`.

## 4. (Optional) Amazon Location Service basemap

```bash
aws location create-map --map-name floodlens-chennai \
  --configuration Style=VectorEsriStreets --region us-east-1
aws location create-key --key-name floodlens-map-key \
  --restrictions AllowActions=geo:GetMap*,AllowResources=<map-arn> --region us-east-1
```
Set the style descriptor URL + key as `VITE_LOCATION_STYLE_URL` / `VITE_LOCATION_API_KEY` in
Amplify. The map key is a **scoped, public map-read key**, not an AWS secret. Leaving these
unset keeps the open OSM raster basemap.

## Environment variables summary

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_API_BASE` | Amplify | API Gateway base URL; empty = local demo data |
| `VITE_FALLBACK_TO_DEMO` | Amplify | AWS mode falls back to bundled demo on API error |
| `VITE_LOCATION_STYLE_URL` | Amplify | Optional Amazon Location map style |
| `VITE_LOCATION_API_KEY` | Amplify | Optional scoped map-read key (public, not a secret) |
| `AllowedOrigin` | SAM param | CORS origin for the API |

## Security checklist

- ✅ No AWS credentials or secrets in frontend source (the app calls only the public REST API).
- ✅ S3 buckets private + encrypted; raw never exposed via the API.
- ✅ Lambda IAM limited to `s3:GetObject` on `processed/*`.
- ✅ Set `AllowedOrigin` to your exact Amplify domain in production (not `*`).

## Teardown

```bash
# empty buckets first (objects block stack deletion)
aws s3 rm s3://floodlens-processed-<acct> --recursive
aws s3 rm s3://floodlens-raw-<acct> --recursive
sam delete --stack-name floodlens
```
> This repo's agent did **not** create any AWS resources. Running the commands above is a
> manual, user-initiated action.
