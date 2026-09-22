locals {
  name_prefix = "${var.project}-${var.environment}"

  # The zone the record goes in. Defaults to the domain itself (apex hosting).
  hosted_zone_name = coalesce(var.hosted_zone_name, var.domain_name)

  # www only makes sense when we are hosting the apex of the zone.
  is_apex   = var.domain_name == local.hosted_zone_name
  www_alias = var.enable_www_alias && local.is_apex ? "www.${var.domain_name}" : null

  # Every name CloudFront should answer on, and every name on the certificate.
  aliases = compact([var.domain_name, local.www_alias])

  # Dots in a bucket name break CloudFront's connection to the origin: the
  # regional endpoint becomes <bucket>.s3.<region>.amazonaws.com, and AWS's
  # wildcard certificate matches only a single label, so a dotted name fails the
  # TLS handshake. Derive a dot-free default.
  default_bucket_name = "${local.name_prefix}-site-${data.aws_caller_identity.current.account_id}"
  bucket_name         = coalesce(var.bucket_name, local.default_bucket_name)

  # Zone id resolved from whichever source is active.
  zone_id = var.create_hosted_zone ? aws_route53_zone.this[0].zone_id : data.aws_route53_zone.this[0].zone_id

  tags = merge(
    {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Component   = "frontend"
    },
    var.tags,
  )
}
