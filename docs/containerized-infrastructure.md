# Containerized Infrastructure

## Overview

This setup provides local development and Coolify-ready infrastructure for:

- App PostgreSQL with a PgDog proxy
- Inngest with its own PostgreSQL database and Redis
- pgAdmin

No application code, schemas, migrations, Dockerfiles, or app images are included.

## Compose files

- `docker/compose.local.yml` — local development entrypoint that includes service-owned Compose files
- `docker/services/pgdog-postgres/compose.yml` — app PostgreSQL and PgDog
- `docker/services/inngest/compose.yml` — Inngest, Inngest PostgreSQL, and Inngest Redis
- `docker/services/pgadmin/compose.yml` — pgAdmin
- `docker/compose.deploy.yml` — Coolify deployment-oriented stack

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

- `app-postgres` — application database, reached from the host through PgDog on `localhost:6432`
- `inngest-postgres` — dedicated Inngest database, reached by the `inngest` service inside Docker
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
just docker-local up
```

Stop local infrastructure:

```bash
just docker-local down
```

`just docker-local` defaults to `up`.

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
| pgAdmin mode | Desktop mode | Server mode + deployment auth policy |
| Port exposure | PgDog and pgAdmin have fixed local ports; Inngest dependencies use dynamic host ports | Deployment-specific |
| Service layout | Included service-owned Compose files | Service templates can be deployed independently |

## Coolify Deployment

1. Add a new Docker Compose resource in Coolify.
2. Paste the contents of `docker/compose.deploy.yml` as the compose file.
3. Set the environment variables from `docker/.env.deploy.example` as Coolify environment variables.
4. Generate secrets for `POSTGRES_PASSWORD`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `PGADMIN_DEFAULT_PASSWORD`.
5. Enable HTTPS for the Inngest (8288) and pgAdmin (5050) public ports in Coolify.
6. Deploy.

> PostgreSQL and Redis use named volumes (`mihc_postgres_data`, `mihc_redis_data`). Coolify will manage these as persistent storage.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| PgDog cannot load config | Wrong bind mount path or missing local `users.toml` | Check `docker/services/pgdog-postgres/files/` |
| pgAdmin cannot connect to PgDog | Host set to `localhost` inside pgAdmin | Use `app-pgdog` as the host |
| App cannot connect to database | `DATABASE_URL` is not using PgDog host port | Use `localhost:6432` from the host |
| Port conflict on 5050 or 6432 | Another local service uses the same port | Stop the other service or change the host port |
