# Secret Manager — toute la configuration sensible. Les VALEURS sont saisies à la main :
#   echo -n "xxx" | gcloud secrets versions add RESEND_API_KEY --data-file=-
locals {
  secrets = [
    "RESEND_API_KEY",
    "RESEND_WEBHOOK_SECRET",
    "WHATSAPP_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_APP_SECRET",
    "WHATSAPP_VERIFY_TOKEN",
    "CRON_SECRET",
    "CANCEL_TOKEN_SECRET",
  ]
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = toset(local.secrets)
  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

# ── Service account de l'API (Cloud Run) ─────────────────────────
# Pas de clé Firebase : l'API utilise l'identité du service (applicationDefault) pour Firestore et Auth.
resource "google_service_account" "api" {
  account_id   = "casbah-api"
  display_name = "La Casbah — API Cloud Run"
}

resource "google_secret_manager_secret_iam_member" "api_access" {
  for_each  = toset(local.secrets)
  secret_id = google_secret_manager_secret.secrets[each.value].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.api.email}"
}

# Vérification des ID tokens + gestion des utilisateurs (scripts create-admin)
resource "google_project_iam_member" "api_firebase_auth" {
  project = var.project_id
  role    = "roles/firebaseauth.admin"
  member  = "serviceAccount:${google_service_account.api.email}"
}
