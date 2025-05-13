output "service_name" {
  description = "The Kubernetes Service name for this PostgreSQL instance."
  value       = kubernetes_service.db_svc.metadata[0].name
}

output "service_cluster_ip" {
  description = "The ClusterIP of the PostgreSQL service."
  value       = kubernetes_service.db_svc.spec[0].cluster_ip
}

output "service_port" {
  description = "The port number the PostgreSQL service is exposed on."
  value       = kubernetes_service.db_svc.spec[0].port[0].port
}

output "secret_name" {
  description = "The name of the Kubernetes Secret containing the database credentials."
  value       = kubernetes_secret.db_secret.metadata[0].name
}

output "deployment_name" {
  description = "The name of the Kubernetes Deployment for PostgreSQL."
  value       = kubernetes_deployment.db_deployment.metadata[0].name
}

output "pvc_name" {
  description = "The name of the Kubernetes PersistentVolumeClaim for PostgreSQL."
  value       = kubernetes_persistent_volume_claim.db_pvc.metadata[0].name
}
