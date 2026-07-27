# Modular Just Convention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace MIHC's flat Just command surface with the approved modular,
namespaced convention without changing recipe behavior.

**Architecture:** The root `justfile` is a module dispatcher. Focused files
under `commands/` own development, application, database, verification,
Docker, and Playwright workflows; the primary README documents the complete
public inventory.

**Tech Stack:** Just, pnpm, Docker Compose, Markdown

---

### Task 1: Create the executable command modules

**Files:**
- Create: `commands/app.just`
- Create: `commands/check.just`
- Create: `commands/db.just`
- Create: `commands/dev.just`
- Create: `commands/docker.just`
- Create: `commands/playwright.just`
- Modify: `justfile`

- [x] Move each existing recipe body into its domain module.
- [x] Make the `dev` module default start the normal Next.js server.
- [x] Retain database-reset confirmation and every Docker and Playwright
      capability.
- [x] Replace the root file with module declarations and automatic submodule
      listing.

### Task 2: Update live documentation

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/docker-commands.md`
- Modify: `docs/containerized-infrastructure.md`
- Modify: `docs/justfile-conventions.md`
- Modify: `docker/README.md`
- Modify: `nextjs/README.md`
- Modify: `playwright/README.md`

- [x] Make `README.md` the complete human command guide.
- [x] Make `justfile` and `commands/*.just` the executable inventory.
- [x] Route package documentation to the root workflow while retaining direct
      package-script guidance.
- [x] State that historical command examples do not override live sources.

### Task 3: Verify the restructuring

**Files:**
- Test: `justfile`
- Test: `commands/*.just`
- Test: all live documentation listed in Task 2

- [x] Run `just --summary --list-submodules` and compare it mechanically with
      the README table.
- [x] Search live docs for obsolete top-level commands while excluding
      historical brainstorms and plans.
- [x] List every module and dry-run normal representative recipes.
- [x] Use `just --show` for database reset and deployment commands so neither
      runs.
- [x] Run `git diff --check`, inspect the full diff, and create scoped
      Conventional Commits without pushing.
