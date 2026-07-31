# Production Deployment

This is the authoritative operator guide for MIHC production. Production uses
four service-owned Compose resources from a complete repository checkout; there
is no repository-wide deployment entrypoint.

## Production topology

Deploy in this order:

```text
Foundation 1: docker/services/pgdog-postgres/compose.deploy.yml
  app-postgres -> creates/joins mihc-network
  app-pgdog    -> joins mihc-network, publishes restricted host port 6432

Foundation 2: docker/services/inngest/compose.deploy.yml
  inngest-postgres -> external mihc-network
  inngest-redis    -> external mihc-network
  inngest          -> external mihc-network

Applications:
  docker/services/nextjs/compose.deploy.yml     -> external mihc-network, expose 3000
  docker/services/playwright/compose.deploy.yml -> external mihc-network, expose 3939
```

`pgadmin` is local-development tooling only. It is not part of production
provisioning, secrets, volumes, exposure checks, PaaS setup, or verification.

The production Next.js image runs committed migrations and the idempotent
production bootstrap before it starts `server.js`. A migration, validation, or
bootstrap failure keeps the server from starting. Playwright/Hono is deployed
independently and Inngest reaches it at `http://playwright:3939/api/inngest`.

GitHub Actions publishes the Next.js and Playwright images. `latest` is emitted
only for the default branch; pin a semantic or `sha-*` tag for a deliberate
rollback. `NEXT_PUBLIC_APP_URL` is a build argument, so a public-domain change
requires updating the GitHub Actions variable, rebuilding the image, and
aligning the runtime value.

## Configuration inventory

Every example value must be replaced before deployment. Service-local `.env`
files and `users.toml` are ignored and must be supplied securely on the host or
by the platform; never commit them.

> **Credential rotation required:** any credential pasted into chat must be
> treated as disclosed and rotated before deployment. Never reproduce it in a
> tracked file or command.

### Application environment

| Variable | File/boundary and consumer | Secret? | Production form, status, and alignment |
|---|---|---:|---|
| `DATABASE_URL` | `docker/services/nextjs/.env` and `docker/services/playwright/.env`; application runtimes | Yes | Required PostgreSQL URI using `app-pgdog:6432`; keep both copies aligned with PgDog/PostgreSQL. |
| `DATABASE_RESET` | `docker/services/nextjs/.env`; Next.js startup | No | Required; `false` normally. `true` is temporary and destructive, only for the reset procedure. |
| `NEXT_PUBLIC_APP_URL` | GitHub Actions build variable and `docker/services/nextjs/.env`; Next.js build/runtime | No | Required exact public HTTPS origin; build and runtime values must match. |
| `BETTER_AUTH_SECRET` | `docker/services/nextjs/.env`; Next.js runtime | Yes | Required independent random secret of at least 32 characters. |
| `BETTER_AUTH_URL` | `docker/services/nextjs/.env`; Next.js runtime | No | Required; exactly the same public HTTPS origin as `NEXT_PUBLIC_APP_URL`. |
| `INNGEST_EVENT_KEY` | Both application `.env` files; producers/consumers | Yes | Required; equals the Inngest value. |
| `INNGEST_BASE_URL` | Both application `.env` files; application runtimes | No | Required internal URL `http://inngest:8288`. |
| `INNGEST_SIGNING_KEY` | Both application `.env` files; verification | Yes | Required; equals the Inngest value. |
| `PROD_MAINTAINER_NAME` | `docker/services/nextjs/.env`; startup bootstrap | No | Required stable production maintainer name. |
| `PROD_MAINTAINER_EMAIL` | `docker/services/nextjs/.env`; startup bootstrap | No | Required stable production email. |
| `PROD_MAINTAINER_PASSWORD` | `docker/services/nextjs/.env`; startup bootstrap | Yes | Required initial/reconciliation input; removed before `server.js` runs. |

Internal service URLs use Docker DNS, not a public domain or `localhost`.

### PgDog and application PostgreSQL environment

| Variable | File/boundary and consumer | Secret? | Production form, status, and alignment |
|---|---|---:|---|
| `PGDOG_RUST_LOG` | `docker/services/pgdog-postgres/.env`; PgDog | No | Required operational log filter; normally `info`. |
| `APP_POSTGRES_USER` | Same file; app PostgreSQL and health check | No | Required stable role; equals the PgDog user and `DATABASE_URL` user. |
| `APP_POSTGRES_PASSWORD` | Same file; app PostgreSQL | Yes | Required unique password; equals `users.toml` and `DATABASE_URL`. |
| `APP_POSTGRES_DB` | Same file; app PostgreSQL and health check | No | Required database name; equals `pgdog.toml` and `DATABASE_URL`. |

### Inngest environment

| Variable | File/boundary and consumer | Secret? | Production form, status, and alignment |
|---|---|---:|---|
| `INNGEST_EVENT_KEY` | `docker/services/inngest/.env`; Inngest | Yes | Required; equals both application values. |
| `INNGEST_SIGNING_KEY` | Same file; Inngest | Yes | Required; equals both application values. |
| `INNGEST_POSTGRES_URI` | Same file; Inngest | Yes | Required URI using `inngest-postgres:5432`; align the PostgreSQL credentials below. |
| `INNGEST_REDIS_URI` | Same file; Inngest | No, unless credentials are added | Required internal URI `redis://inngest-redis:6379`. |
| `INNGEST_SDK_URL` | Same file; registration/runtime | No | Required `http://playwright:3939/api/inngest`. |
| `INNGEST_POLL_INTERVAL` | Same file; Inngest | No | Optional tuning; default `60`. |
| `INNGEST_QUEUE_WORKERS` | Same file; Inngest | No | Optional tuning; default `100`. |
| `INNGEST_RETRY_INTERVAL` | Same file; Inngest | No | Optional tuning; default `1`. |
| `INNGEST_TICK` | Same file; Inngest | No | Optional tuning; default `150`. |
| `INNGEST_LOG_LEVEL` | Same file; Inngest | No | Optional log level; default `info`. |
| `INNGEST_JSON` | Same file; Inngest | No | Optional log format; set explicitly for the production collector. |
| `INNGEST_VERBOSE` | Same file; Inngest | No | Optional diagnostics; enable only temporarily. |
| `INNGEST_POSTGRES_DB` | Same file; Inngest PostgreSQL and health check | No | Required; equals the URI database component. |
| `INNGEST_POSTGRES_USER` | Same file; Inngest PostgreSQL and health check | No | Required; equals the URI user component. |
| `INNGEST_POSTGRES_PASSWORD` | Same file; Inngest PostgreSQL | Yes | Required; equals the URI password component. |

### PgDog file alignment

```text
APP_POSTGRES_USER     == users.toml [[users]].name
APP_POSTGRES_PASSWORD == users.toml [[users]].password
APP_POSTGRES_DB       == pgdog.toml [[databases]].name
DATABASE_URL user/password/database match the same values
DATABASE_URL host     == app-pgdog
pgdog.toml backend    == app-postgres:5432
```

`users.toml.example` and every `.env.example` are examples, not secrets.
Preserve `pub_sub_channel_size = 4096` in `pgdog.toml` for live updates.

## Network, exposure, and persistence

The PgDog/PostgreSQL stack creates the literal Docker network `mihc-network`.
Operators must not create it manually. Inngest and both application stacks
declare it external, so they fail if Foundation 1 has not created it.

`6432:6432` on PgDog is the only fixed host publication in the supplied
production models. Firewall it or use platform isolation. Next.js, Playwright,
Inngest, both PostgreSQL containers, and Redis use `expose` only. The reverse
proxy or platform must join or route to `mihc-network` to reach Next.js on
port `3000`; route no other production service publicly. The proxy must pass
`text/event-stream` without buffering and allow idle connections longer than
the 20-second SSE heartbeat.

Production volumes are `app-postgres-data`, `inngest-data`,
`inngest-postgres-data`, and `inngest-redis-data`. Independent Compose project
names prefix named volumes unless the platform overrides the project name.
Inspect existing volume names before migrating an already-running monolithic
deployment. Normal shutdown is `just docker deploy-down`; never use `down -v`.

## Plain Docker Compose deployment

From the repository root, create the four service-local environment files and
the ignored PgDog user configuration, then replace all example values:

```bash
cp docker/services/pgdog-postgres/.env.example docker/services/pgdog-postgres/.env
cp docker/services/inngest/.env.example docker/services/inngest/.env
cp docker/services/nextjs/.env.example docker/services/nextjs/.env
cp docker/services/playwright/.env.example docker/services/playwright/.env
cp docker/services/pgdog-postgres/files/users.toml.example \
  docker/services/pgdog-postgres/files/users.toml
```

Validate each resource without printing resolved secrets:

```bash
docker compose --env-file docker/services/pgdog-postgres/.env \
  -f docker/services/pgdog-postgres/compose.deploy.yml config --quiet
docker compose --env-file docker/services/inngest/.env \
  -f docker/services/inngest/compose.deploy.yml config --quiet
docker compose --env-file docker/services/nextjs/.env \
  -f docker/services/nextjs/compose.deploy.yml config --quiet
docker compose --env-file docker/services/playwright/.env \
  -f docker/services/playwright/compose.deploy.yml config --quiet
```

For private GHCR images, authenticate through standard input before pulling;
do not store a token in a file. Deploy the foundations and inspect them before
starting applications:

```bash
just docker deploy-foundations

docker compose --env-file docker/services/pgdog-postgres/.env \
  -f docker/services/pgdog-postgres/compose.deploy.yml ps
docker compose --env-file docker/services/inngest/.env \
  -f docker/services/inngest/compose.deploy.yml ps

just docker deploy-apps
```

Require healthy foundational services before `deploy-apps`. `just docker deploy`
is the ordered convenience command, not a substitute for reviewing health on a
first deployment. Use `just docker deploy-down` for reverse shutdown:
Playwright, Next.js, Inngest, then PgDog/PostgreSQL.

## Backup, update, rollback, and reset

Before every image pull, update, recreate, retry, rollback, or reset that may
run Next.js migrations, create and verify a current backup. Export the
configured non-secret database user/name without printing a password:

```bash
set -euo pipefail
umask 077
: "${APP_POSTGRES_USER:?export the configured non-secret database user}"
: "${APP_POSTGRES_DB:?export the configured non-secret database name}"
backup_path="mihc-production-$(date -u +%Y%m%dT%H%M%SZ).dump"

docker compose --env-file docker/services/pgdog-postgres/.env \
  -f docker/services/pgdog-postgres/compose.deploy.yml exec -T app-postgres \
  pg_dump -U "$APP_POSTGRES_USER" -d "$APP_POSTGRES_DB" -Fc > "$backup_path"
test -s "$backup_path"
docker compose --env-file docker/services/pgdog-postgres/.env \
  -f docker/services/pgdog-postgres/compose.deploy.yml exec -T app-postgres \
  pg_restore --list < "$backup_path" > /dev/null
printf 'Verified PostgreSQL archive: %s\n' "$backup_path"
```

If this gate fails, do not pull or recreate. Keep archives in the tested backup
destination and periodically restore one into a non-production database. Do
not use `set -x`, echo environment files, or print credentials.

Only after a successful backup, update applications in order:

```bash
docker compose --env-file docker/services/nextjs/.env \
  -f docker/services/nextjs/compose.deploy.yml pull nextjs
docker compose --env-file docker/services/playwright/.env \
  -f docker/services/playwright/compose.deploy.yml pull playwright
docker compose --env-file docker/services/nextjs/.env \
  -f docker/services/nextjs/compose.deploy.yml up -d --force-recreate nextjs
docker compose --env-file docker/services/playwright/.env \
  -f docker/services/playwright/compose.deploy.yml up -d --force-recreate playwright
```

Inspect each matching stack with `ps` and bounded `logs --tail=200`. If a
release fails, correct the cause, create another verified backup, then retry.

Rollback pins known-good semantic or `sha-*` tags. Run the backup gate again,
then create one temporary override per application; do not use a combined
override because each Compose invocation owns one application service.

```bash
set -euo pipefail
: "${NEXTJS_ROLLBACK_TAG:?set a known-good semantic or sha-* tag}"
: "${PLAYWRIGHT_ROLLBACK_TAG:?set a known-good semantic or sha-* tag}"

nextjs_rollback_override=/tmp/mihc-nextjs-rollback.compose.yml
playwright_rollback_override=/tmp/mihc-playwright-rollback.compose.yml

cat > "$nextjs_rollback_override" <<YAML
services:
  nextjs:
    image: ghcr.io/markvalenzuela-mmdc/mihc-nextjs:${NEXTJS_ROLLBACK_TAG}
YAML

cat > "$playwright_rollback_override" <<YAML
services:
  playwright:
    image: ghcr.io/markvalenzuela-mmdc/mihc-playwright:${PLAYWRIGHT_ROLLBACK_TAG}
YAML

docker compose --env-file docker/services/nextjs/.env \
  -f docker/services/nextjs/compose.deploy.yml -f "$nextjs_rollback_override" \
  config --quiet
docker compose --env-file docker/services/nextjs/.env \
  -f docker/services/nextjs/compose.deploy.yml -f "$nextjs_rollback_override" \
  pull nextjs
docker compose --env-file docker/services/nextjs/.env \
  -f docker/services/nextjs/compose.deploy.yml -f "$nextjs_rollback_override" \
  up -d --force-recreate nextjs

docker compose --env-file docker/services/playwright/.env \
  -f docker/services/playwright/compose.deploy.yml -f "$playwright_rollback_override" \
  config --quiet
docker compose --env-file docker/services/playwright/.env \
  -f docker/services/playwright/compose.deploy.yml -f "$playwright_rollback_override" \
  pull playwright
docker compose --env-file docker/services/playwright/.env \
  -f docker/services/playwright/compose.deploy.yml -f "$playwright_rollback_override" \
  up -d --force-recreate playwright
```

Keep each override in use until a fixed release is selected. Image rollback
does not reverse migrations; repair schema problems with a forward Drizzle
migration.

`DATABASE_RESET=true` is destructive and never a troubleshooting shortcut.
Run the backup gate immediately before it. The following bounded check waits at
most two minutes, verifies the release log, and reports Next.js status without
using unbounded log following:

```bash
wait_for_database_release() {
  release_seen=false
  for _ in $(seq 1 24); do
    if docker compose --env-file docker/services/nextjs/.env \
      -f docker/services/nextjs/compose.deploy.yml \
      logs --since=3m nextjs 2>&1 | grep -Fq "Database release completed."; then
      release_seen=true
      break
    fi
    sleep 5
  done
  test "$release_seen" = true
  docker compose --env-file docker/services/nextjs/.env \
    -f docker/services/nextjs/compose.deploy.yml ps nextjs
}
```

Set `DATABASE_RESET=true` only in `docker/services/nextjs/.env`, then recreate
Next.js and run the bounded verification:

```bash
grep -Fx 'DATABASE_RESET=true' docker/services/nextjs/.env > /dev/null
docker compose --env-file docker/services/nextjs/.env \
  -f docker/services/nextjs/compose.deploy.yml up -d --force-recreate nextjs
wait_for_database_release
```

Immediately restore `DATABASE_RESET=false`, verify it, recreate Next.js a
second time, and run the bounded check again:

```bash
grep -Fx 'DATABASE_RESET=false' docker/services/nextjs/.env > /dev/null
docker compose --env-file docker/services/nextjs/.env \
  -f docker/services/nextjs/compose.deploy.yml up -d --force-recreate nextjs
wait_for_database_release
```

If either check fails, inspect bounded `logs --tail=200 nextjs`, keep the
application unavailable, and investigate. Do not use `docker restart` or
`docker compose start`, which retain the old container environment and can
repeat the reset.

## Coolify and Dokploy

Create four repository-backed Docker Compose resources/applications using
these exact paths, deployed foundation-first:

1. `docker/services/pgdog-postgres/compose.deploy.yml`
2. `docker/services/inngest/compose.deploy.yml`
3. `docker/services/nextjs/compose.deploy.yml`
4. `docker/services/playwright/compose.deploy.yml`

Provide persistent secret-backed material for each service-local `.env` and
the ignored `docker/services/pgdog-postgres/files/users.toml`; it must survive
clones and redeploys. Attach each resource to the literal external network
name `mihc-network` after the PgDog/PostgreSQL resource creates it. Route only
Next.js to container port `3000`. Assign no public domain to PgDog, either
PostgreSQL container, Inngest, Redis, or Playwright.

Use the platform's persistent secret/config mechanism rather than tracking
credentials. Verify the resolved resource settings, persistent volumes, health,
and internal network attachment after each deployment.

## Verification and troubleshooting

After deployment, inspect each resource independently. Confirm foundational
services are healthy; Next.js logs `Database release completed.` before it
serves traffic; the configured maintainer and four Smoke Testing applications
are idempotent; Next.js reaches `app-pgdog:6432`; and Inngest reaches
`http://playwright:3939/api/inngest`. Externally probe only the HTTPS Next.js
route. Confirm all four production volumes persist across redeploys.

| Symptom | Check/fix |
|---|---|
| Consumer stack cannot start | Deploy PgDog/PostgreSQL first; it creates `mihc-network`. |
| PgDog authentication fails | Align `.env`, `users.toml`, `pgdog.toml`, and `DATABASE_URL`. |
| Next.js loops | Inspect its bounded logs and correct release configuration. |
| Browser uses an old origin | Rebuild Next.js after changing the GitHub Actions public URL. |
| Hono does not register | Verify `INNGEST_SDK_URL=http://playwright:3939/api/inngest`. |
| SSE stalls | Disable proxy buffering and increase its idle timeout. |
| Data is missing after migration | Inspect project-prefixed volume names; never run `down -v`. |
