variable "project" {
  description = "Short name used to prefix resource names and tags."
  type        = string
  default     = "visibilityos"
}

variable "environment" {
  description = "Deployment environment, used in names and tags."
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "Region for the S3 origin bucket and logs. CloudFront is global; the ACM certificate is always created in us-east-1."
  type        = string
  default     = "us-east-1"
}

# ---------------------------------------------------------------------------
# Domain
# ---------------------------------------------------------------------------
# The site is served at `domain_name`. `hosted_zone_name` is the Route 53 zone
# that domain lives in.
#
#   Apex domain (default):
#     domain_name      = "visibilityosensarresearch.com"
#     hosted_zone_name = "visibilityosensarresearch.com"
#
#   Subdomain of an existing zone:
#     domain_name      = "visibilityos.ensarresearch.com"
#     hosted_zone_name = "ensarresearch.com"
#     create_hosted_zone = false
# ---------------------------------------------------------------------------

variable "domain_name" {
  description = "Fully qualified domain the site is served at. Lowercase — DNS is case-insensitive and ACM normalises it."
  type        = string
  default     = "visibilityosensarresearch.com"

  validation {
    condition     = var.domain_name == lower(var.domain_name)
    error_message = "domain_name must be lowercase."
  }
}

variable "hosted_zone_name" {
  description = "Route 53 hosted zone that contains domain_name. Leave null to use domain_name itself (apex hosting)."
  type        = string
  default     = null
}

variable "create_hosted_zone" {
  description = "Create the Route 53 hosted zone. Set false when the zone already exists — the common case, since the registrar's nameservers are already pointed at it."
  type        = bool
  default     = false
}

variable "enable_www_alias" {
  description = "Also serve www.<domain_name>. Only meaningful when domain_name is an apex domain."
  type        = bool
  default     = true
}

# ---------------------------------------------------------------------------
# S3
# ---------------------------------------------------------------------------

variable "bucket_name" {
  description = "Origin bucket name. Must be globally unique and MUST NOT contain dots (a dotted name breaks CloudFront origin TLS). Defaults to <project>-<environment>-site-<account-id>."
  type        = string
  default     = null
}

variable "enable_bucket_versioning" {
  description = "Keep previous object versions, so a bad deploy can be rolled back."
  type        = bool
  default     = true
}

variable "force_destroy_bucket" {
  description = "Allow `terraform destroy` to delete a non-empty bucket. Keep false in production."
  type        = bool
  default     = false
}

# ---------------------------------------------------------------------------
# CloudFront
# ---------------------------------------------------------------------------

variable "price_class" {
  description = "CloudFront price class. PriceClass_100 is US/EU only and cheapest; PriceClass_All is global."
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "price_class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "enable_access_logs" {
  description = "Write CloudFront access logs to a dedicated bucket. Adds cost."
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "Days to keep CloudFront access logs before expiry. Ignored when enable_access_logs is false."
  type        = number
  default     = 90
}

variable "default_root_object" {
  description = "Object returned for a request to the site root."
  type        = string
  default     = "index.html"
}

variable "tags" {
  description = "Extra tags merged onto every resource."
  type        = map(string)
  default     = {}
}
