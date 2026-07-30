# Docker

This directory contains Docker Compose files and configurations for containerizing the infrastructure, Playwright test suite, and Next.js app.

## Infrastructure

- `compose.local.yml` ΓÇö Local development entrypoint that includes service-owned Compose files
- `services/pgdog-postgres/` ΓÇö App PostgreSQL and PgDog proxy
- `services/inngest/` ΓÇö Inngest, its PostgreSQL database, and Redis
- `services/pgadmin/` ΓÇö pgAdmin
- `services/nextjs/` ΓÇö Published Next.js deployment service
- `services/playwright/` ΓÇö Published Playwright/Hono deployment service
- `compose.deploy.yml` ΓÇö Include-only deployment entrypoint for all service-owned Compose files

Each service folder owns its `compose.yml`, `.env.example`, and ignored
`.env` file. The build entrypoint continues to use `.env.build` for its
application containers; the deploy entrypoint reads every service's local
environment through its include.

- [Production Deployment](DEPLOYMENT.md) — authoritative operator runbook
- [Containerized Infrastructure](../docs/containerized-infrastructure.md) —
  local services, database access, and topology details

## Production deployment

GitHub Actions publishes the Next.js and Playwright/Hono images, and
`compose.deploy.yml` deploys those images with the repository-owned
infrastructure services. The Next.js container applies migrations and
production bootstrap data before starting its server; Playwright/Hono starts
independently after its own infrastructure dependencies are healthy.

Follow [`DEPLOYMENT.md`](DEPLOYMENT.md) for configuration, deployment,
verification, reset, backup, rollback, Coolify, and Dokploy procedures.

From the repository root, use `just docker local up` and
`just docker local down` for the normal local lifecycle. The complete
namespaced Docker command surface is documented in [`../README.md`](../README.md);
direct Compose commands remain available for lower-level inspection and
maintenance.
