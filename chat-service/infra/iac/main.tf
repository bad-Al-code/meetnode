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

resource "kubernetes_persistent_volume_claim" "postgres_pvc" {
  metadata {
    name = "postgres-pvc"
  }
  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        "storage" = "1Gi"
      }
    }

    storage_class_name = "standard"
  }
}

resource "kubernetes_deployment" "postgres_deployment" {
  metadata {
    name = "postgres-deployment"
  }
  spec {
    replicas = 1
    selector {
      match_labels = {
        app = "postgres"
      }
    }
    template {
      metadata {
        labels = {
          app = "postgres"
        }
      }
      spec {
        container {
          name              = "postgres"
          image             = "postgres:16.8-alpine3.20"
          image_pull_policy = "IfNotPresent"

          port {
            container_port = 5432
          }

          env {
            name  = "POSTGRES_DB"
            value = "meetnote_chat_k8s"
          }

          env {
            name  = "POSTGRES_USER"
            value = "meetnote_user"
          }


          env {
            name = "POSTGRES_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.postgres-secret.metadata[0].name
                key  = "postgres-password"
              }
            }
          }

          volume_mount {
            name       = "postgres-storage"
            mount_path = "/var/lib/postgresql/data"
          }
        }
      }
    }
  }
}
