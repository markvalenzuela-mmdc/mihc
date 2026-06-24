project_root := "."

_default:
    @echo ""
    @echo "  nextjs"
    @echo "    dev         Start dev server"
    @echo "    build       Build for production"
    @echo "    lint        Lint check"
    @echo "    typecheck   TypeScript check"
    @echo "    setup       Install dependencies"
    @echo ""
    @echo "  docker"
    @echo "    build-docker  Build Docker images"
    @echo ""
    @echo "  playwright"
    @echo "    test-playwright  Run Playwright tests"
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

# ─────────────── docker ───────────────

# Build Docker images
build-docker:
    echo "Docker not configured yet"

# ─────────────── playwright ───────────────

# Run Playwright tests
test-playwright:
    echo "Playwright not configured yet"

# ─────────────── all ───────────────

# Run all linters
lint-all: lint

# Run all tests
test-all:
    echo "No tests configured yet"
