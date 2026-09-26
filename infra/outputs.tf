output "api_url" {
  description = "URL Cloud Run de l'API → NEXT_PUBLIC_API_URL (variable GitHub) et webhooks Meta / Resend"
  value       = google_cloud_run_v2_service.api.uri
}

output "github_variables" {
  description = "Variables à créer dans le dépôt GitHub (Settings → Secrets and variables → Actions → Variables)"
  value = {
    GCP_PROJECT_ID   = var.project_id
    GCP_REGION       = var.region
    GCP_WIF_PROVIDER = google_iam_workload_identity_pool_provider.github.name
    GCP_DEPLOY_SA    = google_service_account.deployer.email
  }
}

output "webhook_urls" {
  description = "À coller dans la console Meta (WhatsApp → Configuration) et Resend (Webhooks)"
  value = {
    whatsapp = "${google_cloud_run_v2_service.api.uri}/webhooks/whatsapp"
    resend   = "${google_cloud_run_v2_service.api.uri}/webhooks/resend"
  }
}
