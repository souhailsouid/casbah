# Cloud Scheduler — tâches planifiées de l'API (secret partagé dans l'en-tête x-cron-secret).
# La valeur du secret est lue dans Secret Manager au moment de l'apply (après l'avoir saisie).
data "google_secret_manager_secret_version" "cron_secret" {
  secret     = google_secret_manager_secret.secrets["CRON_SECRET"].id
  depends_on = [google_secret_manager_secret.secrets]
}

locals {
  crons = {
    reminders = {
      description = "Rappels WhatsApp / e-mail la veille (J-1)"
      schedule    = "0 10 * * *"
      path        = "/cron/reminders"
    }
    complete_past = {
      description = "Clôture des réservations passées"
      schedule    = "30 3 * * *"
      path        = "/cron/complete-past"
    }
    retry_notifications = {
      description = "Relance des notifications en échec"
      schedule    = "*/15 * * * *"
      path        = "/cron/retry-notifications"
    }
  }
}

resource "google_cloud_scheduler_job" "crons" {
  for_each    = local.crons
  name        = "casbah-${replace(each.key, "_", "-")}"
  description = each.value.description
  schedule    = each.value.schedule
  time_zone   = "Europe/Paris"
  region      = var.region

  retry_config {
    retry_count = 2
  }

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.api.uri}${each.value.path}"
    headers = {
      "x-cron-secret" = data.google_secret_manager_secret_version.cron_secret.secret_data
      "Content-Type"  = "application/json"
    }
    body = base64encode("{}")
  }

  depends_on = [
    google_project_service.apis["cloudscheduler.googleapis.com"],
    google_cloud_run_v2_service.api,
  ]
}
