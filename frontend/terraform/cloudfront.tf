# ---------------------------------------------------------------------------
# CDN
# ---------------------------------------------------------------------------

# Origin Access Control is the current mechanism (it supports SigV4 and KMS);
# Origin Access Identity is legacy and not used here.
resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${local.name_prefix}-oac"
  description                       = "OAC for ${var.domain_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

# Vite emits content-hashed filenames under /assets, so those are immutable and
# cached hard. index.html must never be cached at the edge or a deploy will not
# be visible until the TTL expires.
resource "aws_cloudfront_response_headers_policy" "site" {
  name    = "${local.name_prefix}-security-headers"
  comment = "Security headers for ${var.domain_name}"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    xss_protection {
      protection = true
      mode_block = true
      override   = true
    }
  }
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name_prefix} frontend"
  default_root_object = var.default_root_object
  price_class         = var.price_class
  aliases             = local.aliases

  origin {
    origin_id                = "s3-${aws_s3_bucket.site.id}"
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-${aws_s3_bucket.site.id}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id
  }

  # The app shell is revalidated on every request so a new deploy is live as
  # soon as the invalidation lands.
  ordered_cache_behavior {
    path_pattern           = "/index.html"
    target_origin_id       = "s3-${aws_s3_bucket.site.id}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id            = data.aws_cloudfront_cache_policy.disabled.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id
  }

  # ---------------------------------------------------------------------
  # SPA routing.
  #
  # VisibilityOS uses BrowserRouter, so /dashboard, /prompts, /answers and the
  # rest are client-side routes with no matching S3 object. A private bucket
  # behind OAC returns 403 (not 404) for a missing key, so both are rewritten
  # to the app shell with a 200 and React Router takes over. Without this,
  # every deep link and every browser refresh returns an error page.
  # ---------------------------------------------------------------------
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/${var.default_root_object}"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/${var.default_root_object}"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  dynamic "logging_config" {
    for_each = var.enable_access_logs ? [1] : []

    content {
      bucket          = aws_s3_bucket.logs[0].bucket_domain_name
      prefix          = "cloudfront/"
      include_cookies = false
    }
  }

  tags = {
    Name = "${local.name_prefix}-cdn"
  }
}
