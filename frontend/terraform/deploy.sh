#!/usr/bin/env bash
#
# Build the VisibilityOS frontend and publish it to S3 + CloudFront.
#
#   ./terraform/deploy.sh <bucket-name> <distribution-id>
#
# With no arguments, both values are read from `terraform output`.
#
# Cache strategy, which must match the CloudFront behaviours in cloudfront.tf:
#   /assets/*  content-hashed by Vite  -> immutable, one year
#   *.html     the app shell           -> never cached, revalidated every request
#
# Override the build with BUILD_CMD, e.g.
#   BUILD_CMD="npx vite build" ./terraform/deploy.sh
# (needed until src/vite-env.d.ts exists — see README "Known blocker").

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="${REPO_ROOT}/terraform"
DIST_DIR="${REPO_ROOT}/dist"
BUILD_CMD="${BUILD_CMD:-npm run build}"

BUCKET="${1:-}"
DISTRIBUTION_ID="${2:-}"

if [[ -z "$BUCKET" || -z "$DISTRIBUTION_ID" ]]; then
  echo "==> Reading targets from terraform output"
  BUCKET="$(terraform -chdir="$TF_DIR" output -raw bucket_name)"
  DISTRIBUTION_ID="$(terraform -chdir="$TF_DIR" output -raw distribution_id)"
fi

echo "==> Bucket:       $BUCKET"
echo "==> Distribution: $DISTRIBUTION_ID"

echo "==> Building ($BUILD_CMD)"
cd "$REPO_ROOT"
eval "$BUILD_CMD"

if [[ ! -f "${DIST_DIR}/index.html" ]]; then
  echo "ERROR: ${DIST_DIR}/index.html not found — the build did not produce a bundle." >&2
  exit 1
fi

# Pass 1: hashed assets. --delete prunes files no longer in the build.
# HTML is excluded here so the site keeps serving the old shell until pass 2.
echo "==> Uploading immutable assets"
aws s3 sync "$DIST_DIR" "s3://${BUCKET}" \
  --delete \
  --exclude "*.html" \
  --cache-control "public, max-age=31536000, immutable"

# Pass 2: the app shell, last, so it never references assets that are not up yet.
echo "==> Uploading HTML"
aws s3 sync "$DIST_DIR" "s3://${BUCKET}" \
  --exclude "*" \
  --include "*.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html; charset=utf-8"

echo "==> Invalidating CloudFront"
INVALIDATION_ID="$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)"

echo "==> Waiting for invalidation ${INVALIDATION_ID}"
aws cloudfront wait invalidation-completed \
  --distribution-id "$DISTRIBUTION_ID" \
  --id "$INVALIDATION_ID"

echo "==> Done: $(terraform -chdir="$TF_DIR" output -raw site_url 2>/dev/null || echo "deploy complete")"
