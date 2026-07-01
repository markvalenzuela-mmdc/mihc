# Containerized Infrastructure

## Overview

This setup provides local development and Coolify-ready infrastructure for:

- PostgreSQL
- PgBouncer connection pooler
- Redis
- self-hosted Inngest
- pgAdmin

No application code, schemas, migrations, Dockerfiles, or app images are included.

## Compose files

- `docker/compose.local.yml` — local development stack
- `docker/compose.deploy.yml` — Coolify deployment-oriented stack

## Local services

| Service | URL / Port |
|---|---|
| PostgreSQL direct | `localhost:5432` |
| PgBouncer pooled DB | `localhost:6432` |
| Redis | `localhost:6379` |
| Inngest | `http://localhost:8288` |
| pgAdmin | `http://localhost:5050` |

## Databases

One PostgreSQL server is used with two logical databases:

- `mihc_app` — application database
- `mihc_inngest` — Inngest database

`mihc_app` is created by `POSTGRES_DB`.
`mihc_inngest` is created by `docker/postgres/init/01-create-databases.sql`.

## Local Commands

Validate local compose:

```bash
docker compose -f docker/compose.local.yml config
```

Start local infrastructure:

```bash
docker compose -f docker/compose.local.yml up -d
```

Stop local infrastructure:

```bash
docker compose -f docker/compose.local.yml down
```

Destroy volumes (resets all data):

```bash
docker compose -f docker/compose.local.yml down -v
```

## Deploy vs Local Differences

| Aspect | Local | Deploy |
|---|---|---|
| Credentials | Hardcoded defaults | Supplied via env secrets |
| pgAdmin mode | Desktop mode, no login | Server mode + MFA |
| Port exposure | PostgreSQL, Redis, pooler exposed | Only Inngest and pgAdmin |
| Container names | Prefixed (mihc-*-local) | Default (compose project) |

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
| PostgreSQL fails to start | Port 5432 in use | Stop local PostgreSQL or change the host port |
| PgBouncer health check fails | PostgreSQL not ready yet | Wait; check `depends_on` conditions |
| Inngest cannot connect to DB | `mihc_inngest` database missing | Ensure init scripts are mounted |
| pgAdmin cannot connect to PostgreSQL | Wrong credentials | Check POSTGRES_USER / POSTGRES_PASSWORD |
| Port conflict on 5050 / 6379 / 8288 | Another service using the same port | Change the host port in compose file |
