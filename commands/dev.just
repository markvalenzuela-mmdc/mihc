# Start the Next.js development server
[private]
default:
    cd "{{ justfile_directory() }}/nextjs" && pnpm run dev

# Run Next.js unit and integration tests
test:
    cd "{{ justfile_directory() }}/nextjs" && pnpm run test

# Start local Docker services, reset the database, and run the development server
fresh:
    just docker local up
    just db reset
    just dev
