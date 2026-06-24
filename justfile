# ──────────────────────────────────────────────
# mihc — multi-project command runner
# ──────────────────────────────────────────────

project_root := "."

# Start Next.js dev server
dev:
    cd {{project_root}}/nextjs && pnpm run dev

# Build Next.js for production
build:
    cd {{project_root}}/nextjs && pnpm run build

# Lint Next.js
lint:
    cd {{project_root}}/nextjs && pnpm run lint

# TypeScript check
typecheck:
    cd {{project_root}}/nextjs && npx tsc --noEmit

# Install all dependencies
setup:
    cd {{project_root}}/nextjs && pnpm install

# Run all linters
lint-all: lint

# Run all tests
test-all:
    echo "No tests configured yet"

# Build Docker images
build-docker:
    echo "Docker not configured yet"

# Run Playwright tests
test-playwright:
    echo "Playwright not configured yet"
