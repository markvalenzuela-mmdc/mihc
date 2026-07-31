[private]
default:
    @just --list docker

# Start or stop local Docker Compose services
local action="up":
    @docker compose -f "{{ justfile_directory() }}/docker/compose.local.yml" {{action}} {{if action == "up" { "-d" } else { "" }}}

# Build Docker images and start the build stack
build rebuild="":
    @docker compose --env-file "{{ justfile_directory() }}/docker/.env.build" -f "{{ justfile_directory() }}/docker/compose.build.yml" build {{if rebuild == "force" { "--no-cache" } else { "" }}} && docker compose --env-file "{{ justfile_directory() }}/docker/.env.build" -f "{{ justfile_directory() }}/docker/compose.build.yml" up -d

# Stop and remove the project's Docker services started by any Compose file
down:
    @docker compose -p docker down

# Deploy foundational services first, then application services
deploy:
    @just docker deploy-foundations
    @just docker deploy-apps

# Deploy PostgreSQL/PgDog first so it creates mihc-network, then Inngest
deploy-foundations:
    @docker compose --env-file "{{ justfile_directory() }}/docker/services/pgdog-postgres/.env" -f "{{ justfile_directory() }}/docker/services/pgdog-postgres/compose.deploy.yml" up -d
    @docker compose --env-file "{{ justfile_directory() }}/docker/services/inngest/.env" -f "{{ justfile_directory() }}/docker/services/inngest/compose.deploy.yml" up -d

# Deploy application services after foundational services are healthy
deploy-apps:
    @docker compose --env-file "{{ justfile_directory() }}/docker/services/nextjs/.env" -f "{{ justfile_directory() }}/docker/services/nextjs/compose.deploy.yml" up -d
    @docker compose --env-file "{{ justfile_directory() }}/docker/services/playwright/.env" -f "{{ justfile_directory() }}/docker/services/playwright/compose.deploy.yml" up -d

# Stop independent deployment stacks in reverse dependency order
deploy-down:
    @docker compose --env-file "{{ justfile_directory() }}/docker/services/playwright/.env" -f "{{ justfile_directory() }}/docker/services/playwright/compose.deploy.yml" down
    @docker compose --env-file "{{ justfile_directory() }}/docker/services/nextjs/.env" -f "{{ justfile_directory() }}/docker/services/nextjs/compose.deploy.yml" down
    @docker compose --env-file "{{ justfile_directory() }}/docker/services/inngest/.env" -f "{{ justfile_directory() }}/docker/services/inngest/compose.deploy.yml" down
    @docker compose --env-file "{{ justfile_directory() }}/docker/services/pgdog-postgres/.env" -f "{{ justfile_directory() }}/docker/services/pgdog-postgres/compose.deploy.yml" down
