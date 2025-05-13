terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "2.36.0"
    }
  }
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "minikube"
}

module "user_service_postgres_db" {
  source                = "./modules/postgresql"
  instance_name         = var.user_service_pg_instance_name
  k8s_namespace         = var.default_namespace
  postgres_db_name      = var.user_service_pg_db_name
  postgres_user         = var.user_service_pg_user
  postgres_password_b64 = var.user_service_pg_password_b64
  pvc_storage_size      = var.user_service_pg_pvc_storage_size

  app_labels = {
    "app.kyubernetes.io/part-of" = "user-service"
    "environment"                = var.environment
  }
}
