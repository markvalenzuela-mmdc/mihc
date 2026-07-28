[private]
default:
    @just --list docker

# Start or stop local Docker Compose services
local action="up":
    @docker compose -f "{{ justfile_directory() }}/docker/compose.local.yml" {{action}} {{if action == "up" { "-d" } else { "" }}}

# Build Docker images and start the build stack
build rebuild="":
    @docker compose -f "{{ justfile_directory() }}/docker/compose.build.yml" build {{if rebuild == "force" { "--no-cache" } else { "" }}} && docker compose -f "{{ justfile_directory() }}/docker/compose.build.yml" up -d

# Stop and remove the project's Docker services started by any Compose file
down:
    @docker compose -p docker down

# Start or stop deploy services using the shared immutable image tag from .env.deploy
deploy action="up":
    @docker compose --env-file "{{ justfile_directory() }}/docker/.env.deploy" -f "{{ justfile_directory() }}/docker/compose.deploy.yml" {{action}} {{if action == "up" { "-d" } else { "" }}}
