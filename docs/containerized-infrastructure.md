# Containerized Infrastructure

## Local infrastructure

Local development uses `docker/compose.local.yml` to run application PostgreSQL, PgDog, Inngest, its PostgreSQL database, Redis, and pgAdmin.

```bash
just docker local up
just docker local down
```

Local services use service-local `.env` files copied from examples. PgDog is available from the host on `localhost:6432`; pgAdmin is local-only at `http://localhost:5050`. Inngest and its dependencies use dynamically assigned host ports in the local model.

To intentionally destroy local data, run `docker compose -f docker/compose.local.yml down -v`. This is a local-development operation, not a production command.

## Compose files

| Workflow | Compose file(s) |
|---|---|
| Local infrastructure | `docker/compose.local.yml` and service `compose.yml` files |
| Build stack | `docker/compose.build.yml` |
| Production Foundation 1 | `docker/services/pgdog-postgres/compose.deploy.yml` |
| Production Foundation 2 | `docker/services/inngest/compose.deploy.yml` |
| Production Next.js | `docker/services/nextjs/compose.deploy.yml` |
| Production Playwright | `docker/services/playwright/compose.deploy.yml` |
| Local pgAdmin | `docker/services/pgadmin/compose.yml` |

## Databases and PgDog

`app-postgres` holds the application database and is reached through PgDog. `inngest-postgres` is dedicated to Inngest. PgDog reads `docker/services/pgdog-postgres/files/`; keep its users, database routes, and application `DATABASE_URL` values aligned.

From the host, use `postgresql://<username>:<password>@localhost:6432/mihc?sslmode=disable`. After changing local PgDog routes or user access, run `docker compose -f docker/compose.local.yml restart app-pgdog`.

## Local pgAdmin registration

pgAdmin is a local development convenience only. Open `http://localhost:5050` and sign in with its local secret configuration.

For the application database, register `app-pgdog`, port `6432`, database `mihc`, with `APP_POSTGRES_USER` and `APP_POSTGRES_PASSWORD` from `docker/services/pgdog-postgres/.env`. For Inngest PostgreSQL, register `inngest-postgres`, port `5432`, database `inngest`, with `INNGEST_POSTGRES_*` from `docker/services/inngest/.env`. Use service names rather than `localhost` because pgAdmin runs inside Docker.

## Deploy vs. local differences

| Aspect | Local | Production |
|---|---|---|
| Entry point | One local Compose workflow | Four independent service-owned Compose resources |
| Network | Local Compose network | PgDog/PostgreSQL creates `mihc-network`; all other stacks use it as external |
| pgAdmin | Available at local port `5050` | Not provisioned |
| Application reachability | Host development ports | Next.js is routed internally on `mihc-network` to port `3000` |
| Persistence | Development volumes may be destroyed intentionally | Preserve app, Inngest, Inngest PostgreSQL, and Redis volumes; never use `down -v` |

## Production deployment

Production starts with PgDog/PostgreSQL, which creates `mihc-network`; then Inngest; then Next.js and Playwright after foundations are healthy. `app-pgdog` publishes restricted host port `6432`; other supplied production services use `expose` only. The proxy or platform must reach Next.js through `mihc-network` on port `3000`.

Use [`../docker/DEPLOYMENT.md`](../docker/DEPLOYMENT.md) for production configuration, first deployment, PaaS resources, backups, reset safeguards, rollbacks, and verification. It intentionally contains no pgAdmin production procedure.

## Smoke Testing live updates

Smoke Testing uses PostgreSQL `LISTEN`/`NOTIFY` through PgDog. Keep `pub_sub_channel_size = 4096` in PgDog configuration. The production proxy must pass `text/event-stream` without buffering and allow idle connections longer than the 20-second SSE heartbeat.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Local PgDog cannot load configuration | Missing or incorrect local TOML file | Check `docker/services/pgdog-postgres/files/`. |
| Local pgAdmin cannot connect | Host is `localhost` inside pgAdmin | Use `app-pgdog` or `inngest-postgres`. |
| Local application cannot connect | Host URL bypasses PgDog | Use `localhost:6432`. |
| Local 5050 or 6432 conflict | Another service owns the port | Stop it or change the local mapping. |
