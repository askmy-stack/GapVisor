terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }

  # Remote state in the shared, versioned state bucket. Follows the existing
  # <name>/terraform.tfstate convention used by aws-cloudfront and aws-fargate.
  #
  # Locking uses S3 natively (`use_lockfile`, Terraform >= 1.10) rather than a
  # DynamoDB table, so there is no extra resource to provision.
  backend "s3" {
    bucket       = "ensar-terraform-state-605134435037"
    key          = "visibilityos/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
