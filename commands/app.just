[private]
default:
    @just --list app

# Build for production
build:
    cd "{{ justfile_directory() }}/nextjs" && pnpm run build

# Install Next.js dependencies
setup:
    cd "{{ justfile_directory() }}/nextjs" && pnpm install
