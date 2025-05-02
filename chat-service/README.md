# MeetNote Chat Service

This is the real-time chat microservice for the MeetNote platform, handling direct messaging capabilities via REST API and WebSocket.

## Features

- Real-time direct messaging using WebSockets (`ws` library).
- REST API for managing conversations and messages.
- JWT-based authenticatin for API and WebSockets.
- PostgresSQL database with Drizzle ORM for data persistence.
- Unit and Integration tests using Jest and Supertest.
- Dockerized for production deployment.

## Prerequisites

- Node.js: \*\* v20.x or higher recommended (check `package.json` engines).
- PNPM (v10 or higher recommended)
- Docker & Docker Compose (optional, for running PostgreSQL easily)
- A running PostgreSQL instance

## Docker Deployment

1. **Build the Docker image**

```bash
docker build -t {username}/meetnote-chat-service:latest .
```

2. **Run the Docker Container**

```bash
docker run \
  --rm \
  -p 3001:3001 \
  -e NODE_ENV="production" \
  -e PORT="3001" \
  -e DATABASE_URL="postgresql://user:prod_password@db_host:5432/meetnote_prod_db?sslmode=require" \
  -e JWT_SECRET="you_string_production_secret_here"
  -e LOG_LEVEL="info" \
  --name meetnote-chat-container
  {username}/meetnote-chat-service:latest
```

- Replace placeholder values for `DATABASE_URL` and `JWT_SECRET` with your actual production credentials.
- Use `--env-file` `.env.prod` (if you creaet a production env file) instead of multipe `-e` flags for cleaner command line

## Environment Setup

1.  **Copy Environment File:** Create a `.env` file from the example:
    ```bash
    cp .env.example .env
    ```
2.  **Edit `.env`:** Open the `.env` file and fill in the required values:

    - `PORT`: The port the service will run on (default: `3001`).
    - `DATABASE_URL`: Your PostgreSQL connection string (e.g., `postgresql://user:password@host:port/database_name?sslmode=disable`). **Ensure the database exists.**
    - `JWT_SECRET`: A strong, **secret** key for signing JWTs (at least 32 characters long). Generate one using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    - `LOG_LEVEL`: (Optional) Set logging level (e.g., `info`, `debug`, `trace`).
    - `NODE_ENV`: Set to `development` for local development.

3.  **(Testing)** Copy the example test environment file:
    ```bash
    cp .env.example .env.test
    ```
4.  **Edit `.env.test`:** Set `NODE_ENV=test` and configure a **separate** `DATABASE_URL` pointing to a dedicated test database. Use the same or a different `JWT_SECRET`.

## Installation

Install project dependencies using pnpm:

```bash
pnpm install --frozen-lockfile
```

## Database Setup

1. **Ensure PostgreSQL is running** and the database specified in .env and .env.test exits.
2. **Generate Migrations(If schema changed)**: If you modify the schema in src/schema.ts generate a new migratin file:

```bash
pnpm run db:generate
```

3. **Apply Migratinos**:

- For **Development** Database (uses `.env`):

```bash
pnpm run db:generate
```

- For **Test** database use (`.env.test`):

```bash
pnpm run db:prepare:test
```

## Running Locally (Development)

Start the development server with hot-reloading:

```bash
pnpm run dev
```

The server will typically run on `http://localhost:3001` (or the `PORT` specified in `.env`.)

## Running Tests

Run all unit and integration tests (ensure test DB schema is migrated first):

```bash
pnpm run test
```

Run tests in watch mode

```bash
pnpm run test:watch
```

Genearte a coverage report:

```bash
pnpm run test:coverage
```

View the report in the `coverage/lcov-report/index.html` file

## Building for Production

Compile the Typescript cod ein Javascript in the `dist` directory:

```bash
pnpm run build
```
