# Firestore (mode natif). Les règles et index sont dans firestore.rules / firestore.indexes.json à la racine :
#   firebase deploy --only firestore:rules,firestore:indexes --project <project_id>
resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  # Protection contre la suppression accidentelle + récupération à un instant donné
  delete_protection_state           = "DELETE_PROTECTION_ENABLED"
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_ENABLED"

  depends_on = [google_project_service.apis["firestore.googleapis.com"]]
}

# Index composites (miroir de firestore.indexes.json, pour que `terraform apply` suffise)
locals {
  indexes = {
    reservations_status_date_hour = { collection = "reservations", fields = ["status", "date", "hour"] }
    reservations_date_hour        = { collection = "reservations", fields = ["date", "hour"] }
    reservations_dup              = { collection = "reservations", fields = ["customer.phone", "date", "hour", "status"] }
    notifications_res_created     = { collection = "notifications", fields = ["reservationId", "createdAt"] }
    notifications_status_attempts = { collection = "notifications", fields = ["status", "attempts"] }
    slots_espace_date             = { collection = "slots", fields = ["espace", "date"] }
  }
}

resource "google_firestore_index" "composite" {
  for_each   = local.indexes
  project    = var.project_id
  database   = google_firestore_database.default.name
  collection = each.value.collection

  dynamic "fields" {
    for_each = each.value.fields
    content {
      field_path = fields.value
      order      = "ASCENDING"
    }
  }
}
