## Dependencies

- [just](https://github.com/casey/just) — command runner (`brew install just` / `cargo install just`)
- [pnpm](https://pnpm.io/installation) — package manager
- [Docker](https://docker.com) — containerization

## Quick Start

```bash
just docker-local up  # start local PostgreSQL/PgDog, Inngest, Redis, and pgAdmin
just setup            # install dependencies
just db-migrate       # apply database migrations
just db-seed          # seed the local database
just dev              # start Next.js dev server
```

Local database connections go through PgDog on `localhost:6432`. pgAdmin is available at `http://localhost:5050`.

Stop local infrastructure with:

```bash
just docker-local down
```

See [`docs/containerized-infrastructure.md`](docs/containerized-infrastructure.md) for pgAdmin registration steps and service-specific environment files.

## Folder Structure

| Directory      | Purpose                                                |
| -------------- | ------------------------------------------------------ |
| `nextjs/`      | Main web application (Next.js)                         |
| `playwright/`  | End-to-end test suite                                  |
| `docker/`      | Docker Compose files for containers                    |
| `docs/`        | Documentation, design docs, and project references     |

## Commands

Run `just` to see all available commands grouped by project:

```text
  nextjs
    dev         Start dev server
    dev-local   Start Docker services, reset database, and run dev server
    build       Build for production
    lint        Lint check
    typecheck   TypeScript check
    setup       Install dependencies
    db-migrate  Apply database migrations
    db-seed     Seed the database
    db-reset    DANGER: Drop, recreate, migrate, and seed the database

  docker
    docker-local up|down  Start or stop local Docker Compose services
    build-docker  Build Docker images

  playwright
    test-playwright       Run smoke tests (live MMDC website)
    test-playwright-unit  Run consumer unit tests
    serve-playwright      Start the Inngest consumer server

  all
    lint-all    Run all linters
    test-all    Run all tests
```

## Development Flow

### First-time setup

```bash
just docker-local up
just setup
just db-migrate
just db-seed
```

### Local development (two tabs)

The app and the Inngest consumer server run as separate processes. Open two terminals:

**Tab 1 — Next.js app** (Docker, database reset, dev server):

```bash
just dev-local
```

This starts Docker services, resets the database, and runs the Next.js dev server on `http://localhost:3000`.

**Tab 2 — Playwright consumer server** (Inngest event handling):

```bash
just serve-playwright
```

This starts the Hono server on `http://localhost:3939` that handles Inngest events.

### Before committing

```bash
just lint        # check for lint errors
just typecheck   # verify types

# Build and test
just build
```

## Environment Variables

### Next.js (`nextjs/.env`)

| Var | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string via PgDog (`localhost:6432`) |
| `NEXT_PUBLIC_APP_URL` | Public-facing app URL (`http://localhost:3000`) |
| `BETTER_AUTH_SECRET` | Secret key for Better Auth — generate a random string |
| `BETTER_AUTH_URL` | Auth callback URL (`http://localhost:3000`) |

See `nextjs/.env.example` for defaults.

### Playwright (`playwright/.env`)

| Var | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string via PgDog |
| `INNGEST_BASE_URL` | Inngest server URL (`http://localhost:8288`) |
| `INNGEST_EVENT_KEY` | Event key for sending events to Inngest |
| `INNGEST_SIGNING_KEY` | Signing key for Inngest webhook verification |
| `INNGEST_DEV` | Set to `1` for local Inngest dev mode |
| `PORT` | Consumer server port (`3939`) |

See `playwright/.env.example` for defaults.

Additional test-run env vars are documented in `playwright/AGENTS.md`.

## Extending the Justfile

See [`docs/justfile-conventions.md`](docs/justfile-conventions.md) for conventions on adding new commands.
