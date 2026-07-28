# Containerized Infrastructure

## Overview

This setup provides local development and Coolify-ready infrastructure for:

- App PostgreSQL with a PgDog proxy
- Inngest with its own PostgreSQL database and Redis
- pgAdmin
- Next.js and Playwright application services

The production Next.js container applies committed Drizzle migrations and runs
the idempotent production bootstrap before starting the Next.js server. If
migration or bootstrap fails, the server does not start and Docker retries the
container according to its restart policy.

Production bootstrap creates or validates the configured maintainer, upserts
the four Smoke Testing apps, never resets an existing password, and never loads
development fixtures.

## Compose files

- `docker/compose.local.yml` ΓÇö local development entrypoint that includes service-owned Compose files
- `docker/services/pgdog-postgres/compose.yml` ΓÇö app PostgreSQL and PgDog
- `docker/services/inngest/compose.yml` ΓÇö Inngest, Inngest PostgreSQL, and Inngest Redis
- `docker/services/pgadmin/compose.yml` ΓÇö pgAdmin
- `docker/compose.deploy.yml` ΓÇö deploy entrypoint that includes service Compose files plus Next.js and Playwright

Each service folder owns its own `.env.example` and local `.env` file. Local `.env` files are ignored by git.

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
| Credentials | Service-local `.env` files | Supplied via env secrets |
| Connection pool | PgDog (port 6432) | PgDog (internal) |
| Inngest databases | Dedicated inngest-postgres + inngest-redis | Shared postgres + redis services |
| pgAdmin mode | Desktop mode | Desktop mode; master-password requirement disabled |
| Port exposure | PgDog and pgAdmin have fixed local ports; Inngest dependencies use dynamic host ports | Deployment-specific |
| Service layout | Included service-owned Compose files | Included service-owned Compose files plus Next.js and Playwright |

The deploy stack also runs pgAdmin in desktop mode with its master-password
requirement disabled. Do not expose pgAdmin publicly; restrict port 5050 to a
private network or trusted operator access.

## Smoke Testing live updates

Smoke Testing uses PostgreSQL `LISTEN`/`NOTIFY` through PgDog to invalidate
database-backed UI state over a Next.js SSE route. PgDog pub/sub must remain
enabled with `pub_sub_channel_size = 4096`.

The SSE route sends a heartbeat every 20 seconds. A deployment proxy must pass
`text/event-stream` responses without buffering and must allow idle connections
longer than the heartbeat interval.

## Production deployment runbook

From the repository root:

1. Copy `docker/.env.deploy.example` to the ignored `docker/.env.deploy`.
2. Replace every example credential with a deployment secret. In particular,
   use the `APP_POSTGRES_PASSWORD` value in `DATABASE_URL` instead of
   `change-me`.
3. Back up the production database.
4. Validate the Compose configuration:

   ```bash
   docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml config --quiet
   ```

5. Deploy the stack:

   ```bash
   docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml up -d
   ```

   `just docker deploy up` is the equivalent normal deployment shortcut and
   loads `docker/.env.deploy` automatically.

6. Inspect the Next.js startup logs:

   ```bash
   docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml logs nextjs
   ```

For manual development workflows, use `just db migrate` to apply migrations,
`just db seed` to load complete development fixtures, and `just db release` to
run the same production migrate/bootstrap sequence. `just db reset` permanently
resets its configured database; never run it against production. Image rollback
does not undo database migrations. Correct schema problems with a new forward
Drizzle migration.

## Coolify Deployment

1. Copy or reference the `docker/compose.deploy.yml` along with its included service files under `docker/services/*/compose.yml` as the compose definition in Coolify.
2. Set the environment variables from `docker/.env.deploy.example` as Coolify environment variables.
3. Generate secrets for `APP_POSTGRES_PASSWORD`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `PGADMIN_DEFAULT_PASSWORD`, `BETTER_AUTH_SECRET`, and `PROD_MAINTAINER_PASSWORD`.
4. Enable HTTPS for the Inngest (8288) public port. Keep pgAdmin (5050) private.
5. Deploy.

> PostgreSQL and Redis use named volumes (`deploy-postgres-data`, `deploy-redis-data`). Coolify will manage these as persistent storage.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| PgDog cannot load config | Wrong bind mount path or missing local `users.toml` | Check `docker/services/pgdog-postgres/files/` |
| pgAdmin cannot connect to PgDog | Host set to `localhost` inside pgAdmin | Use `app-pgdog` as the host |
| App cannot connect to database | `DATABASE_URL` is not using PgDog host port | Use `localhost:6432` from the host |
| Port conflict on 5050 or 6432 | Another local service uses the same port | Stop the other service or change the host port |
