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
    build       Build for production
    lint        Lint check
    typecheck   TypeScript check
    setup       Install dependencies

  docker
    docker-local up|down  Start or stop local Docker Compose services
    build-docker  Build Docker images

  playwright
    test-playwright  Run Playwright tests

  all
    lint-all    Run all linters
    test-all    Run all tests
```

## Development Flow

```bash
# First time setup
just docker-local up
just setup
just db-migrate
just db-seed

# Start developing
just dev

# Before committing
just lint        # check for lint errors
just typecheck   # verify types

# Build and test
just build
```

## Extending the Justfile

See [`docs/justfile-conventions.md`](docs/justfile-conventions.md) for conventions on adding new commands.
