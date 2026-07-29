# Next.js Docker Dependency Install Deduplication

## Context

The Next.js Dockerfile currently creates two dependency stages from the same
base image:

- `deps` runs a full `pnpm install` for the Next.js build.
- `runtime-deps` runs a second `pnpm install --prod` for the database startup
  scripts copied into the runner image.

The production dependency tree remains necessary because
`scripts/start-container.sh` executes the TypeScript database release or reset
script through `tsx` before starting the standalone Next.js server. The
duplicate installation is not necessary.

## Decision

Keep both dependency stage names, but derive `runtime-deps` from `deps`:

```dockerfile
FROM deps AS runtime-deps

RUN pnpm prune --prod --ignore-scripts
```

The `deps` stage installs the complete dependency graph once. Docker then
branches from that filesystem:

- `builder` retains the complete dependency graph and runs `pnpm build`.
- `runtime-deps` removes development dependencies and supplies the production
  `node_modules` tree to `runner`.

The runner image continues to execute the same startup script and contains the
same production dependencies as before.

## Alternatives Considered

### Prune the builder after `pnpm build`

This would remove the `runtime-deps` stage, but it would couple pruning to every
application build and leave the builder without development dependencies after
the prune step. It was rejected in favor of the clearer build/runtime branch
and better dependency-layer caching.

### Keep two independent installs

This is the current behavior. It is functionally correct but repeats dependency
resolution and installation work. It was rejected because pruning an already
installed dependency tree produces the same runtime artifact.

### Move database preparation into a separate job

This could remove the production dependency tree from the web image, but it
changes deployment orchestration. It is outside the scope of this change.

## Error Handling and Runtime Behavior

`pnpm prune --prod --ignore-scripts` must fail the Docker build if pruning
fails. No fallback installation is added.

The database startup behavior remains unchanged:

1. Run the production database release or explicitly requested reset.
2. Stop container startup if that command fails.
3. Start the standalone Next.js server only after database preparation
   succeeds.

## Validation

The implementation is complete when:

1. The Dockerfile contains only one `pnpm install`.
2. The `runtime-deps` stage inherits from `deps` and successfully prunes.
3. The runner contains `tsx`, `drizzle-orm`, and `pg`.
4. The runner does not contain development executables such as `vitest`,
   `tsc`, or `drizzle-kit`.
5. Both database startup modules import successfully through the runner's
   `tsx` executable.
6. The standalone Next.js server starts and serves a static asset.
7. `git diff --check` passes and no unrelated files are changed.

## Scope

Only the dependency-stage construction in `nextjs/Dockerfile` changes. The
runtime startup flow, package classifications, application code, database
scripts, Compose configuration, and final image contents remain unchanged.
