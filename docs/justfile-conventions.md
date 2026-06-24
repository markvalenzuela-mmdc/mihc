# Extending the Justfile

## Conventions

When adding a new command to the root `justfile`, follow these rules:

1. **Place it under the right section** — add a `# ─────────────── section ───────────────` header if one doesn't exist, then place the recipe underneath.
2. **Keep it thin** — each recipe should delegate to the project's own tooling, not inline logic.
3. **Use `project_root`** — reference paths as `{{project_root}}/subdir/` instead of hardcoding.
4. **Add a description comment** — the line above the recipe is shown in `just --list`.
5. **Use `@` for silent commands** — prefix with `@` when output shouldn't be echoed.

```make
# ─────────────── my-section ───────────────

# Run my tool
my-command:
    cd {{project_root}}/my-dir && some-tool
```

If the command applies across multiple projects, add it under the `all` section using dependencies:

```make
# Run everything
check-all: lint typecheck my-command
```
