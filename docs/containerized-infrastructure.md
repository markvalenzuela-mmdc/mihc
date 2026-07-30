# Containerized Infrastructure

## Overview

This setup provides local development and Coolify-ready infrastructure for:

- App PostgreSQL reached through PgDog
- Inngest with its own PostgreSQL database and Redis
- pgAdmin
- Next.js and Playwright application services

The production Next.js container applies committed Drizzle migrations and runs
the idempotent production bootstrap before starting the Next.js server. If
migration or bootstrap fails, the server does not start and Docker retries the
container according to its restart policy.

Production bootstrap creates or validates the configured maintainer, upserts
the four Smoke Testing apps and eight E2E workflow step definitions, never
resets an existing password, and never loads development fixtures such as
profiles or run history.

## Compose files

- `docker/compose.local.yml` ΓÇö local development entrypoint that includes service-owned Compose files
- `docker/services/pgdog-postgres/compose.yml` ΓÇö app PostgreSQL and PgDog
- `docker/services/inngest/compose.yml` ΓÇö Inngest, Inngest PostgreSQL, and Inngest Redis
- `docker/services/pgadmin/compose.yml` ΓÇö pgAdmin
- `docker/services/nextjs/compose.yml` ΓÇö published Next.js deployment service
- `docker/services/playwright/compose.yml` ΓÇö published Playwright/Hono deployment service
- `docker/compose.build.yml` ΓÇö build entrypoint that builds the Next.js and Playwright images
- `docker/compose.deploy.yml` ΓÇö include-only deployment entrypoint

Both Compose entrypoints include the same service-owned infrastructure files.
The build stack uses `docker/.env.build` for its application containers. Every
service included by the deploy stack reads its own ignored service-local
`.env` file.

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
docker compose -f docker/compose.deploy.yml up -d --force-recreate nextjs
```

In Coolify, set `DATABASE_RESET=false` in the application environment and
redeploy the Next.js service so Coolify creates a container with the updated
value. A Coolify restart alone keeps the existing container environment and is
not sufficient.

## Local services

| Service | URL / Port |
|---|---|
| PgDog app database proxy | `localhost:6432` |
| pgAdmin | `http://localhost:5050` |
| Inngest | dynamic host port mapped to container port `8288` |
| Inngest PostgreSQL | dynamic host port mapped to container port `5432` |
| Inngest Redis | dynamic host port mapped to container port `6379` |

## Databases

Local development uses separate PostgreSQL services:

- `app-postgres` ΓÇö application database, reached from the host through PgDog on `localhost:6432`
- `inngest-postgres` ΓÇö dedicated Inngest database, reached by the `inngest` service inside Docker
- The app PostgreSQL service can host both the main app database and a separate test database. PgDog is configured to route `mihc`, `mihc-test`, and the maintenance database `postgres` to the same `app-postgres` service.

PgDog reads its config from `docker/services/pgdog-postgres/files/`.
The deploy stack uses the same PgDog boundary as local and build Compose. Keep
the `users.toml` credentials aligned with the PgDog service `.env` values and
the deploy `DATABASE_URL`.

## Local Commands

If a service-local `.env` file is missing, copy the matching `.env.example` in that service folder and fill in local values.

From the repository root, validate local compose:

```bash
docker compose -f docker/compose.local.yml config
```

Start local infrastructure:

```bash
just docker local up
```

Stop local infrastructure:

```bash
just docker local down
```

`just docker local` defaults to `up`.

For the production-like build stack, use `just docker build`. To reset its
application schemas, set `DATABASE_RESET=true` in `docker/.env.build` before
starting the Next.js container, then set it back to `false` after the intended
reset.

Destroy volumes (resets all data):

```bash
docker compose -f docker/compose.local.yml down -v
```

## pgAdmin

Open pgAdmin at:

```text
http://localhost:5050
```

Log in with the values from:

```text
docker/services/pgadmin/.env
```

## Connect to PgDog with a database URL

Use the PgDog host port when connecting from the host machine:

```text
postgresql://<username>:<password>@localhost:6432/mihc?sslmode=disable
```

Use the username and password from:

```text
docker/services/pgdog-postgres/.env
```

The Next.js app should use this same host-facing PgDog URL in `nextjs/.env`.

Use the same username and password with the test database name for integration tests:

```text
postgresql://<username>:<password>@localhost:6432/mihc-test?sslmode=disable
```

From `nextjs/`, create, migrate, and seed the test database with:

```bash
pnpm db:test:setup
```

This command reads `TEST_DATABASE_URL`, refuses to run if it matches `DATABASE_URL`, resets only the test database schemas, runs Drizzle migrations, and seeds the existing fixture data.

Restart the local PgDog service after changing database routes or user database access:

```bash
docker compose -f docker/compose.local.yml restart app-pgdog
```

PgDog `v0.1.26` expects one `[[users]]` entry per database, so list the same username once for `mihc`, once for `mihc-test`, and once for `postgres`.

## Register PgDog in pgAdmin

In pgAdmin:

1. Right click `Servers`.
2. Select `Register`.
3. Select `Server`.
4. Name it `MIHC` or any name you prefer.
5. Go to the `Connection` tab.
6. Enter:

| Field | Value |
|---|---|
| Host name/address | `app-pgdog` |
| Port | `6432` |
| Maintenance database | `mihc` |
| Username | `APP_POSTGRES_USER` from `docker/services/pgdog-postgres/.env` |
| Password | `APP_POSTGRES_PASSWORD` from `docker/services/pgdog-postgres/.env` |

Use `app-pgdog`, not `localhost`, because pgAdmin runs inside Docker. Inside the Compose network, services connect to each other by service name.

## Register Inngest PostgreSQL in pgAdmin

In pgAdmin:

1. Right click `Servers`.
2. Select `Register`.
3. Select `Server`.
4. Name it `Inngest` or any name you prefer.
5. Go to the `Connection` tab.
6. Enter:

| Field | Value |
|---|---|
| Host name/address | `inngest-postgres` |
| Port | `5432` |
| Maintenance database | `inngest` |
| Username | `INNGEST_POSTGRES_USER` from `docker/services/inngest/.env` |
| Password | `INNGEST_POSTGRES_PASSWORD` from `docker/services/inngest/.env` |

Use `inngest-postgres`, not `localhost`, because pgAdmin runs inside Docker. Inside the Compose network, services connect to each other by service name.

## Deploy vs Local Differences

| Aspect | Local | Deploy |
|---|---|---|
| Credentials | Service-local `.env` files | Service-local `.env` files for every included service |
| Application database | PgDog (port 6432) | PgDog (internal port 6432) |
| Inngest databases | Dedicated inngest-postgres + inngest-redis | Dedicated inngest-postgres + inngest-redis |
| pgAdmin mode | Desktop mode | Desktop mode; master-password requirement disabled |
| Port exposure | PgDog and pgAdmin have fixed local ports; Inngest dependencies use dynamic host ports | Deployment-specific |
| Service layout | Included service-owned Compose files with locally built app images | The same service layout with published app images |

The deploy stack also runs pgAdmin in desktop mode with its master-password
requirement disabled. Do not expose pgAdmin publicly; restrict port 5050 to a
private network or trusted operator access.

## Smoke Testing live updates

Smoke Testing uses PostgreSQL `LISTEN`/`NOTIFY` to invalidate database-backed
UI state over a Next.js SSE route. Local development reaches PostgreSQL through
PgDog, where pub/sub must remain enabled with
`pub_sub_channel_size = 4096`. Deployment uses the same PgDog path.

The SSE route sends a heartbeat every 20 seconds. A deployment proxy must pass
`text/event-stream` responses without buffering and must allow idle connections
longer than the heartbeat interval.

## Production deployment

The authoritative production runbook is
[`../docker/DEPLOYMENT.md`](../docker/DEPLOYMENT.md). It covers the
GitHub-Actions-to-GHCR delivery flow, repository provisioning, every
environment and configuration file, reverse-proxy exposure, Coolify, Dokploy,
database release, backups, retries, rollback, recovery, and first-deploy
verification.

This document remains the source for local infrastructure topology, database
access, pgAdmin registration, and service relationships.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Local PgDog cannot load config | Wrong bind mount path or missing local `users.toml` | Check `docker/services/pgdog-postgres/files/` |
| Local pgAdmin cannot connect to PgDog | Host set to `localhost` inside pgAdmin | Use `app-pgdog` as the host |
| Local app cannot connect to database | `DATABASE_URL` is not using PgDog host port | Use `localhost:6432` from the host |
| Port conflict on 5050 or 6432 | Another local service uses the same port | Stop the other service or change the host port |
