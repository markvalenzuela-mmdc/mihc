project_root := "."

_default:
    @echo ""
    @echo "  nextjs"
    @echo "    dev         Start dev server"
    @echo "    build       Build for production"
    @echo "    lint        Lint check"
    @echo "    typecheck   TypeScript check"
    @echo "    setup       Install dependencies"
    @echo "    db-generate Generate database migrations"
    @echo "    db-migrate  Apply database migrations"
    @echo "    db-seed     Seed the database"
    @echo "    db-reset    DANGER: Drop, recreate, migrate, and seed the database"
    @echo ""
    @echo "  docker"
    @echo "    docker-local up|down  Start or stop local Docker Compose services"
    @echo "    build-docker  Build Docker images"
    @echo ""
    @echo "  playwright"
    @echo "    test-playwright       Run smoke tests (live MMDC website)"
    @echo "    test-playwright-unit  Run consumer unit tests"
    @echo "    serve-playwright      Start the Inngest consumer server"
    @echo ""
    @echo "  all"
    @echo "    lint-all    Run all linters"
    @echo "    test-all    Run all tests"
    @echo ""

# ─────────────── nextjs ───────────────

# Start dev server
dev:
    cd {{project_root}}/nextjs && pnpm run dev

# Build for production
build:
    cd {{project_root}}/nextjs && pnpm run build

# Lint
lint:
    cd {{project_root}}/nextjs && pnpm run lint

# TypeScript check
typecheck:
    cd {{project_root}}/nextjs && npx tsc --noEmit

# Install dependencies
setup:
    cd {{project_root}}/nextjs && pnpm install

# Generate database migrations
db-generate:
    cd {{project_root}}/nextjs && pnpm run db:generate

# Apply database migrations
db-migrate:
    cd {{project_root}}/nextjs && pnpm run db:migrate

# Seed the database
db-seed:
    cd {{project_root}}/nextjs && pnpm run db:seed

# DANGER: Permanently drop, recreate, migrate, and seed the configured database
[confirm("DANGER: This permanently drops and recreates the configured database. Continue? [Y/n]")]
db-reset:
    cd {{project_root}}/nextjs && pnpm run db:reset

# ─────────────── docker ───────────────

# Start or stop local Docker Compose services
docker-local action="up":
    @docker compose -f "{{project_root}}/docker/compose.local.yml" {{action}} {{if action == "up" { "-d" } else { "" }}}

# Build Docker images
build-docker:
    echo "Docker not configured yet"

# ─────────────── playwright ───────────────

# Run the smoke suite against the live MMDC website (chromium)
test-playwright:
    cd {{project_root}}/playwright && pnpm run test:smoke

# Run the consumer unit tests (pure result mapping)
test-playwright-unit:
    cd {{project_root}}/playwright && pnpm run test:unit

# Start the Inngest consumer server (Hono; spawns the suite on request)
serve-playwright:
    cd {{project_root}}/playwright && pnpm run serve

# ─────────────── all ───────────────

# Run all linters
lint-all: lint

# Run all tests
test-all: test-playwright-unit test-playwright
