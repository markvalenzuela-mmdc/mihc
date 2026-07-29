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

See [Containerized Infrastructure](../docs/containerized-infrastructure.md) for full documentation.

## Next.js startup database release

The production Next.js container applies committed Drizzle migrations and runs
the idempotent production bootstrap before starting the Next.js server. If
migration or bootstrap fails, the server does not start and Docker retries the
container according to its restart policy.

`DATABASE_RESET=false` preserves application data while applying pending
migrations and production bootstrap data. `DATABASE_RESET=true` drops the
application `public` and `drizzle` schemas on every Next.js container startup,
then reapplies all migrations and production bootstrap data. The reset affects
only the application PostgreSQL schemas and does not erase Inngest PostgreSQL,
Redis, or pgAdmin volumes.

Immediately after the intended reset, change `DATABASE_RESET` back to `false`
and recreate or redeploy Next.js. Editing an environment file does not alter an
existing container, so `docker restart` and `docker compose start` do not
reread the file; restarting without recreating while the container still has
`DATABASE_RESET=true` repeats the deletion. For the build or deploy stack, run
the matching command:

```bash
docker compose --env-file docker/.env.build -f docker/compose.build.yml up -d --force-recreate nextjs
docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml up -d --force-recreate nextjs
```

In Coolify, set `DATABASE_RESET=false` in the application environment and
redeploy the Next.js service so Coolify creates a container with the updated
value. A Coolify restart alone keeps the existing container environment and is
not sufficient.

Production bootstrap creates or validates the configured maintainer, upserts
the four Smoke Testing apps, never resets an existing password, and never loads
development fixtures. For manual development workflows, use `just db migrate`
to apply migrations, `just db seed` to load complete development fixtures, and
`just db release` to run the same production migrate/bootstrap sequence. Never
run `just db reset` against production.
The entrypoint removes `PROD_MAINTAINER_PASSWORD` before starting the
long-running Next.js server.

From the repository root, use `just docker local up` and
`just docker local down` for the normal local lifecycle. The complete
namespaced Docker command surface is documented in [`../README.md`](../README.md);
direct Compose commands remain available for lower-level inspection and
maintenance.
