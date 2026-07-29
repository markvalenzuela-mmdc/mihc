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

Next.js does not start `server.js` when a migration, release validation, or
production bootstrap step fails. Retrying a corrected deployment reconciles
the production maintainer and four application records idempotently: it does
not duplicate them, reset an existing maintainer password, load development
fixtures, or delete operational data.

## Delivery model

```text
push to main or version tag
  -> GitHub Actions builds application images
  -> GHCR stores branch, latest, semantic-version, and sha-* tags
  -> compose.deploy.yml pulls the configured image tags
  -> Next.js migrates and bootstraps before starting server.js
```

For pushes to `main`, `build-nextjs.yml` is path-filtered to `nextjs/**` or
`.github/**`; `build-playwright.yml` is path-filtered to `playwright/**`,
`packages/enrollmate-contract/**`, or `.github/**`. Both workflows also run on
`v*.*.*` tag pushes. GitHub does not evaluate `paths` filters for tag pushes,
so do not infer that a version tag is skipped because its commit changed other
paths. The Playwright workflow's legacy feature-branch trigger is not a
production release path. `latest` is emitted only for the default branch.

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

| Service | Purpose | Internal dependency/hostname | Current host exposure |
|---|---|---|---|
| `nextjs` | Web application and startup database release | `app-pgdog:6432`, `inngest:8288` | Fixed host port `3000`; intended application domain |
| `playwright` | Hono/Inngest consumer | `app-pgdog:6432`, `inngest:8288` | None (`expose` only) |
| `app-pgdog` | Application database proxy and pub/sub path | `app-postgres:5432` | Fixed host port `6432`; must be restricted |
| `app-postgres` | Application PostgreSQL | Docker volume | None |
| `inngest` | Event orchestration | `inngest-postgres`, `inngest-redis`, `playwright:3939` | Fixed host port `8288`; must be restricted unless explicitly required |
| `inngest-postgres` | Inngest PostgreSQL | Docker volume | Random host port for container `5432`; must be restricted |
| `inngest-redis` | Inngest queue/cache | Docker volume | Random host port for container `6379`; must be restricted |
| `pgadmin` | Operator database UI | both PostgreSQL services | Fixed host port `5050`; must be restricted |

`compose.deploy.yml` uses relative `include` paths, and the included PgDog
Compose file bind-mounts `files/pgdog.toml` and `files/users.toml`. A full
repository checkout is still required for the includes, `pgdog.toml`, and the
`users.toml.example` template. The actual
`docker/services/pgdog-postgres/files/users.toml` is ignored: operators must
provision it through a secret-backed/platform file mechanism, or on plain
Docker copy the example and replace its values. Never commit the real
production `users.toml` or its credentials.

## Configuration inventory

Every row below is present in an example file and must be reviewed. “Required”
means the production file must contain a value; a listed default is the
repository example or Compose fallback, not permission to deploy an example
credential.

### Application and build environment

| Variable | File/boundary and consumer | Secret? | Production form, status, and alignment |
|---|---|---:|---|
| `DATABASE_URL` | `docker/.env.deploy`; Next.js and Playwright/Hono runtime | Yes | Required PostgreSQL URI: `postgresql://<APP_POSTGRES_USER>:<APP_POSTGRES_PASSWORD>@app-pgdog:6432/<APP_POSTGRES_DB>?sslmode=disable`; align all three credentials with PgDog/PostgreSQL. |
| `DATABASE_RESET` | `docker/.env.deploy`; Next.js startup | No | Required; `false` for normal operation. `true` is temporary and destructive, only in the reset procedure below. |
| `NEXT_PUBLIC_APP_URL` | GitHub Actions build variable and `docker/.env.deploy`; Next.js build/runtime | No | Required exact public HTTPS origin. The build and runtime values must match; rebuild the image after a change. |
| `BETTER_AUTH_SECRET` | `docker/.env.deploy`; Next.js runtime | Yes | Required independent random secret of at least 32 characters. |
| `BETTER_AUTH_URL` | `docker/.env.deploy`; Next.js runtime | No | Required; exactly the same public HTTPS origin as `NEXT_PUBLIC_APP_URL`. |
| `INNGEST_EVENT_KEY` | `docker/.env.deploy`; Next.js and Playwright/Hono producers/consumers | Yes | Required; exactly equals `INNGEST_EVENT_KEY` in `docker/services/inngest/.env`. |
| `INNGEST_BASE_URL` | `docker/.env.deploy`; Next.js and Playwright/Hono runtime | No | Required internal URL `http://inngest:8288`. |
| `INNGEST_SDK_URL` | `docker/.env.deploy`; Inngest registration/runtime | No | Required internal callback `http://playwright:3939/api/inngest`. |
| `INNGEST_SIGNING_KEY` | `docker/.env.deploy`; Next.js and Playwright/Hono verification | Yes | Required; exactly equals `INNGEST_SIGNING_KEY` in `docker/services/inngest/.env`. |
| `PROD_MAINTAINER_NAME` | `docker/.env.deploy`; Next.js startup bootstrap | No | Required stable display name for the single production maintainer. |
| `PROD_MAINTAINER_EMAIL` | `docker/.env.deploy`; Next.js startup bootstrap | No | Required stable production email; do not use the example address. |
| `PROD_MAINTAINER_PASSWORD` | `docker/.env.deploy`; Next.js startup bootstrap | Yes | Required initial/reconciliation input. It is removed from the environment before `server.js`; repeated release does not reset an existing password. |

The root `--env-file docker/.env.deploy` supplies Compose interpolation, while
the `nextjs` and `playwright` services also load `docker/.env.deploy` through
`env_file`. Internal service URLs use Docker DNS, not the public domain and
not `localhost`. The containerized Inngest SDK/Playwright-Hono path must use
`http://playwright:3939/api/inngest`, never `host.docker.internal`:
`host.docker.internal` targets the host, not the containerized consumer.

### PgDog and application PostgreSQL environment

| Variable | File/boundary and consumer | Secret? | Production form, status, and alignment |
|---|---|---:|---|
| `PGDOG_RUST_LOG` | `docker/services/pgdog-postgres/.env`; PgDog | No | Required operational log filter; example/default intent is `info`. Increase verbosity only temporarily. |
| `APP_POSTGRES_USER` | Same file; app PostgreSQL and health check | No | Required stable database role; equals the PgDog `users.toml` user and `DATABASE_URL` user. |
| `APP_POSTGRES_PASSWORD` | Same file; app PostgreSQL | Yes | Required unique password; equals the matching `users.toml` password and `DATABASE_URL` password. |
| `APP_POSTGRES_DB` | Same file; app PostgreSQL and health check | No | Required database name; equals the matching `pgdog.toml` database and `DATABASE_URL` database. |

### Inngest environment

| Variable | File/boundary and consumer | Secret? | Production form, status, and alignment |
|---|---|---:|---|
| `INNGEST_EVENT_KEY` | `docker/services/inngest/.env`; Inngest | Yes | Required unique key; equals the root deployment value used by producers. |
| `INNGEST_SIGNING_KEY` | Same file; Inngest | Yes | Required unique key; equals the root deployment value used by consumers. |
| `INNGEST_POSTGRES_URI` | Same file; Inngest | Yes | Required URI `postgresql://<INNGEST_POSTGRES_USER>:<INNGEST_POSTGRES_PASSWORD>@inngest-postgres:5432/<INNGEST_POSTGRES_DB>?sslmode=disable`; align all credentials below. |
| `INNGEST_REDIS_URI` | Same file; Inngest | No, unless credentials are added | Required internal URI `redis://inngest-redis:6379`; never use a public or host address. |
| `INNGEST_POLL_INTERVAL` | Same file; Inngest | No | Optional tuning; example and Compose fallback `60`. |
| `INNGEST_QUEUE_WORKERS` | Same file; Inngest | No | Optional tuning; example and Compose fallback `100`. Size for host/database capacity. |
| `INNGEST_RETRY_INTERVAL` | Same file; Inngest | No | Optional tuning; example and Compose fallback `1`. |
| `INNGEST_TICK` | Same file; Inngest | No | Optional tuning; example and Compose fallback `150`. |
| `INNGEST_LOG_LEVEL` | Same file; Inngest | No | Optional log level; example and Compose fallback `info`. |
| `INNGEST_JSON` | Same file; Inngest | No | Optional log format; example `true`, Compose fallback `false` if omitted. Set explicitly for the production log collector. |
| `INNGEST_VERBOSE` | Same file; Inngest | No | Optional diagnostics; example and Compose fallback `false`. Enable only temporarily. |
| `INNGEST_POSTGRES_DB` | Same file; Inngest PostgreSQL and health check | No | Required stable database name; equals the database component of `INNGEST_POSTGRES_URI`. |
| `INNGEST_POSTGRES_USER` | Same file; Inngest PostgreSQL and health check | No | Required stable role; equals the user component of `INNGEST_POSTGRES_URI`. |
| `INNGEST_POSTGRES_PASSWORD` | Same file; Inngest PostgreSQL | Yes | Required unique password; equals the password component of `INNGEST_POSTGRES_URI`. |

### pgAdmin environment

| Variable | File/boundary and consumer | Secret? | Production form, status, and alignment |
|---|---|---:|---|
| `PGADMIN_DEFAULT_EMAIL` | `docker/services/pgadmin/.env`; pgAdmin | No | Required production administrator identity; replace `admin@example.com`. |
| `PGADMIN_DEFAULT_PASSWORD` | Same file; pgAdmin | Yes | Required unique strong password; never deploy the example `admin`. |

### PgDog file alignment

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
production secrets. The current `pgdog.toml` also contains database routing
names that must agree with production. Preserve `pub_sub_channel_size = 4096`
because Smoke Testing live updates use PostgreSQL `LISTEN`/`NOTIFY`.

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
PostgreSQL, PgDog, Redis, and pgAdmin private. “No domain assigned” is not
evidence that a service is private when Compose publishes its port on the host.

`ports` publishes a host port, while `expose` is container-network-only.
The current included Compose model publishes all six mappings below:

| Service | Compose entry | Resolved host exposure |
|---|---|---|
| `nextjs` | `3000:3000` | Fixed host port `3000` to container `3000` |
| `app-pgdog` | `6432:6432` | Fixed host port `6432` to container `6432` |
| `inngest` | `8288:8288` | Fixed host port `8288` to container `8288` |
| `pgadmin` | `5050:80` | Fixed host port `5050` to container `80` |
| `inngest-postgres` | `5432` | Container port `5432` published on an ephemeral host port |
| `inngest-redis` | `6379` | Container port `6379` published on an ephemeral host port |

Short syntax with only a container port still publishes it; Docker assigns the
host port dynamically. Never claim Inngest PostgreSQL or Redis remains private
merely because no fixed host port appears in the file.

Before production, require one of these controls and verify it from outside
the host: a private deployment override that removes the five internal/admin
`ports` entries in favor of `expose`, loopback-only bindings for any protected
operator access (and preferably Next.js behind the local proxy), or
platform/network isolation proven to block every assigned host port. Inspect
the resolved and dynamically assigned mappings after every deploy:

```bash
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml ps
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml port nextjs 3000
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml port app-pgdog 6432
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml port inngest 8288
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml port pgadmin 80
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml port inngest-postgres 5432
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml port inngest-redis 6379
```

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

## Coolify primary deployment path

> **BLOCKED for the current repository checkout.** Do not deploy
> `docker/compose.deploy.yml` unchanged in Coolify. A private deployment
> overlay or Compose adaptation must first satisfy the file and port controls
> below. This repository does not contain or validate that adaptation.

This remains the expected production PaaS path and is listed first as required
by the approved design. The blocker follows current official
[Coolify Docker Compose guidance](https://coolify.io/docs/knowledge-base/docker/compose):
the Compose file is the source of truth, UI variables correspond to Compose
interpolation/environment, and a `ports` entry exposes a service outside the
proxy. Entering variables in the UI does not materialize these literal ignored
checkout files:

| Required exact path before Compose parsing | Persistence requirement |
|---|---|
| `docker/.env.deploy` | Secret-backed content survives every clone/redeploy |
| `docker/services/pgdog-postgres/.env` | Secret-backed content survives every clone/redeploy |
| `docker/services/inngest/.env` | Secret-backed content survives every clone/redeploy |
| `docker/services/pgadmin/.env` | Secret-backed content survives every clone/redeploy |
| `docker/services/pgdog-postgres/files/users.toml` | Secret-backed content survives every clone/redeploy and remains aligned with PgDog/PostgreSQL |

The required follow-up must either create those exact files before Coolify
parses Compose, or replace the literal `env_file`/bind-mount model with
Coolify-supported environment/config content in a private Compose entrypoint.
It must also remove or restrict the five private/admin host-published ports
identified above. Official
[Coolify persistent-storage guidance](https://coolify.io/docs/knowledge-base/persistent-storage)
describes container volume and bind mounts, but it does not establish a
tested mechanism that writes all five files into a Git checkout before Compose
parsing. Do not substitute an untested platform file recipe.

After that separately reviewed adaptation exists:

1. Create a repository-backed Docker Compose resource, select the production
   branch, and use the adapted entrypoint based on `docker/compose.deploy.yml`.
2. Do not use Raw Compose unless the operator owns its proxy labels and other
   advanced behavior.
3. Confirm all five exact target files above exist with persistent,
   secret-backed content before Compose validation.
4. Assign only Next.js a domain as
   `https://<production-domain>:3000`. Here `:3000` selects the container
   target; users browse normal HTTPS without `:3000`.
5. Assign no domains to internal/admin services. Preview the resolved Compose,
   verify all six port mappings are removed/restricted by the adaptation or
   isolated by tested network policy, and review named-volume persistence.
6. Deploy, inspect bounded logs/status, and complete the final checklist.

This guide does not claim a live Coolify validation.

## Plain Docker Compose runbook

Run from the repository root on a VPS with a dedicated reverse proxy. First
copy all five ignored files, then replace every example secret and align the
two PgDog TOML files. The copied files are local secret material and must never
be committed:

```bash
cp docker/.env.deploy.example docker/.env.deploy
cp docker/services/pgdog-postgres/.env.example docker/services/pgdog-postgres/.env
cp docker/services/inngest/.env.example docker/services/inngest/.env
cp docker/services/pgadmin/.env.example docker/services/pgadmin/.env
cp docker/services/pgdog-postgres/files/users.toml.example \
  docker/services/pgdog-postgres/files/users.toml
```

Replace the example values in all five copies before validation. In particular,
replace every `users.toml` password and align its users/databases with
`docker/services/pgdog-postgres/files/pgdog.toml`,
`docker/services/pgdog-postgres/.env`, and `DATABASE_URL`. Never commit
`users.toml` or any copied `.env` file.

Before starting containers, implement and externally verify the port control
required in “Network and reverse proxy”: a production override that removes
private `ports`, loopback-only bindings, or a proven host/network firewall.
Then validate without printing the resolved secret-bearing configuration:

```bash
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml config --quiet
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml config --services
```

For private GHCR images, authenticate through standard input before `pull`;
never put the token in a file:

```bash
printf '%s' "$GHCR_TOKEN" |
  docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
```

The following `pull`/`up` sequence is only for a genuinely new installation
with no existing application database volume. If `app-postgres-data` already
exists, stop and use the backup-gated update procedure instead.

```bash
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml pull
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml up -d
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml ps
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml logs --tail=200 nextjs
```

### Mandatory backup gate before update or recreate

A newly created and verified application-database backup is an
abort-on-failure prerequisite before **every** image pull/update or container
recreate that might run Next.js migrations. Run this block first, including
before retry or rollback. It uses non-secret username/database identifiers
from the service configuration and does not print a password:

```bash
set -euo pipefail
umask 077
: "${APP_POSTGRES_USER:?export the configured non-secret database user}"
: "${APP_POSTGRES_DB:?export the configured non-secret database name}"
backup_path="mihc-production-$(date -u +%Y%m%dT%H%M%SZ).dump"

docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml exec -T app-postgres \
  pg_dump -U "$APP_POSTGRES_USER" -d "$APP_POSTGRES_DB" -Fc \
  > "$backup_path"
test -s "$backup_path"
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml exec -T app-postgres \
  pg_restore --list < "$backup_path" > /dev/null
printf 'Verified PostgreSQL archive: %s\n' "$backup_path"
```

`set -e` makes an unsuccessful dump, empty file, or unreadable archive abort
the sequence. If any command fails, do not pull or recreate anything. Keep the
archive in the tested backup destination and periodically perform a full
restore into a non-production database. Do not use `set -x`, echo environment
files, or print credentials while diagnosing a backup.

### Image update and retry

Only after the immediately preceding backup gate succeeds:

```bash
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml pull nextjs playwright
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml up -d --force-recreate nextjs playwright
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml ps
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml logs --tail=200 nextjs playwright
```

If a release fails, correct the cause, create and verify another current
backup, and only then retry `up -d --force-recreate nextjs`. A failed
migration, validation, or bootstrap keeps the Next.js server from starting.

### Executable image rollback

Rollback must pin both application images to known-good published semantic or
`sha-*` tags; `compose.deploy.yml` otherwise resolves both to `latest`. First
run the mandatory backup gate again. Then set the two exact release tags and
create a temporary override outside the repository:

```bash
set -euo pipefail
: "${NEXTJS_ROLLBACK_TAG:?set a known-good semantic or sha-* tag}"
: "${PLAYWRIGHT_ROLLBACK_TAG:?set a known-good semantic or sha-* tag}"

cat > /tmp/mihc-rollback.compose.yml <<YAML
services:
  nextjs:
    image: ghcr.io/markvalenzuela-mmdc/mihc-nextjs:${NEXTJS_ROLLBACK_TAG}
  playwright:
    image: ghcr.io/markvalenzuela-mmdc/mihc-playwright:${PLAYWRIGHT_ROLLBACK_TAG}
YAML

docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml \
  -f /tmp/mihc-rollback.compose.yml config --quiet
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml \
  -f /tmp/mihc-rollback.compose.yml pull nextjs playwright
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml \
  -f /tmp/mihc-rollback.compose.yml up -d --force-recreate nextjs playwright
```

Retain the override for subsequent reconciliations until a fixed release is
selected; removing it returns the stack to `latest`. Pin images from the same
compatible release/contract. An older image may be incompatible with a schema
already moved forward. Image rollback never reverses an applied migration;
repair schema problems with a forward Drizzle migration.

For a broken or partial maintainer account, use a supported Better Auth account
recovery path, then repeat the backup-gated release. For a safe shutdown that
preserves named volumes:

```bash
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml down
```

Never use `down -v` for routine shutdown, updates, or recovery.

### Exceptional database reset

`DATABASE_RESET=true` is a destructive exception, not a troubleshooting
shortcut. Run the mandatory backup gate immediately before it. The following
bounded checker waits at most two minutes and never uses unbounded
`logs --follow`:

```bash
wait_for_database_release() {
  release_seen=false
  for _ in $(seq 1 24); do
    if docker compose --env-file docker/.env.deploy \
      -f docker/compose.deploy.yml logs --since=3m nextjs 2>&1 |
      grep -Fq "Database release completed."; then
      release_seen=true
      break
    fi
    sleep 5
  done
  test "$release_seen" = true
  docker compose --env-file docker/.env.deploy \
    -f docker/compose.deploy.yml ps nextjs
}
```

Set `DATABASE_RESET=true` in `docker/.env.deploy`, then perform the first
recreate and bounded completion check:

```bash
grep -Fx 'DATABASE_RESET=true' docker/.env.deploy > /dev/null
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml up -d --force-recreate nextjs
wait_for_database_release
```

Immediately restore `DATABASE_RESET=false`, verify the file, and perform the
second recreate and check:

```bash
grep -Fx 'DATABASE_RESET=false' docker/.env.deploy > /dev/null
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml up -d --force-recreate nextjs
wait_for_database_release
```

If either bounded check fails, inspect `logs --tail=200 nextjs`, keep the
application unavailable, and investigate; never leave the reset flag true.
Do not use `docker restart` or `docker compose start`: both retain the old
container environment and can repeat the destructive reset.

## Dokploy deployment path

> **BLOCKED for the current repository checkout.** The deployment previously
> exercised in practice does not prove that the current ignored-file and
> repository-bind model survives a clean AutoDeploy checkout. Do not call the
> present Compose file production-ready in Dokploy without the adaptation
> below.

Official Dokploy
[Docker Compose](https://docs.dokploy.com/docs/core/docker-compose) guidance
states that UI variables are saved to one `.env` beside the Compose file and
are not automatically injected into containers. That does not satisfy the four
distinct literal `env_file` paths here. Official
[Volumes & Mounts](https://docs.dokploy.com/docs/core/troubleshooting/volumes-mounts)
guidance says AutoDeploy replaces the `code` checkout and that durable
configuration must be created in Advanced -> Mounts and referenced from the
sibling `../files` area.

A private Compose entrypoint must map persistent Dokploy file content to every
required target before parsing:

| Durable Dokploy File Mount content | Required current target/meaning |
|---|---|
| `../files/mihc-env.deploy` | `docker/.env.deploy` |
| `../files/mihc-pgdog.env` | `docker/services/pgdog-postgres/.env` |
| `../files/mihc-inngest.env` | `docker/services/inngest/.env` |
| `../files/mihc-pgadmin.env` | `docker/services/pgadmin/.env` |
| `../files/mihc-pgdog-users.toml` | `docker/services/pgdog-postgres/files/users.toml` |

Because `docker/compose.deploy.yml` is nested under `code/docker`, an adapted
reference to Dokploy's sibling files area is `../../files/<name>` from that
file, not the current checkout-relative path. The adaptation must use
Advanced -> Mounts content that persists across redeploys, update every
`env_file`/PgDog reference consistently, and remove/restrict private published
ports. This repository does not provide or validate that private entrypoint.

After it exists, create a repository-backed Compose application, use Docker
Compose rather than Docker Stack unless Swarm is intentional, select the
adapted Compose path, configure only the `nextjs` domain on container port
`3000`, prefer isolated deployments, and use Preview Compose before deployment.
Dokploy's official
[Domains guidance](https://docs.dokploy.com/docs/core/docker-compose/domains)
explains the generated routing and recommends `expose` over `ports` to avoid
host exposure. Run the final checklist after every deploy.

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

## Final and redeploy verification checklist

Replace `https://sanity.example.com` with the production origin. Run bounded
status/log checks and inventory the service set:

```bash
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml config --services
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml ps
docker compose --env-file docker/.env.deploy \
  -f docker/compose.deploy.yml logs --tail=200 nextjs playwright inngest app-pgdog
curl --fail --show-error --silent https://sanity.example.com/ > /dev/null
curl --fail --show-error --silent https://sanity.example.com/favicon.ico > /dev/null
```

The service inventory must contain exactly these eight services:
`app-postgres`, `app-pgdog`, `inngest-postgres`, `inngest-redis`, `inngest`,
`pgadmin`, `nextjs`, and `playwright`.

Before accepting a first deployment or a backup-gated redeployment, verify:

- Next.js reports `Database release completed.` before server startup; a
  forced reconcile does not start the server if release fails.
- Exactly one configured production maintainer exists, can sign in, and keeps
  the same password after a repeated deployment.
- Exactly four Smoke Testing application records exist without duplication.
- No development profiles, run histories, fixture users, or development
  credentials were created, and existing operational data remains intact.
- A Next.js release/query proves connectivity through `app-pgdog:6432` to
  application PostgreSQL.
- Inngest successfully registers and invokes the Playwright/Hono endpoint at
  `http://playwright:3939/api/inngest`.
- SSE live updates remain connected through the proxy beyond the 20-second
  heartbeat with response buffering disabled.
- All six resolved host-port mappings, including the random ports assigned for
  Inngest PostgreSQL `5432` and Redis `6379`, were inspected. External probes
  confirm only the intended HTTPS application route is public.
- `app-postgres-data`, `inngest-data`, `inngest-postgres-data`,
  `inngest-redis-data`, and `pgadmin-data` retain the same data across the
  redeploy; no password reset, duplicate bootstrap data, or operational-data
  loss occurred.

## Troubleshooting

| Symptom | Check/fix |
|---|---|
| Compose cannot find included file | A full repository checkout and the correct Compose path are required. |
| `env_file` missing | Provision the exact ignored file before Compose parsing; PaaS UI variables alone do not satisfy a literal path. |
| GHCR pull denied | Authenticate to GHCR or make the package readable by the deployment. |
| PgDog auth failure | Align `.env`, `users.toml`, `pgdog.toml`, and `DATABASE_URL`. |
| Next.js restart loop | Inspect release logs and correct missing or invalid runtime values. |
| Browser uses old origin | Rebuild Next.js after updating the GitHub Actions public URL. |
| Hono does not register | Verify `INNGEST_SDK_URL=http://playwright:3939/api/inngest`. |
| SSE disconnects/stalls | Disable reverse-proxy buffering and increase the idle timeout. |
| Domain returns gateway error | Route the proxy to Next.js container port `3000`. |
| Admin/database/cache port is public | Inspect all six resolved mappings, including random `5432`/`6379`; remove private `ports`, bind to loopback, or enforce verified isolation. |
| Rollback still starts `latest` | Keep the temporary two-image override in every `pull` and `up` command and inspect resolved Compose. |
| Data disappears after redeploy | Restore or reattach the expected named volume; never use `down -v`. |
