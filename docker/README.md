# Docker

This directory contains Docker Compose files and configurations for containerizing the infrastructure, Playwright test suite, and Next.js app.

## Infrastructure

- `compose.local.yml` — Local development entrypoint that includes service-owned Compose files
- `services/pgdog-postgres/` — App PostgreSQL and PgDog proxy
- `services/inngest/` — Inngest, its PostgreSQL database, and Redis
- `services/pgadmin/` — pgAdmin
- `compose.deploy.yml` — Coolify deployment-oriented stack

Each service folder owns its own `compose.yml`, `.env.example`, and local `.env` file.

See [Containerized Infrastructure](../docs/containerized-infrastructure.md) for full documentation.
