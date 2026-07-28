[private]
default:
    @just --list db

# Generate database migrations
generate:
    cd "{{ justfile_directory() }}/nextjs" && pnpm run db:generate

# Apply database migrations
migrate:
    cd "{{ justfile_directory() }}/nextjs" && pnpm run db:migrate

# Seed the database
seed:
    cd "{{ justfile_directory() }}/nextjs" && pnpm run db:seed

# Apply migrations and production bootstrap; requires NODE_ENV=production and production secrets
release:
    cd "{{ justfile_directory() }}/nextjs" && pnpm run db:release

# DANGER: Permanently drop, recreate, migrate, and seed the configured database
[confirm("DANGER: This permanently drops and recreates the configured database. Continue? [Y/n]")]
reset:
    cd "{{ justfile_directory() }}/nextjs" && pnpm run db:reset
