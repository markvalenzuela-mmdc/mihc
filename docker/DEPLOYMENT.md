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
Compose file bind-mounts `files/pgdog.toml` and `files/users.toml`. A full
repository checkout is still required for the includes, `pgdog.toml`, and the
`users.toml.example` template. The actual
`docker/services/pgdog-postgres/files/users.toml` is ignored: operators must
provision it through a secret-backed/platform file mechanism, or on plain
Docker copy the example and replace its values. Never commit the real
production `users.toml` or its credentials.

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

`users.toml.example` and every `.env.example` value are examples, not
production secrets. Preserve `pub_sub_channel_size = 4096` because Smoke
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

## Before deployment

Before any deployment, ensure the operator has:

- a host with Docker Engine and Docker Compose v2, or a Compose-capable PaaS;
- DNS control and a public HTTPS domain;
- access to the complete Git repository, not just the top-level Compose file;
- GHCR authentication if the application images are private;
- unique production secrets;
- persistent storage and a tested database-backup destination; and
- the GitHub Actions `NEXT_PUBLIC_APP_URL` repository variable set to the
  production origin before building the Next.js image.

> **Never deploy examples unchanged.** Replace every example password, key,
> email address, and PgDog credential in the `.env.example` files,
> `users.toml.example`, and any copied configuration before deployment.

## Plain Docker Compose runbook

Run these commands from the repository root. First copy the templates, replace
all secrets, and update both PgDog TOML files (`pgdog.toml` and `users.toml`) so
their user, password, database, and backend settings agree with the
configuration inventory above.

```bash
cp docker/.env.deploy.example docker/.env.deploy
cp docker/services/pgdog-postgres/.env.example docker/services/pgdog-postgres/.env
cp docker/services/inngest/.env.example docker/services/inngest/.env
cp docker/services/pgadmin/.env.example docker/services/pgadmin/.env

docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml config --quiet

docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml pull

docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml up -d

docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml ps

docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml logs --tail=200 nextjs
```

For private GHCR images, authenticate interactively through standard input
before `pull`; do not put the token in a file:

```bash
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
```

### First-deploy verification

Replace `https://sanity.example.com` below with the production origin, then run:

```bash
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml ps

docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml logs --tail=200 nextjs playwright inngest app-pgdog

curl --fail --show-error --silent https://sanity.example.com/ >/dev/null
curl --fail --show-error --silent https://sanity.example.com/favicon.ico >/dev/null
```

Verify all of the following before treating the release as complete:

- Next.js logs end the release with `Database release completed.` before server
  startup.
- The configured maintainer can sign in.
- The four Smoke Testing apps exist exactly once.
- No profiles, run histories, or development credentials were created.
- Inngest reports the Hono endpoint at
  `http://playwright:3939/api/inngest`.
- SSE live updates remain connected through the proxy.

### Update, retry, rollback, backup, and recovery

For a normal application-image update, pull and recreate the two application
services:

```bash
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml pull nextjs playwright

docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml up -d --force-recreate nextjs playwright
```

After correcting configuration, retry the Next.js release and follow its logs:

```bash
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml up -d --force-recreate nextjs
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml logs --tail=200 --follow nextjs
```

Back up the application database using the username and database values from
the PgDog/PostgreSQL service configuration:

```bash
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml exec -T app-postgres \
  pg_dump -U "$APP_POSTGRES_USER" -d "$APP_POSTGRES_DB" -Fc \
  > mihc-production.dump
```

Export the shell-side variables or replace them with the actual non-secret
username and database name; never echo the password. Verify the resulting
backup file and periodically test its restore procedure against a
non-production database.

Image rollback means pinning and redeploying an earlier image tag. It does not
reverse applied migrations: correct a schema problem with a forward Drizzle
migration. For a broken or partial maintainer account, use a supported Better
Auth password/account recovery path, then retry the Next.js release.

For a safe shutdown that preserves named volumes, use:

```bash
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml down
```

Never use `down -v` for routine shutdown, updates, or recovery.

### Exceptional database reset

`DATABASE_RESET=true` is a destructive exception, not a troubleshooting
shortcut. Only perform it in this order:

1. Take and verify a backup.
2. Set `DATABASE_RESET=true` in `docker/.env.deploy`.
3. Force-recreate only `nextjs`.
4. Inspect the completion logs.
5. Immediately set `DATABASE_RESET=false` again.
6. Force-recreate `nextjs` again.

```bash
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml up -d --force-recreate nextjs
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml logs --tail=200 --follow nextjs
```

Do not use `docker restart` or `docker compose start` for this sequence: both
retain the old container environment and can repeat the destructive reset.

## Coolify primary deployment path

This is the expected production PaaS path, based on
[Coolify's Docker Compose guidance](https://coolify.io/docs/knowledge-base/docker/compose).
It is an operator-verified path, not a claim that Coolify creates this
repository's custom files automatically.

1. Create a repository-backed Docker Compose resource, select the production
   branch, and choose `docker/compose.deploy.yml`.
2. Do not use Raw Compose unless the operator intentionally provides the proxy
   labels and accepts that advanced path.
3. Provision `docker/.env.deploy` and all three service-local `.env` files.
4. Provision PgDog TOML content through repository files, a provider-managed
   file mount/config, or an explicit private deployment overlay.
5. Assign the Next.js domain using the container port:
   `https://<production-domain>:3000`.
6. Verify Coolify routes normal public HTTPS to container port `3000`; the
   `:3000` in the domain setting identifies the internal target port, so users
   still browse normal HTTPS without `:3000`.
7. Assign no public domains to PostgreSQL, PgDog, Redis, Playwright/Hono, or
   pgAdmin, and review all persistent volumes.
8. Deploy, inspect logs, and run the shared first-deploy verification checklist.

Coolify can surface Compose variables in its UI, but this Compose stack uses
explicit `env_file` paths. Confirm that the exact files are present in the
deployment checkout; do not assume the platform creates them.

## Dokploy tested-path notes

The following is the tested operational path, following Dokploy's
[Docker Compose](https://docs.dokploy.com/docs/core/docker-compose) and
[Domains](https://docs.dokploy.com/docs/core/docker-compose/domains)
documentation:

1. Create a Compose application backed by the complete repository and use
   Docker Compose, rather than Docker Stack, unless Swarm is intentional.
2. Set the Compose path to `docker/compose.deploy.yml`.
3. Provision the environment files and PgDog TOML files through Dokploy's
   environment, settings, and file workflow.
4. In the Domains tab, route the `nextjs` service to container port `3000`.
5. Prefer isolated deployments, or verify attachment to the required shared
   network.
6. Preview the generated Compose before deployment, then use the shared
   first-deploy verification checklist.

Dokploy documents that UI variables are written to a `.env` file but are not
injected into containers unless referenced through `env_file` or `${VARIABLE}`.
This repository's explicit file paths must therefore be verified, including
their content and availability at deploy time.

## Advanced decoupled-services alternative

Provider templates are optional and not assumed. Operators who split this
stack must provide one shared Docker network and either retain these DNS names
or update every consumer consistently:

```text
app-postgres
app-pgdog
inngest-postgres
inngest-redis
inngest
playwright
```

They own health dependencies, secrets, persistent storage, file mounts, and
internal DNS for the separated services.

## Troubleshooting

| Symptom | Check/fix |
|---|---|
| Compose cannot find included file | A full repository checkout and the correct Compose path are required. |
| `env_file` missing | Provision the exact repository-relative file. |
| GHCR pull denied | Authenticate to GHCR or make the package readable by the deployment. |
| PgDog auth failure | Align `.env`, `users.toml`, `pgdog.toml`, and `DATABASE_URL`. |
| Next.js restart loop | Inspect release logs and correct missing or invalid runtime values. |
| Browser uses old origin | Rebuild Next.js after updating the GitHub Actions public URL. |
| Hono does not register | Verify `INNGEST_SDK_URL=http://playwright:3939/api/inngest`. |
| SSE disconnects/stalls | Disable reverse-proxy buffering and increase the idle timeout. |
| Domain returns gateway error | Route the proxy to Next.js container port `3000`. |
| Admin/database port is public | Remove its domain, firewall its host port, or use a private override. |
| Data disappears after redeploy | Restore or reattach the expected named volume; never use `down -v`. |
