# Extending Just commands

## Sources of truth

The root `justfile` is a tiny module dispatcher. Executable recipes live in
`commands/*.just`, and the complete human-facing command table lives in
`README.md`. Run `just --list --list-submodules --unsorted` to inspect the
current executable surface.

Historical brainstorms and plans are immutable audit records. Command examples
in them do not override these live sources.

## Conventions

1. Put a recipe in the existing domain module under `commands/`.
2. Keep recipe bodies thin and delegate to the owning package or Compose file.
3. Use `justfile_directory()` for repository-relative paths.
4. Add a description comment immediately above every public recipe.
5. Add a module only when no existing namespace coherently owns the command.
6. Update the command table in `README.md` in the same change.

Each normal module uses a private default recipe to list its commands:

```just
[private]
default:
    @just --list app
```

The `dev` module is the intentional exception: its private default starts the
normal development server, which keeps `just dev` as the primary development
command while allowing `just dev test` and `just dev fresh`.

For aggregate recipes, call namespaced commands explicitly so ownership stays
visible:

```just
# Run every test suite
test-all:
    just dev test
    just playwright unit
```
