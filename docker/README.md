# Docker

This directory contains Docker Compose files and configurations for containerizing the infrastructure, Playwright test suite, and Next.js app.

## Infrastructure

- `compose.local.yml` ΓÇö Local development entrypoint that includes service-owned Compose files
- `services/pgdog-postgres/` ΓÇö App PostgreSQL and PgDog proxy
- `services/inngest/` ΓÇö Inngest, its PostgreSQL database, and Redis
- `services/pgadmin/` ΓÇö pgAdmin
- `compose.deploy.yml` ΓÇö Deploy entrypoint that includes deploy-variant Compose files and the Next.js service

Each service folder owns its own `compose.yml` (local), a `compose.deploy.yml` deploy variant (in `pgdog-postgres/`, `inngest/`, `pgadmin/`), `.env.example`, and local `.env` file.

See [Containerized Infrastructure](../docs/containerized-infrastructure.md) for full documentation.
