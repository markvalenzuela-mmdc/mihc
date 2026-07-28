# Docker

This directory contains Docker Compose files and configurations for containerizing the infrastructure, Playwright test suite, and Next.js app.

## Infrastructure

- `compose.local.yml` ΓÇö Local development entrypoint that includes service-owned Compose files
- `services/pgdog-postgres/` ΓÇö App PostgreSQL and PgDog proxy
- `services/inngest/` ΓÇö Inngest, its PostgreSQL database, and Redis
- `services/pgadmin/` ΓÇö pgAdmin
- `compose.deploy.yml` ΓÇö Deploy entrypoint that includes shared service Compose files plus the deploy-only `db-release`, Next.js, and Playwright services

Each service folder owns its shared `compose.yml`, `.env.example`, and local
`.env` file. `compose.deploy.yml` defines the deploy-only release and
application services.

See [Containerized Infrastructure](../docs/containerized-infrastructure.md) for full documentation.

## Database release

Deploy and production-image Compose stacks run `db-release` once before
Next.js and Playwright. The service validates production configuration, applies
committed Drizzle migrations, and idempotently bootstraps the configured
maintainer plus the Smoke Testing app catalog. Application services start only
after the release container exits successfully. The deploy stack requires one
immutable `MIHC_IMAGE_TAG` (`sha-` plus a full Git commit SHA) for both the
Next.js and database-release images, so the two targets cannot drift between
releases. PgDog enables lock-aware query parsing so the release container can
hold one session advisory lock safely across migrations and bootstrap.

From the repository root, use `just docker local up` and
`just docker local down` for the normal local lifecycle. The complete
namespaced Docker command surface is documented in [`../README.md`](../README.md);
direct Compose commands remain available for lower-level inspection and
maintenance.
