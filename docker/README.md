# Docker

This directory contains Docker Compose files and configurations for containerizing the infrastructure, Playwright test suite, and Next.js app.

## Infrastructure

- `compose.local.yml` ΓÇö Local development entrypoint that includes service-owned Compose files
- `services/pgdog-postgres/` ΓÇö App PostgreSQL and PgDog proxy
- `services/inngest/` ΓÇö Inngest, its PostgreSQL database, and Redis
- `services/pgadmin/` ΓÇö pgAdmin
- `compose.deploy.yml` ΓÇö Deploy entrypoint that uses the published Next.js and Playwright images with the same included infrastructure services

Each service folder owns its shared `compose.yml`, `.env.example`, and ignored
`.env` file. The build and deploy entrypoints use those same infrastructure
files; `.env.build` and `.env.deploy` provide application-container values.

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
