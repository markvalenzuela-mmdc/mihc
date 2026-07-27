[private]
default:
    @just --list playwright

# Run the smoke suite against the live MMDC website
smoke:
    cd "{{ justfile_directory() }}/playwright" && pnpm run test:smoke

# Run the E2E suite against the live EnrollMate UAT
e2e:
    cd "{{ justfile_directory() }}/playwright" && pnpm run test:e2e

# Run consumer server unit tests
unit:
    cd "{{ justfile_directory() }}/playwright" && pnpm run test:unit

# Start the Inngest consumer server
serve:
    cd "{{ justfile_directory() }}/playwright" && pnpm run serve
