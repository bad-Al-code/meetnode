output "user_service_postgres_service_name" {
  description = "Kubernetes service name for the User Service PostgreSQL."
  value       = module.user_service_postgres_db.service_name
}

output "user_service_postgres_cluster_ip" {
  description = "Cluster IP for the User Service PostgreSQL."
  value       = module.user_service_postgres_db.service_cluster_ip
}

output "user_service_postgres_service_port" {
  description = "Port for the User Service PostgreSQL service."
  value       = module.user_service_postgres_db.service_port
}

output "user_service_postgres_secret_name" {
  description = "Name of the Kubernetes secret for User Service PostgreSQL credentials."
  value       = module.user_service_postgres_db.secret_name
}

output "user_service_postgres_deployment_name" {
  description = "Name of the Kubernetes deployment for User Service PostgreSQL."
  value       = module.user_service_postgres_db.deployment_name
}
