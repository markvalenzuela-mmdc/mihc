# Docker Commands

## Overview

The project has four Docker workflows, each with a distinct purpose. They share infrastructure services (PostgreSQL, PgDog, Redis, Inngest, pgAdmin) but differ in what they run alongside them.

## Commands

### `just docker-local up|down`

Starts or stops **infrastructure only** ΓÇö the shared services that both the Next.js app and the Playwright consumer depend on. Does not run the application or test servers.

**Services started:**
- PostgreSQL (`app-postgres`)
- PgDog connection pooler (`app-pgdog`, port `6432`)
- Inngest server (`inngest`, port `8288`)
- Inngest PostgreSQL + Redis
- pgAdmin (`pgadmin`, port `5050`)

**Use when:** You want to run the app locally via `pnpm dev` or run Playwright tests against a local database.

```bash
just docker-local up      # start infrastructure
just docker-local down    # stop infrastructure
```

Uses `docker/compose.local.yml`.

---

### `just dev-fresh`

Full local development setup: starts infrastructure, resets the database, then runs the Next.js dev server. Equivalent to:

```bash
just docker-local up
just db-reset
just dev
```

**Use when:** Starting a fresh development session from scratch.

---

### `just docker-build [force]`

Builds Docker images and starts the containerized Next.js application. Unlike the commands above, the Next.js app runs **inside a Docker container** rather than directly on your machine.

```bash
just docker-build       # build with cache
just docker-build force # force rebuild without cache
```

This builds images for both `nextjs/` and `playwright/` using their Dockerfiles, then starts containers alongside the shared infrastructure. Pass `force` to add `--no-cache` to the build step.

The app is available at `http://localhost:3000`.

**Use when:** You want to test the production Docker build or run the app fully containerized.

Uses `docker/compose.build.yml`.

---

### `just docker-deploy up|down`

Starts or stops the **deployment-oriented stack** ΓÇö services configured for a Coolify or production-like environment. Uses shared Postgres + PgBouncer (instead of PgDog) and a shared Redis for Inngest.

```bash
just docker-deploy up      # start deploy stack
just docker-deploy down    # stop deploy stack
```

Uses `docker/compose.deploy.yml`.

**Services started:**
- PostgreSQL (`postgres`)
- PgBouncer connection pooler (`pgbouncer`)
- Redis (`redis`)
- Inngest server (`inngest`, port `8288`)
- pgAdmin (`pgadmin`, port `5050`)
- Next.js app (`nextjs`, port `3000`) ΓÇö pulled from `ghcr.io/markvalenzuela-mmdc/mihc-nextjs`

**Use when:** You want to run the full stack using the published Docker image against shared infrastructure, matching the Coolify deployment topology.

---

### `just docker-down`

Stops and removes all project Docker services, regardless of which compose file started them.

```bash
just docker-down
```

This runs `docker compose -p docker down`, targeting the `docker` project name shared by `compose.local.yml`, `compose.build.yml`, and `compose.deploy.yml`.

**Use when:** You want to stop all Docker services for this project.

---

## Environment Files

### `nextjs/.env` ΓÇö Local development

Used by `just dev` and `just dev-fresh`. All service hostnames use `localhost` since you're running outside Docker:

| Var | Host |
|---|---|
| `DATABASE_URL` | `localhost:6432` (PgDog via host port) |
| `INNGEST_BASE_URL` | `localhost:8288` (Inngest via host port) |

### `docker/.env.build` ΓÇö Docker build

Used by `just docker-build`. All service hostnames use Docker service names since the app runs **inside** the container and reaches services via the internal Docker network:

| Var | Host |
|---|---|
| `DATABASE_URL` | `app-pgdog:6432` (PgDog via Docker DNS) |
| `INNGEST_BASE_URL` | `inngest:8288` (Inngest via Docker DNS) |

The `.env.build` file is a copy of `nextjs/.env` with `localhost` replaced by the appropriate Docker service names. Client-facing vars like `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` keep `localhost:3000` since they are used by the browser, not internal service calls.

### Why not share a single .env?

`localhost` inside a Docker container refers to the container itself, not your host machine. Docker service names like `app-pgdog` only resolve inside the Docker Compose network. A single env file can't serve both contexts, so we maintain two ΓÇö one for each environment.
