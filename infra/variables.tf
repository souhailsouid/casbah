variable "project_id" {
  description = "ID du projet GCP (ex. casbah-prod)"
  type        = string
}

variable "region" {
  description = "Région GCP"
  type        = string
  default     = "europe-west1"
}

variable "web_url" {
  description = "Origine(s) du site, séparées par des virgules (CORS + liens dans les messages)"
  type        = string
  default     = "https://souhailsouid.github.io"
}

variable "web_base_path" {
  description = "Sous-chemin du site (GitHub Pages : /casbah ; vide avec un domaine dédié)"
  type        = string
  default     = "/casbah"
}

variable "email_from" {
  description = "Expéditeur des e-mails (domaine vérifié chez Resend)"
  type        = string
  default     = "La Casbah <reservations@example.com>"
}

variable "github_repo" {
  description = "Dépôt GitHub autorisé à déployer (owner/repo)"
  type        = string
  default     = "souhailsouid/casbah"
}

variable "domain_api" {
  description = "Domaine personnalisé de l'API (optionnel, ex. api.lacasbah.fr)"
  type        = string
  default     = ""
}
