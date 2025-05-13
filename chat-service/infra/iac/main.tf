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

resource "kubernetes_secret" "postgres-secret" {
  metadata {
    name = "postgres-secret"
  }
  type = "Opaque"
  data = {
    "postgres-password" : "YzM5ZmFjN2YtM2VlYi00NjlmLTk0NmMtYTNlOTQ3ODA5Njc3"
  }
}
