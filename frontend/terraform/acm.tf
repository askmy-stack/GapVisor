# ---------------------------------------------------------------------------
# TLS certificate
#
# Must live in us-east-1 — CloudFront will not accept a certificate from any
# other region. Validated by DNS, which is automatic because we own the zone.
# ---------------------------------------------------------------------------

resource "aws_acm_certificate" "site" {
  provider = aws.us_east_1

  domain_name = var.domain_name
  # www (when enabled) rides along as a SAN so one cert covers both names.
  subject_alternative_names = local.www_alias == null ? [] : [local.www_alias]
  validation_method         = "DNS"

  tags = {
    Name = "${local.name_prefix}-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# One validation record per name on the certificate. The for_each key is the
# domain, so adding or removing www does not churn the other record.
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = local.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]

  timeouts {
    create = "10m"
  }
}
