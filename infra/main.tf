# Infra La Casbah — repris de ~/flow/infra (Cloud Run + Secret Manager + Scheduler + Firestore).
# Pas de Cloud Run web : le site statique est sur GitHub Pages.
#
# Première fois :
#   gcloud auth application-default login
#   gsutil mb -l europe-west1 gs://casbah-terraform-state
#   cp terraform.tfvars.example terraform.tfvars   # puis renseigner
#   terraform init && terraform apply

terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    bucket = "casbah-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  apis = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "firestore.googleapis.com",
    "identitytoolkit.googleapis.com", # Firebase Auth
    "cloudscheduler.googleapis.com",
    "iamcredentials.googleapis.com", # Workload Identity Federation (GitHub Actions)
    "sts.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  service            = each.value
  disable_on_destroy = false
}

# ── Artifact Registry (images Docker) ─────────────────────────────
resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "casbah"
  format        = "DOCKER"

  cleanup_policies {
    id     = "garder-10-dernieres"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }
  cleanup_policies {
    id     = "supprimer-le-reste"
    action = "DELETE"
    condition {
      older_than = "2592000s" # 30 jours
    }
  }

  depends_on = [google_project_service.apis["artifactregistry.googleapis.com"]]
}
