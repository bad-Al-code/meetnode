variable "kubernetes_config_path" {
  description = "Path to the kubeconfig file."
  type        = string
  default     = "~/.kube/config"
}

variable "kubernetes_config_context" {
  description = "Context to use from the kubeconfig file."
  type        = string
  default     = "minikube"
}

variable "default_namespace" {
  description = "Default Kubernetes namespace for deployments."
  type        = string
  default     = "default"
}

variable "environment" {
  description = "The deployment environment (e.g., dev, staging, prod)."
  type        = string
  default     = "development"
}

variable "user_service_pg_instance_name" {
  description = "Instance name for the User Service PostgreSQL (used for Kubernetes resource naming)."
  type        = string
  default     = "user-service-db"
}

variable "user_service_pg_db_name" {
  description = "Database name inside the User Service PostgreSQL."
  type        = string
  default     = "user_data_db"
}

variable "user_service_pg_user" {
  description = "Username for the User Service PostgreSQL."
  type        = string
  default     = "useradmin"
}

variable "user_service_pg_password_b64" {
  description = "Base64 encoded password for the User Service PostgreSQL. For production, use a secure method."
  type        = string
  sensitive   = true
  default     = "MzcwYjg2NmEtODEwMC00ZDdhLTk0ODctNzY3ZDI4NWQ4ZGUw"
}

variable "user_service_pg_pvc_storage_size" {
  description = "Storage size for the User Service PostgreSQL PVC."
  type        = string
  default     = "1Gi"
}
