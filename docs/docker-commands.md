# Docker Commands

## Local and build workflows

`just docker local [up|down]` starts or stops local infrastructure: application PostgreSQL, PgDog on port `6432`, Inngest and its PostgreSQL/Redis dependencies, and local-only pgAdmin on port `5050`. It uses `docker/compose.local.yml` and does not start application containers.

```bash
just docker local up
just docker local down
```

`just docker build [force]` builds application images and starts the production-image test stack using `docker/compose.build.yml` and `docker/.env.build`; `force` disables the build cache. `just docker down` stops the shared local/build Docker project.

## Production deployment

Use [`../docker/DEPLOYMENT.md`](../docker/DEPLOYMENT.md) for the four individual
Coolify or Dokploy Compose resources, their environment and PgDog files, the
shared network, and deployment order.

## Environment boundaries

`nextjs/.env` is for host-local development and uses `localhost:6432`. `docker/.env.build` is for the containerized build stack and uses Docker DNS. Production environment files are service-owned:

| Service | Production environment file |
|---|---|
| PgDog/PostgreSQL | `docker/services/pgdog-postgres/.env` |
| Inngest | `docker/services/inngest/.env` |
| Next.js | `docker/services/nextjs/.env` |
| Playwright | `docker/services/playwright/.env` |

Values shared by application services must match the infrastructure values. Production does not use pgAdmin; its environment and port descriptions in this document apply only to local development.
