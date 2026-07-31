# Individual Service Deployment

MIHC production is deployed as four separate repository-backed Docker Compose
resources. Coolify and Dokploy can each deploy the same four resources by
selecting the matching `compose.deploy.yml` file and configuring its
environment values. pgAdmin is local-development tooling and is not deployed
in production.

## Deployment model

Create one Compose resource for each service group:

| Resource | Compose file | Platform exposure |
|---|---|---|
| PgDog and application PostgreSQL | `docker/services/pgdog-postgres/compose.deploy.yml` | Internal; restrict host port `6432` if used |
| Inngest, PostgreSQL, and Redis | `docker/services/inngest/compose.deploy.yml` | Internal |
| Next.js | `docker/services/nextjs/compose.deploy.yml` | Public route to container port `3000` |
| Playwright/Hono | `docker/services/playwright/compose.deploy.yml` | Internal on container port `3939` |

For each Coolify or Dokploy resource, use the repository root as the source,
select the exact Compose file above, and enter the values from that service's
`.env.example` in the platform environment settings.

## Shared network

The PgDog/PostgreSQL Compose file creates the literal named bridge network
`mihc-network`. The Inngest, Next.js, and Playwright Compose files declare that
network as external, and every production container joins it.

Deploy PgDog/PostgreSQL first so the network exists. Configure all four
Coolify or Dokploy resources to use the same Docker host and the same literal
network name, `mihc-network`.

## 1. PgDog and application PostgreSQL

Use these files:

```text
docker/services/pgdog-postgres/compose.deploy.yml
docker/services/pgdog-postgres/.env.example -> platform environment
docker/services/pgdog-postgres/files/pgdog.toml
docker/services/pgdog-postgres/files/users.toml.example -> users.toml
```

Configure:

```text
PGDOG_RUST_LOG
APP_POSTGRES_USER
APP_POSTGRES_PASSWORD
APP_POSTGRES_DB
```

`pgdog.toml` defines the databases and routes each one to
`app-postgres:5432`. Create `users.toml` from `users.toml.example`, replace the
example credentials, and supply it through the platform's persistent file or
configuration feature at the path expected by the Compose mount. Do not commit
the real file.

Keep these values aligned:

```text
APP_POSTGRES_USER     == users.toml [[users]].name
APP_POSTGRES_PASSWORD == users.toml [[users]].password
APP_POSTGRES_DB       == pgdog.toml [[databases]].name
DATABASE_URL user/password/database match those values
DATABASE_URL host     == app-pgdog
pgdog.toml backend    == app-postgres:5432
```

Any credential disclosed in chat must be rotated before deployment and must
never be copied into a tracked file.

## 2. Inngest, PostgreSQL, and Redis

Use:

```text
docker/services/inngest/compose.deploy.yml
docker/services/inngest/.env.example -> platform environment
```

Configure these required values:

```text
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
INNGEST_POSTGRES_URI -> postgresql://...@inngest-postgres:5432/...
INNGEST_REDIS_URI    -> redis://inngest-redis:6379
INNGEST_SDK_URL      -> http://playwright:3939/api/inngest
INNGEST_POSTGRES_DB
INNGEST_POSTGRES_USER
INNGEST_POSTGRES_PASSWORD
```

The PostgreSQL URI user, password, and database must match the three
`INNGEST_POSTGRES_*` values. The tracked `.env.example` contains the optional
tuning and logging values.

## 3. Next.js

Use:

```text
docker/services/nextjs/compose.deploy.yml
docker/services/nextjs/.env.example -> platform environment
```

Configure:

```text
DATABASE_URL -> postgresql://...@app-pgdog:6432/...
DATABASE_RESET -> false
NEXT_PUBLIC_APP_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
INNGEST_EVENT_KEY
INNGEST_BASE_URL -> http://inngest:8288
INNGEST_SIGNING_KEY
PROD_MAINTAINER_NAME
PROD_MAINTAINER_EMAIL
PROD_MAINTAINER_PASSWORD
```

The database credentials must match the PgDog/PostgreSQL resource. The Inngest
event and signing keys must match the Inngest resource. Route this resource
publicly to container port `3000`.

## 4. Playwright/Hono

Use:

```text
docker/services/playwright/compose.deploy.yml
docker/services/playwright/.env.example -> platform environment
```

Configure:

```text
DATABASE_URL -> postgresql://...@app-pgdog:6432/...
INNGEST_EVENT_KEY
INNGEST_BASE_URL -> http://inngest:8288
INNGEST_SIGNING_KEY
```

These values must match the PgDog/PostgreSQL and Inngest resources. Keep this
resource internal; Inngest reaches its Hono endpoint on container port `3939`.

## Deployment order

Deploy and confirm each individual Coolify or Dokploy resource in this order:

1. PgDog and application PostgreSQL — creates `mihc-network`.
2. Inngest, Inngest PostgreSQL, and Redis.
3. Next.js — public route to container port `3000`.
4. Playwright/Hono — internal on container port `3939`.
