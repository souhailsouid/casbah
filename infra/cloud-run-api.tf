# Cloud Run — API Fastify
resource "google_cloud_run_v2_service" "api" {
  name     = "casbah-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.api.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      # Image poussée par .github/workflows/deploy-api.yml ; le premier apply utilise :latest s'il existe.
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}/api:latest"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "FIREBASE_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "WEB_URL"
        value = var.web_url
      }
      env {
        name  = "WEB_BASE_PATH"
        value = var.web_base_path
      }
      env {
        name  = "EMAIL_FROM"
        value = var.email_from
      }

      dynamic "env" {
        for_each = local.secrets
        content {
          name = env.value
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.secrets[env.value].secret_id
              version = "latest"
            }
          }
        }
      }

      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 2
        period_seconds        = 5
        failure_threshold     = 6
      }
    }
  }

  lifecycle {
    # L'image est mise à jour par le workflow GitHub, pas par Terraform.
    ignore_changes = [template[0].containers[0].image, client, client_version]
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_secret_manager_secret_iam_member.api_access,
  ]
}

# Accès public : l'authentification est applicative (Firebase ID tokens, signatures de webhooks, secret cron).
resource "google_cloud_run_v2_service_iam_member" "api_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Domaine personnalisé (optionnel)
resource "google_cloud_run_domain_mapping" "api" {
  count    = var.domain_api != "" ? 1 : 0
  location = var.region
  name     = var.domain_api

  metadata {
    namespace = var.project_id
  }
  spec {
    route_name = google_cloud_run_v2_service.api.name
  }
}
