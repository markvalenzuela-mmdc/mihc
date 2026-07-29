# Production Deployment

This is the authoritative operator guide for deploying the MIHC production
stack. The primary deployment path connects the complete Git repository and
uses `docker/compose.deploy.yml`; copying that file alone is insufficient
because it includes service Compose files and mounts repository-backed PgDog
configuration.

Supported paths:

1. Coolify repository-backed Docker Compose deployment (expected production PaaS).
2. Plain Docker Compose on a VPS behind a dedicated reverse proxy.
3. Dokploy repository-backed Docker Compose deployment (tested operational path).

Provisioning every service separately is an advanced alternative. It must
preserve a shared Docker network and the service-name hostnames documented
below.

## What this guide does not change

The accepted architecture uses one published Next.js image and performs the
database release in the Next.js startup entrypoint. It does not publish a
one-shot release image and does not gate Playwright/Hono startup on Next.js
release completion.

## Delivery model

```text
push to main or version tag
  -> GitHub Actions builds application images
  -> GHCR stores branch, latest, semantic-version, and sha-* tags
  -> compose.deploy.yml pulls the configured image tags
  -> Next.js migrates and bootstraps before starting server.js
```

`build-nextjs.yml` runs for `nextjs/**` or `.github/**` changes on `main` and
`v*.*.*` tags. `build-playwright.yml` runs for `playwright/**`,
`packages/enrollmate-contract/**`, or `.github/**` changes on `main` and
version tags. The legacy feature-branch trigger is not a production release
path. `latest` is emitted only for the default branch.

`compose.deploy.yml` currently references
`ghcr.io/markvalenzuela-mmdc/mihc-nextjs:latest` and
`ghcr.io/markvalenzuela-mmdc/mihc-playwright:latest`. Redeployment must
pull/recreate containers to consume a newly published image.

`NEXT_PUBLIC_APP_URL` is passed as a Next.js build argument by GitHub Actions.
A public-domain change therefore requires updating the GitHub Actions
repository variable, rebuilding the Next.js image, and setting the same
runtime origin; changing only the runtime container variable may leave browser
assets with the previous URL.

## Repository and stack topology

| Service | Purpose | Internal dependency/hostname | Public by default? |
|---|---|---|---|
| `nextjs` | Web application and startup database release | `app-pgdog:6432`, `inngest:8288` | Application domain only |
| `playwright` | Hono/Inngest consumer | `app-pgdog:6432`, `inngest:8288` | No |
| `app-pgdog` | Application database proxy and pub/sub path | `app-postgres:5432` | No |
| `app-postgres` | Application PostgreSQL | Docker volume | No |
| `inngest` | Event orchestration | `inngest-postgres`, `inngest-redis`, `playwright:3939` | Only if the chosen operating model requires it |
| `inngest-postgres` | Inngest PostgreSQL | Docker volume | No |
| `inngest-redis` | Inngest queue/cache | Docker volume | No |
| `pgadmin` | Operator database UI | both PostgreSQL services | No |

`compose.deploy.yml` uses relative `include` paths, and the included PgDog
Compose file bind-mounts `files/pgdog.toml` and `files/users.toml`. Therefore,
a PaaS must check out the full repository and preserve those paths, or the
operator must deliberately translate them into provider-managed file
mounts/configs.

## Configuration inventory

| Variable | Boundary | Secret? | Production value/relationship |
|---|---|---:|---|
| `NEXT_PUBLIC_APP_URL` | GitHub Actions build and application runtime | No | Exact public HTTPS origin; rebuild image when changed |
| `DATABASE_URL` | Application runtime | Yes | `postgresql://<APP_POSTGRES_USER>:<APP_POSTGRES_PASSWORD>@app-pgdog:6432/<APP_POSTGRES_DB>?sslmode=disable` |
| `DATABASE_RESET` | Next.js startup | No | `false`; use `true` only for a deliberate backed-up reset |
| `BETTER_AUTH_SECRET` | Application runtime | Yes | At least 32 random characters |
| `BETTER_AUTH_URL` | Application runtime | No | Same public HTTPS origin as `NEXT_PUBLIC_APP_URL` |
| `INNGEST_EVENT_KEY` | Application and Inngest runtime | Yes | Same value on producers and Inngest |
| `INNGEST_SIGNING_KEY` | Application and Inngest runtime | Yes | Same value on consumer and Inngest |
| `INNGEST_BASE_URL` | Application runtime | No | `http://inngest:8288` |
| `INNGEST_SDK_URL` | Inngest registration | No | `http://playwright:3939/api/inngest` |
| `PROD_MAINTAINER_NAME` | Next.js startup bootstrap | No | Intended production maintainer display name |
| `PROD_MAINTAINER_EMAIL` | Next.js startup bootstrap | No | Stable maintainer email |
| `PROD_MAINTAINER_PASSWORD` | Next.js startup bootstrap | Yes | Initial password; entrypoint unsets it before `server.js` |

The root `--env-file docker/.env.deploy` supplies Compose interpolation, while
the `nextjs` and `playwright` services also load `docker/.env.deploy` through
`env_file`. Internal service URLs use Docker DNS, not the public domain and
not `localhost`.

## Service-local environment and PgDog configuration

| File | Required values |
|---|---|
| `docker/services/pgdog-postgres/.env` | `PGDOG_RUST_LOG`, `APP_POSTGRES_USER`, `APP_POSTGRES_PASSWORD`, `APP_POSTGRES_DB` |
| `docker/services/inngest/.env` | Inngest keys, PostgreSQL/Redis URIs, worker settings, and Inngest PostgreSQL credentials |
| `docker/services/pgadmin/.env` | `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD` |

PgDog consistency checklist:

```text
APP_POSTGRES_USER     == users.toml [[users]].name
APP_POSTGRES_PASSWORD == users.toml [[users]].password
APP_POSTGRES_DB       == pgdog.toml [[databases]].name
DATABASE_URL user/password/database match the same three values
DATABASE_URL host     == app-pgdog
pgdog.toml backend    == app-postgres:5432
```

The committed `users.toml` values and every `.env.example` value are examples,
not production secrets. Preserve `pub_sub_channel_size = 4096` because Smoke
Testing live updates use PostgreSQL `LISTEN`/`NOTIFY`.

## Persistent volumes

- `app-postgres-data`
- `inngest-data`
- `inngest-postgres-data`
- `inngest-redis-data`
- `pgadmin-data`

`down -v` destroys named-volume data and must not appear in the normal
deployment/upgrade procedure.

## Network and reverse proxy

Route the public application domain to the `nextjs` container's port `3000`
and terminate HTTPS at the platform or dedicated proxy. Keep Playwright/Hono,
PostgreSQL, PgDog, Redis, and pgAdmin private.

`ports` publishes a host port, while `expose` is container-network-only.
Current Compose publishes `3000:3000`, `6432:6432`, `8288:8288`, and
`5050:80`, so a production host needs firewall rules, a loopback-only override,
or platform isolation to prevent unintended direct access.

The proxy must not buffer `text/event-stream` and must allow idle connections
longer than the 20-second SSE heartbeat.
