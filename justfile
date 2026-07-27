# Application commands
mod app 'commands/app.just'

# Verification commands
mod check 'commands/check.just'

# Database commands
mod db 'commands/db.just'

# Development commands
mod dev 'commands/dev.just'

# Docker commands
mod docker 'commands/docker.just'

# Playwright and consumer commands
mod playwright 'commands/playwright.just'

[private]
default:
    @just --list --list-submodules --unsorted
