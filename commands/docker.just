[private]
default:
    @just --list docker

# Start or stop local Docker Compose services
local action="up":
    @docker compose -f "{{ justfile_directory() }}/docker/compose.local.yml" {{action}} {{if action == "up" { "-d" } else { "" }}}

# Build Docker images and start the build stack
build rebuild="":
    @docker compose --env-file "{{ justfile_directory() }}/docker/.env.build" -f "{{ justfile_directory() }}/docker/compose.build.yml" build {{if rebuild == "force" { "--no-cache" } else { "" }}} && docker compose --env-file "{{ justfile_directory() }}/docker/.env.build" -f "{{ justfile_directory() }}/docker/compose.build.yml" up -d

# Hard-reset the build database, then restart the production-like app services
build-reset:
    @docker compose --env-file "{{ justfile_directory() }}/docker/.env.build" -f "{{ justfile_directory() }}/docker/compose.build.yml" -p docker stop nextjs playwright
    @docker compose --env-file "{{ justfile_directory() }}/docker/.env.build" -f "{{ justfile_directory() }}/docker/compose.build.yml" -p docker --profile reset run --rm -e DATABASE_RESET_CONFIRMATION=reset-local-build db-reset
    @docker compose --env-file "{{ justfile_directory() }}/docker/.env.build" -f "{{ justfile_directory() }}/docker/compose.build.yml" -p docker up -d nextjs playwright

# Stop and remove the project's Docker services started by any Compose file
down:
    @docker compose -p docker down

# Start or stop deploy Docker Compose services
deploy action="up":
    @docker compose --env-file "{{ justfile_directory() }}/docker/.env.deploy" -f "{{ justfile_directory() }}/docker/compose.deploy.yml" {{action}} {{if action == "up" { "-d" } else { "" }}}
