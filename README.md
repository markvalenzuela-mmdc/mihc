## Dependencies

- [just](https://github.com/casey/just) — command runner (`brew install just` / `cargo install just`)
- [pnpm](https://pnpm.io/installation) — package manager
- [Docker](https://docker.com) — containerization

## Quick Start

```bash
just setup    # install dependencies
just dev      # start Next.js dev server
```

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
just setup

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
