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

## Local commands

Validate local compose:

```bash
docker compose -f docker/compose.local.yml config