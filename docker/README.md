# Docker

This directory contains Docker Compose files and configurations for containerizing the infrastructure, Playwright test suite, and Next.js app.

## Infrastructure

- `compose.local.yml` — Local development stack (PostgreSQL, PgBouncer, Redis, Inngest, pgAdmin)
- `compose.deploy.yml` — Coolify deployment-oriented stack
- `postgres/init/` — PostgreSQL initialization scripts

See [Containerized Infrastructure](../docs/containerized-infrastructure.md) for full documentation.