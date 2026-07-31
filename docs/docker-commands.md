# Docker Commands

## Local and build workflows

`just docker local [up|down]` starts or stops local infrastructure: application PostgreSQL, PgDog on port `6432`, Inngest and its PostgreSQL/Redis dependencies, and local-only pgAdmin on port `5050`. It uses `docker/compose.local.yml` and does not start application containers.

```bash
just docker local up
just docker local down
```

`just docker build [force]` builds application images and starts the production-image test stack using `docker/compose.build.yml` and `docker/.env.build`; `force` disables the build cache. `just docker down` stops the shared local/build Docker project.

## Production deployment

Production has four independent Compose stacks. `just docker deploy` is the ordered convenience command: PgDog/PostgreSQL, then Inngest, then Next.js and Playwright. On a first deployment, inspect foundational health before applications rather than treating the convenience command as proof.

```bash
just docker deploy-foundations

docker compose --env-file docker/services/pgdog-postgres/.env \
  -f docker/services/pgdog-postgres/compose.deploy.yml ps
docker compose --env-file docker/services/inngest/.env \
  -f docker/services/inngest/compose.deploy.yml ps

just docker deploy-apps
```

The direct equivalents are:

```bash
docker compose --env-file docker/services/pgdog-postgres/.env \
  -f docker/services/pgdog-postgres/compose.deploy.yml up -d
docker compose --env-file docker/services/inngest/.env \
  -f docker/services/inngest/compose.deploy.yml up -d
docker compose --env-file docker/services/nextjs/.env \
  -f docker/services/nextjs/compose.deploy.yml up -d
docker compose --env-file docker/services/playwright/.env \
  -f docker/services/playwright/compose.deploy.yml up -d
```

PgDog/PostgreSQL creates `mihc-network`; Inngest, Next.js, and Playwright use that literal network as external and fail until it exists. Do not create it manually. PgDog's restricted `6432:6432` is the sole fixed host publication in the supplied production models. The other services use `expose`; a proxy or platform must join or route to `mihc-network` to reach Next.js port `3000`.

Stop production in reverse dependency order:

```bash
just docker deploy-down
```

The equivalent direct commands stop Playwright, Next.js, Inngest, then PgDog/PostgreSQL using their matching `--env-file` and `compose.deploy.yml`. Never append `-v`; deployment volumes contain production data.

## Production configuration and maintenance

Before deployment, copy each production service `.env.example` to its ignored `.env`, and copy PgDog `users.toml.example` to the ignored `users.toml`. Validate each resource independently with its matching `--env-file` and `config --quiet`.

For updates, backups, rollbacks, and destructive reset safeguards, follow [`../docker/DEPLOYMENT.md`](../docker/DEPLOYMENT.md). Backup is required before each application recreate, Next.js and Playwright pull/recreate through separate Compose files, and an image rollback never reverses a database migration.

## Environment boundaries

`nextjs/.env` is for host-local development and uses `localhost:6432`. `docker/.env.build` is for the containerized build stack and uses Docker DNS. Production environment files are service-owned:

| Service | Production environment file |
|---|---|
| PgDog/PostgreSQL | `docker/services/pgdog-postgres/.env` |
| Inngest | `docker/services/inngest/.env` |
| Next.js | `docker/services/nextjs/.env` |
| Playwright | `docker/services/playwright/.env` |

Values shared by application services must match the infrastructure values. Production does not use pgAdmin; its environment and port descriptions in this document apply only to local development.
