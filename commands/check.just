[private]
default:
    @just --list check

# Run the Next.js linter
lint:
    cd "{{ justfile_directory() }}/nextjs" && pnpm run lint

# Run the Next.js TypeScript check
typecheck:
    cd "{{ justfile_directory() }}/nextjs" && npx tsc --noEmit

# Run all linters
lint-all: lint

# Run every test suite
test-all:
    just dev test
    just playwright unit
    just playwright smoke
    just playwright e2e
