output "site_url" {
  description = "Public URL of the deployed frontend."
  value       = "https://${var.domain_name}"
}

output "bucket_name" {
  description = "Origin bucket. Pass to the deploy script."
  value       = aws_s3_bucket.site.id
}

output "distribution_id" {
  description = "CloudFront distribution id. Needed to create invalidations."
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_domain_name" {
  description = "CloudFront domain, for testing before DNS propagates."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "certificate_arn" {
  description = "Validated ACM certificate serving the site."
  value       = aws_acm_certificate_validation.site.certificate_arn
}

output "hosted_zone_id" {
  description = "Route 53 zone holding the site records."
  value       = local.zone_id
}

output "nameservers" {
  description = "Set these at the domain registrar. Only populated when Terraform created the zone; the domain will not resolve until they are set."
  value       = var.create_hosted_zone ? aws_route53_zone.this[0].name_servers : null
}

output "deploy_command" {
  description = "One-liner to build and publish the current working tree."
  value       = "./terraform/deploy.sh ${aws_s3_bucket.site.id} ${aws_cloudfront_distribution.site.id}"
}
