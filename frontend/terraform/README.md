# GapVisor frontend — AWS deployment

Terraform for serving the Vite/React SPA from a private S3 bucket through
CloudFront, on a custom domain with a managed TLS certificate.

```
Route 53  ──alias──>  CloudFront  ──OAC──>  S3 (private)
   │                      │
   │                  ACM cert (us-east-1)
   └── A + AAAA for visibilityos.ensarresearch.com
```

**Deployed:** https://visibilityos.ensarresearch.com — distribution `E9ZW63034HTP`,
bucket `visibilityos-frontend-prod-605134435037`.

| File | Contains |
|------|----------|
| `versions.tf` | Provider constraints, optional S3 remote state |
| `providers.tf` | Default region plus the required `us-east-1` alias for ACM |
| `variables.tf` | All inputs |
| `locals.tf` | Derived names, alias list, zone resolution |
| `s3.tf` | Private origin bucket, encryption, versioning, lifecycle, policy, optional log bucket |
| `acm.tf` | Certificate and DNS validation |
| `cloudfront.tf` | OAC, cache behaviours, security headers, SPA error routing |
| `route53.tf` | Zone (create or look up) and alias records |
| `outputs.tf` | Everything the deploy step needs |
| `deploy.sh` | Build, upload with correct cache headers, invalidate |

---

## Build

`npm run build` runs `tsc -b && vite build` and passes. `src/vite-env.d.ts`
supplies the `vite/client` types that `import.meta.env` needs; without it `tsc`
fails and the build produces nothing.

The deploy script uses `npm run build` by default. Override with `BUILD_CMD` only
if you deliberately want to skip type checking:

```bash
BUILD_CMD="npx vite build" ./terraform/deploy.sh
```

---

## Prerequisites

- Terraform >= 1.5
- AWS CLI v2, authenticated with permissions for S3, CloudFront, ACM, Route 53, IAM
- Node 18+ and `npm install` already run
- The domain registered, with its nameservers pointing at Route 53

> Bucket names must not contain dots. CloudFront reaches the origin at
> `<bucket>.s3.<region>.amazonaws.com`, and AWS’s wildcard certificate matches a
> single label, so a dotted name fails the origin TLS handshake with an opaque
> 502. The default is derived dot-free from `<project>-<environment>-site-<account>`.

## Domain

`VisibilityOsensarresearch.com` was ambiguous, so it is a variable. **Reading B is
what is deployed**: the account has exactly one hosted zone, `ensarresearch.com`
(`Z10247872LCYEL8BRCEN0`), already serving 17 sibling apps on the same
`<app>.ensarresearch.com` pattern with no `www` records. Both readings remain
supported:

**A — apex of its own zone**

```hcl
domain_name      = "visibilityosensarresearch.com"
hosted_zone_name = null
enable_www_alias = true
```

**B — subdomain of an existing zone (in use)**

```hcl
domain_name      = "visibilityos.ensarresearch.com"
hosted_zone_name = "ensarresearch.com"
enable_www_alias = false
```

Under B the existing zone is looked up, not created, and only one record is
added — nothing else in that zone is touched.

## Deploy

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # edit it
terraform init
terraform plan
terraform apply
```

First apply takes roughly 5–10 minutes; most of it is CloudFront propagating.

If `create_hosted_zone = true`, the apply pauses at certificate validation until
the registrar's nameservers point at the new zone. Take the `nameservers`
output, set them at the registrar, and re-run `terraform apply`.

Then publish the site:

```bash
cd ..
./terraform/deploy.sh          # reads bucket + distribution from terraform output
```

## Why the config looks the way it does

**Private bucket, no website endpoint.** The bucket blocks all public access.
CloudFront authenticates to it with Origin Access Control (SigV4). The bucket
policy trusts exactly one distribution ARN, so the objects are unreachable except
through the CDN. S3 static website hosting is deliberately not used — it only
speaks HTTP and cannot be locked down this way.

**SPA routing.** The app uses `BrowserRouter`, so `/dashboard`, `/prompts`,
`/answers` and the rest are client-side routes with no object in S3. A private
bucket returns **403** (not 404) for a missing key, so both 403 and 404 are
rewritten to `/index.html` with a **200**. Without this, every deep link and
every browser refresh returns an error page.

**Two cache behaviours.** Vite emits content-hashed filenames under `/assets`,
so those are immutable and cached for a year. `/index.html` uses
`Managed-CachingDisabled` and is uploaded with `no-store`, so a deploy is live
immediately rather than after a TTL. `deploy.sh` uploads assets first and the
shell last, so the shell never references assets that are not yet present.

**Certificate region.** CloudFront only accepts ACM certificates from
`us-east-1`. That is the sole reason for the aliased provider; move the rest of
the stack to any region by changing `aws_region`.

**`Z2FDTNDATAQYW2`** in `route53.tf` is CloudFront's fixed hosted zone id for
alias targets. It is the same in every account and region, and is not the zone
the record lives in.

## Cost

Roughly $1–5/month at low traffic: S3 storage is cents, CloudFront has a
perpetual free tier (1 TB out, 10M requests), ACM and the alias records are free.
The Route 53 hosted zone is $0.50/month. `enable_access_logs = true` adds S3
storage and request cost.

## Teardown

```bash
terraform destroy
```

The bucket must be empty first, or set `force_destroy_bucket = true` and apply
before destroying. If Terraform created the hosted zone, destroying it releases
the nameservers and the domain stops resolving.

## Hardening worth adding later

Not included, to keep the first deploy simple:

- **WAF** — attach a `aws_wafv2_web_acl` with the AWS managed common rule set.
- **CI deploys** — an IAM role assumed via GitHub OIDC, scoped to
  `s3:PutObject` on the bucket and `cloudfront:CreateInvalidation` on the
  distribution, instead of long-lived keys.
- **Content-Security-Policy** — the response headers policy sets HSTS, frame,
  referrer and content-type protections but no CSP, since the app loads Google
  Fonts and inline styles that need a policy written against the real bundle.
- **Staging environment** — re-run with `environment = "staging"` and a
  different `domain_name`; names are already prefixed by both.
