# Connection Pooler: PgBouncer vs PgDog

## Selection: PgBouncer

PgBouncer was selected as the connection pooler for this project.

## Comparison

| Criteria | PgBouncer | PgDog |
|---|---|---|
| Maturity | Battle-tested, widely adopted | Newer, smaller community |
| Configuration | Simple INI-based config | YAML-based, more complex |
| Pool modes | Session, transaction, statement | Transaction-only |
| Resource usage | Lightweight (~2 MB per instance) | Heavier |
| TLS support | Built-in | Nginx-sidecar pattern needed |
| Prepared statements | Safe in transaction mode with `DEALLOCATE` | Auto-discard on close |
| Runtime reconfiguration | `RELOAD` without restart | Restart required for most changes |

## Rationale

PgBouncer was chosen because:

1. **Proven reliability** — PgBouncer has been the standard PostgreSQL pooler for over a decade in production environments.
2. **Simplicity** — Minimal configuration surface with predictable behavior.
3. **Transaction pooling** — The `transaction` pool mode maps well to Next.js serverless-style request patterns where each request opens a connection, runs a query, and returns the connection to the pool.
4. **Health checks** — PgBouncer exposes `pg_isready` for straightforward Docker health checks.

## Routing

- Application database connections route through PgBouncer on port `6432`.
- Inngest and pgAdmin connect directly to PostgreSQL on port `5432` (no pooling needed).
