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
| Local pgAdmin | `docker/services/pgadmin/compose.yml` |

## Databases and PgDog

`app-postgres` holds the application database and is reached through PgDog. `inngest-postgres` is dedicated to Inngest. PgDog reads `docker/services/pgdog-postgres/files/`; keep its users, database routes, and application `DATABASE_URL` values aligned.

From the host, use `postgresql://<username>:<password>@localhost:6432/mihc?sslmode=disable`. After changing local PgDog routes or user access, run `docker compose -f docker/compose.local.yml restart app-pgdog`.

## Local pgAdmin registration

pgAdmin is a local development convenience only. Open `http://localhost:5050` and sign in with its local secret configuration.

For the application database, register `app-pgdog`, port `6432`, database `mihc`, with `APP_POSTGRES_USER` and `APP_POSTGRES_PASSWORD` from `docker/services/pgdog-postgres/.env`. For Inngest PostgreSQL, register `inngest-postgres`, port `5432`, database `inngest`, with `INNGEST_POSTGRES_*` from `docker/services/inngest/.env`. Use service names rather than `localhost` because pgAdmin runs inside Docker.

## Production deployment

Use [`../docker/DEPLOYMENT.md`](../docker/DEPLOYMENT.md) for the individual
Coolify or Dokploy resources, production environments, `mihc-network`, PgDog
files, and deployment order. pgAdmin remains local-only.

## Smoke Testing live updates

Smoke Testing uses PostgreSQL `LISTEN`/`NOTIFY` through PgDog. Keep `pub_sub_channel_size = 4096` in PgDog configuration. The production proxy must pass `text/event-stream` without buffering and allow idle connections longer than the 20-second SSE heartbeat.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Local PgDog cannot load configuration | Missing or incorrect local TOML file | Check `docker/services/pgdog-postgres/files/`. |
| Local pgAdmin cannot connect | Host is `localhost` inside pgAdmin | Use `app-pgdog` or `inngest-postgres`. |
| Local application cannot connect | Host URL bypasses PgDog | Use `localhost:6432`. |
| Local 5050 or 6432 conflict | Another service owns the port | Stop it or change the local mapping. |
