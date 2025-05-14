import { config } from "./index";

console.log("NODE_ENV:", config.NODE_ENV);
console.log("PostgreSQL User:", config.POSTGRES_USER);
console.log(
  "PostgreSQL Port:",
  config.POSTGRES_PORT,
  typeof config.POSTGRES_PORT
);
console.log("MinIO Bucket:", config.MINIO_BUCKET_NAME);
console.log("API Port:", config.API_PORT, typeof config.API_PORT);
console.log("Database URL:", config.DATABASE_URL);

// Test a missing required variable (uncomment to test validation failure)
// delete process.env.POSTGRES_USER;
// import './index'; // This would re-run and fail
