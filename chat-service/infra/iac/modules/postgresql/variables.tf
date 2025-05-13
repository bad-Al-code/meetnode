variable "instance_name" {
  description = "A unique name for this PostgreSQL instance (e.g., 'user-db', 'chat-db'). Used to prefix Kubernetes resource names."
  type        = string
}

variable "k8s_namespace" {
  description = "The Kubernetes namespace to deploy resources into."
  type        = string
  default     = "default"
}

variable "postgres_db_name" {
  description = "The name of the PostgreSQL database to create inside the instance."
  type        = string
}

variable "postgres_user" {
  description = "The PostgreSQL username for the database."
  type        = string
}

variable "postgres_password_b64" {
  description = "The PostgreSQL password, base64 encoded. For production, consider injecting this from a proper secrets manager."
  type        = string
  sensitive   = true
}

variable "postgres_image" {
  description = "The PostgreSQL Docker image to use."
  type        = string
  default     = "postgres:16.8-alpine3.20"
}

variable "pvc_storage_size" {
  description = "The storage size for the PostgreSQL PVC."
  type        = string
  default     = "1Gi"
}

variable "pvc_storage_class_name" {
  description = "The storage class name for the PVC (e.g., 'standard', 'minikube')."
  type        = string
  default     = "standard"
}

variable "replicas" {
  description = "Number of PostgreSQL replicas ."
  type        = number
  default     = 1
}

variable "resource_requests_cpu" {
  description = "CPU resource requests for the PostgreSQL container."
  type        = string
  default     = "100m"
}

variable "resource_requests_memory" {
  description = "Memory resource requests for the PostgreSQL container (e.g., '256Mi')."
  type        = string
  default     = "256Mi"
}

variable "resource_limits_cpu" {
  description = "CPU resource limits for the PostgreSQL container (e.g., '500m')."
  type        = string
  default     = "500m"
}

variable "resource_limits_memory" {
  description = "Memory resource limits for the PostgreSQL container (e.g., '512Mi')."
  type        = string
  default     = "512Mi"
}

variable "app_labels" {
  description = "A map of additional labels to apply to all resources created by this module."
  type        = map(string)
  default     = {}
}
