# ---------------------------------------------------------------------------
# DNS
#
# Either create the zone or look up an existing one. Creating a zone gives it
# fresh nameservers, which must then be set at the registrar before the domain
# resolves — see the `nameservers` output.
# ---------------------------------------------------------------------------

resource "aws_route53_zone" "this" {
  count = var.create_hosted_zone ? 1 : 0

  name    = local.hosted_zone_name
  comment = "Managed by Terraform for ${var.project}"

  tags = {
    Name = local.hosted_zone_name
  }
}

data "aws_route53_zone" "this" {
  count = var.create_hosted_zone ? 0 : 1

  name         = local.hosted_zone_name
  private_zone = false
}

# CloudFront's fixed hosted zone id. Not region-specific and not the same as
# the zone the record lives in.
locals {
  cloudfront_zone_id = "Z2FDTNDATAQYW2"
}

resource "aws_route53_record" "apex_a" {
  zone_id = local.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = local.cloudfront_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_aaaa" {
  zone_id = local.zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = local.cloudfront_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_a" {
  count = local.www_alias == null ? 0 : 1

  zone_id = local.zone_id
  name    = local.www_alias
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = local.cloudfront_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_aaaa" {
  count = local.www_alias == null ? 0 : 1

  zone_id = local.zone_id
  name    = local.www_alias
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = local.cloudfront_zone_id
    evaluate_target_health = false
  }
}
