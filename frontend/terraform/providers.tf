provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.tags
  }
}

# CloudFront only accepts ACM certificates issued in us-east-1, regardless of
# where the rest of the stack lives. This aliased provider exists solely for the
# certificate and its DNS validation records.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.tags
  }
}
