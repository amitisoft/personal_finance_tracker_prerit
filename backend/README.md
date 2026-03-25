# Personal Finance Service

Spring Boot backend for the Personal Finance Tracker specification.

## Features

- JWT authentication with refresh tokens and password reset flow
- Accounts, categories, transactions, budgets, goals, recurring transactions
- Dashboard and report APIs
- PostgreSQL + Flyway migrations
- CSV export and recurring scheduler

## Local setup with Podman

```powershell
podman compose up -d
.\mvnw.cmd spring-boot:run
```

On Unix-like shells:

```bash
podman compose up -d
./mvnw spring-boot:run
```

If Podman is unavailable, point the app at any reachable PostgreSQL instance with environment variables.

## Tests with Podman

- The default `test` profile is a fast in-memory smoke profile so `.\mvnw.cmd test` can run without containers.
- For PostgreSQL-backed integration runs, use the `integration` profile.
- `.testcontainers.properties` disables Ryuk for Podman-friendly local runs.
- If your Podman socket is not exposed through the default Docker-compatible endpoint, set the usual Testcontainers environment variables before running `.\mvnw.cmd -Dspring.profiles.active=integration test`.

## Configuration

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `APP_SECURITY_JWT_SECRET`

## API docs

- Swagger UI: `/swagger-ui/index.html`
- OpenAPI JSON: `/v3/api-docs`
