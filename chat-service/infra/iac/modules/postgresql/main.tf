locals {
  common_labels = merge(var.app_labels, {
    "app.kubernetes.io/name"       = var.instance_name
    "app.kubernetes.io/instance"   = var.instance_name
    "app.kubernetes.io/managed-by" = "terraform"
    "app.kubernetes.io/component"  = "database"
    "app.kubernetes.io/part-of"    = lookup(var.app_labels, "service", "unknown-service")
  })
}

resource "kubernetes_secret" "db_secret" {
  metadata {
    name      = "${var.instance_name}-secret"
    namespace = var.k8s_namespace
    labels    = local.common_labels
  }

  type = "Opaque"
  data = {
    "postgres-password" = var.postgres_password_b64
  }
}

resource "kubernetes_persistent_volume_claim" "db_pvc" {
  metadata {
    name      = "${var.instance_name}-pvc"
    namespace = var.k8s_namespace
    labels    = local.common_labels
  }
  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        "storage" = var.pvc_storage_size
      }
    }
    storage_class_name = var.pvc_storage_class_name
  }
}

resource "kubernetes_deployment" "db_deployment" {
  metadata {
    name      = "${var.instance_name}-deployment"
    namespace = var.k8s_namespace
    labels    = local.common_labels
  }
  spec {
    replicas = var.replicas
    selector {
      match_labels = {
        "app.kubernetes.io/name"     = var.instance_name
        "app.kubernetes.io/instance" = var.instance_name
      }
    }

    template {
      metadata {
        labels = local.common_labels
      }

      spec {
        container {
          name              = "postgres"
          image             = var.postgres_image
          image_pull_policy = "IfNotPresent"

          port {
            container_port = 5432
            name           = "tcp-postgres"
          }

          env {
            name  = "POSTGRES_DB"
            value = var.postgres_db_name
          }

          env {
            name  = "POSTGRES_USER"
            value = var.postgres_user
          }

          env {
            name = "POSTGRES_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_secret.metadata[0].name
                key  = "postgres-password"
              }
            }
          }
          env {
            name  = "PGDATA"
            value = "/var/lib/postgresql/data/pgdata"
          }

          resources {
            requests = {
              cpu    = var.resource_requests_cpu
              memory = var.resource_requests_memory
            }
            limits = {
              cpu    = var.resource_limits_cpu
              memory = var.resource_limits_memory
            }
          }

          volume_mount {
            name       = "postgres-storage"
            mount_path = "/var/lib/postgresql/data"

            sub_path = "pgdata"
          }

          liveness_probe {
            tcp_socket {
              port = "tcp-postgres"
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }
          readiness_probe {
            exec {
              command = ["pg_isready", "-U", var.postgres_user, "-d", var.postgres_db_name, "-h", "127.0.0.1", "-p", "5432"]
            }
            initial_delay_seconds = 5
            period_seconds        = 10
          }
        }

        volume {
          name = "postgres-storage"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.db_pvc.metadata[0].name
          }
        }
      }
    }
  }
}


resource "kubernetes_service" "db_svc" {
  metadata {
    name      = "${var.instance_name}-svc"
    namespace = var.k8s_namespace
    labels    = local.common_labels
  }
  spec {
    selector = {
      "app.kubernetes.io/name"     = var.instance_name
      "app.kubernetes.io/instance" = var.instance_name
    }
    port {
      protocol    = "TCP"
      port        = 5432
      target_port = "tcp-postgres"
    }
    type = "ClusterIP"
  }
}
