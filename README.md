## Dependencies

- [just](https://github.com/casey/just) — command runner (`brew install just` / `cargo install just`)
- [pnpm](https://pnpm.io/installation) — package manager
- [Docker](https://docker.com) — containerization

## Quick Start

```bash
just docker local up  # start local PostgreSQL/PgDog, Inngest, Redis, and pgAdmin
just app setup        # install dependencies
just db migrate       # apply database migrations
just db seed          # seed the local database
just dev              # start Next.js dev server
```

Local database connections go through PgDog on `localhost:6432`. pgAdmin is available at `http://localhost:5050`.

Stop local infrastructure with:

```bash
just docker local down
```

See [`docs/containerized-infrastructure.md`](docs/containerized-infrastructure.md) for pgAdmin registration steps and service-specific environment files.

## Folder Structure

| Directory      | Purpose                                                |
| -------------- | ------------------------------------------------------ |
| `nextjs/`      | Main web application (Next.js)                         |
| `packages/`    | Shared application contracts, including EnrollMate     |
| `playwright/`  | Browser smoke suite plus server consumer/unit tests    |
| `docker/`      | Docker Compose files for containers                    |
| `docs/`        | Documentation, design docs, and project references     |
| `commands/`    | Namespaced Just recipes                                |

See [`docs/docker-commands.md`](docs/docker-commands.md) for details on each Docker workflow and the difference between `nextjs/.env` and `docker/.env.build`.
See [`docs/README.md`](docs/README.md) for the source-of-truth map, AI-agent
workflow, and current versus historical design documents.

## Commands

The executable inventory is the root `justfile` and `commands/*.just`. Run
`just` to list every namespace, or `just app`, `just check`, `just db`,
`just docker`, or `just playwright` to list one namespace. Bare `just dev`
starts the normal development server; `just dev test` and `just dev fresh`
select its other workflows.

| Namespace | Command | Purpose |
|---|---|---|
| app | `just app build` | Build the production application |
| app | `just app setup` | Install Next.js dependencies |
| check | `just check lint` | Run the Next.js linter |
| check | `just check typecheck` | Run the Next.js TypeScript check |
| check | `just check lint-all` | Run all linters |
| check | `just check test-all` | Run every Next.js and Playwright test suite |
| db | `just db generate` | Generate database migrations |
| db | `just db migrate` | Apply database migrations |
| db | `just db seed` | Development only: seed database fixtures |
| db | `just db release` | Production only: apply Drizzle migrations and bootstrap the maintainer plus Smoke Testing apps |
| db | `just db reset` | Development only: destructively reset, migrate, and seed the database |
| dev | `just dev` | Start the normal Next.js development server |
| dev | `just dev test` | Run Next.js unit and integration tests |
| dev | `just dev fresh` | Start Docker, reset the database, and start development |
| docker | `just docker local [up\|down]` | Start or stop local Compose services; defaults to `up` |
| docker | `just docker build [force]` | Build and start Docker images; `force` disables cache |
| docker | `just docker down` | Stop all project Docker services |
| docker | `just docker deploy [up\|down]` | Start or stop deploy Compose services; defaults to `up` |
| playwright | `just playwright smoke` | Run browser smoke tests against live MMDC |
| playwright | `just playwright e2e` | Run E2E tests against EnrollMate UAT |
| playwright | `just playwright unit` | Run server-only consumer unit tests |
| playwright | `just playwright serve` | Start the Inngest consumer server |

`just db migrate` applies migrations manually in development. `just db seed`
loads complete development fixtures, and `just db release` manually runs the
same production migrate/bootstrap sequence. `just db reset` permanently resets
the configured database after confirmation. Never run it against production.

## Development Flow

### First-time setup

```bash
just docker local up
just app setup
just db migrate
just db seed
```

### Local development (two tabs)

The app and the Inngest consumer server run as separate processes. Open two terminals:

**Tab 1 — Next.js app** (Docker, database reset, dev server):

```bash
just dev fresh
```

This starts Docker services, resets the database, and runs the Next.js dev server on `http://localhost:3000`.

**Tab 2 — Playwright consumer server** (Inngest event handling):

```bash
just playwright serve
```

This starts the Hono server on `http://localhost:3939` that handles Inngest events.

### Before committing

```bash
git status --short --branch
git diff

just check lint        # check for lint errors
just check typecheck   # verify types

# Build and test
just dev test
just app build
```

## Environment Variables

### Next.js (`nextjs/.env`)

| Var | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string via PgDog (`localhost:6432`) |
| `NEXT_PUBLIC_APP_URL` | Public-facing app URL (`http://localhost:3000`) |
| `BETTER_AUTH_SECRET` | Secret key for Better Auth — generate at least 32 random characters |
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

### Production bootstrap (`docker/.env.deploy`)

| Var | Description |
|---|---|
| `PROD_MAINTAINER_NAME` | Name for the production maintainer account |
| `PROD_MAINTAINER_EMAIL` | Email address for the production maintainer account |
| `PROD_MAINTAINER_PASSWORD` | Initial password used by startup bootstrap, then removed before the Next.js server starts |
| `DATABASE_RESET` | Set to `false` normally; see the startup reset contract below before setting it to `true` |

See `docker/.env.deploy.example` for the application deployment environment
template. The included infrastructure services continue to use their own
ignored service `.env` files, copied from the matching `.env.example` files.
`docker/.env.deploy` must contain deployment secrets.

The production Next.js container applies committed Drizzle migrations and runs
the idempotent production bootstrap before starting the Next.js server. If
migration or bootstrap fails, the server does not start and Docker retries the
container according to its restart policy.

`DATABASE_RESET=false` preserves application data while applying pending
migrations and production bootstrap data. `DATABASE_RESET=true` drops the
application `public` and `drizzle` schemas on every Next.js container startup,
then reapplies all migrations and production bootstrap data. Set it back to
`false` after the intended reset; automatic restarts repeat the deletion while
it remains `true`. The reset affects only the application PostgreSQL schemas
and does not erase Inngest PostgreSQL, Redis, or pgAdmin volumes.

Production bootstrap creates or validates the configured maintainer, upserts
the four Smoke Testing apps and eight E2E workflow step definitions, never
resets an existing password, and never loads development fixtures such as
profiles or run history.

## Extending the Justfile

See [`docs/justfile-conventions.md`](docs/justfile-conventions.md) for conventions on adding new commands.
