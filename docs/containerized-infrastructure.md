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
the four Smoke Testing apps, never resets an existing password, and never loads
development fixtures.

## Compose files

- `docker/compose.local.yml` ΓÇö local development entrypoint that includes service-owned Compose files
- `docker/services/pgdog-postgres/compose.yml` ΓÇö app PostgreSQL and PgDog
- `docker/services/inngest/compose.yml` ΓÇö Inngest, Inngest PostgreSQL, and Inngest Redis
- `docker/services/pgadmin/compose.yml` ΓÇö pgAdmin
- `docker/compose.build.yml` ΓÇö build entrypoint that builds the Next.js and Playwright images
- `docker/compose.deploy.yml` ΓÇö deploy entrypoint that uses the published Next.js and Playwright images

Both Compose entrypoints include the same service-owned infrastructure files.
The build stack uses `docker/.env.build` for the application containers; the
deploy stack uses `docker/.env.deploy`. The included PostgreSQL, Inngest, and
pgAdmin services read their own ignored service-local `.env` files.

The build stack has a disabled-by-default `reset` profile containing a one-shot
database reset service. `just docker build-reset` uses that profile to drop the
application schemas, apply Drizzle migrations, and run only the production
bootstrap. The deploy Compose file intentionally has no reset service.

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

For the production-like build stack, use `just docker build`. If its persistent
application volume contains development fixtures, run `just docker build-reset`
to replace them with the production maintainer and Smoke Testing apps only.

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
| Credentials | Service-local `.env` files | Service-local `.env` files plus root `docker/.env.deploy` |
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

## Production deployment runbook

From the repository root:

1. Copy `docker/.env.deploy.example` to the ignored `docker/.env.deploy`.
2. Copy each service `.env.example` to its ignored `.env` file and replace
   local credentials with deployment secrets.
3. Ensure the PgDog username/password in `docker/services/pgdog-postgres/.env`,
   `docker/services/pgdog-postgres/files/users.toml`, and `DATABASE_URL` all
   match.
4. Set `INNGEST_SDK_URL=http://playwright:3939/api/inngest` in the Inngest
   service `.env` so the deployed consumer is reachable inside the Compose
   network.
5. Back up the production database.
6. Validate the Compose configuration:

   ```bash
   docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml config --quiet
   ```

7. Deploy the stack:

   ```bash
   docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml up -d
   ```

   `just docker deploy up` is the equivalent normal deployment shortcut and
   loads `docker/.env.deploy` automatically.

8. Inspect the Next.js startup logs:

   ```bash
   docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml logs nextjs
   ```

`PROD_MAINTAINER_PASSWORD` is available to the startup bootstrap only. The
container entrypoint removes it from the environment before starting the
long-running Next.js server.

For manual development workflows, use `just db migrate` to apply migrations,
`just db seed` to load complete development fixtures, and `just db release` to
run the same production migrate/bootstrap sequence. `just db reset` permanently
resets its configured database; never run it against production. Image rollback
does not undo database migrations. Correct schema problems with a new forward
Drizzle migration.

## Coolify Deployment

1. Copy or reference `docker/compose.deploy.yml` and its included service Compose files in Coolify.
2. Provision the service-local `.env` files required by the included PgDog,
   Inngest, and pgAdmin Compose files.
3. Set the application variables from `docker/.env.deploy.example` as Coolify
   environment variables. `BETTER_AUTH_SECRET` must contain at least 32
   characters.
4. Generate deployment secrets for the PgDog database credentials, Inngest
   keys, pgAdmin password, Better Auth secret, and maintainer bootstrap
   password.
5. Enable HTTPS for the Inngest (8288) public port. Keep pgAdmin (5050) private.
6. Deploy.

> PostgreSQL and Redis use named volumes managed by Compose. Coolify will manage these as persistent storage.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Local PgDog cannot load config | Wrong bind mount path or missing local `users.toml` | Check `docker/services/pgdog-postgres/files/` |
| Local pgAdmin cannot connect to PgDog | Host set to `localhost` inside pgAdmin | Use `app-pgdog` as the host |
| Local app cannot connect to database | `DATABASE_URL` is not using PgDog host port | Use `localhost:6432` from the host |
| Deployed app cannot connect to database | `DATABASE_URL`, PgDog `.env`, and `users.toml` credentials do not match | Align the PgDog credentials and use `app-pgdog:6432` |
| Port conflict on 5050 or 6432 | Another local service uses the same port | Stop the other service or change the host port |
