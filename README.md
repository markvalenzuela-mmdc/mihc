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

When adding a new command, follow these conventions:

1. **Place it under the right section** — add a `# ─────────────── section ───────────────` header if one doesn't exist, then place the recipe underneath.
2. **Keep it thin** — each recipe should delegate to the project's own tooling, not inline logic.
3. **Use `project_root`** — reference paths as `{{project_root}}/subdir/` instead of hardcoding.
4. **Add a description comment** — the line above the recipe is shown in `just --list`.
5. **Use `@` for silent commands** — prefix with `@` when output shouldn't be echoed.

```make
# ─────────────── my-section ───────────────

# Run my tool
my-command:
    cd {{project_root}}/my-dir && some-tool
```

If the command applies across multiple projects, add it under the `all` section using dependencies:

```make
# Run everything
check-all: lint typecheck my-command
```
