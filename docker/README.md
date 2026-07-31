# Docker

This directory contains local, build, and production Compose configuration for
MIHC.

## Compose files

- `compose.local.yml` — local infrastructure entrypoint.
- `compose.build.yml` — production-image build/test entrypoint.
- `services/pgdog-postgres/compose.deploy.yml` — production Foundation 1;
  creates `mihc-network`.
- `services/inngest/compose.deploy.yml` — production Foundation 2; uses the
  external `mihc-network`.
- `services/nextjs/compose.deploy.yml` — production web application; uses the
  external `mihc-network` and exposes container port `3000`.
- `services/playwright/compose.deploy.yml` — production consumer; uses the
  external `mihc-network` and exposes container port `3939`.
- `services/pgadmin/compose.yml` — local-only pgAdmin; never provision it for
  production.

Each service owns its example environment file. Production also requires the
PgDog `services/pgdog-postgres/files/pgdog.toml` and ignored
`services/pgdog-postgres/files/users.toml`. See [DEPLOYMENT.md](DEPLOYMENT.md)
for Coolify or Dokploy configuration and the required deployment order.

Use `just docker local up` / `just docker local down` for local infrastructure.
