# Production Database Bootstrap

## Context

The current `nextjs/lib/drizzle/seed.ts` entrypoint combines two different
responsibilities:

- deployment-critical records used by the application; and
- local demonstration and testing fixtures, including synthetic Smoke and E2E
  histories, profiles, steps, operators, and development authentication data.

Local development benefits from the complete fixture dataset. Production needs
only the records required for the application to operate: a maintainer account
and the app catalog used by Smoke Testing. Production schema changes must
continue to be applied through committed Drizzle migrations.

The current deploy Compose configuration starts the application services but
does not define an explicit migrate-and-bootstrap release gate.

## Goals

- Automatically apply committed Drizzle migrations before production
  application services start.
- Seed a production maintainer from deployment-provided credentials.
- Seed the four Smoke Testing apps:
  - `website`
  - `enrollmate`
  - `enrollmate-clp`
  - `n8n`
- Make production bootstrap safe to rerun.
- Preserve the existing full local-development seed experience.
- Document configuration, deployment, retry, recovery, and rollback behavior.

## Non-Goals

- Do not seed synthetic Smoke or E2E run history in production.
- Do not seed development profiles, fixtures, or default development
  credentials in production.
- Do not reset, truncate, or delete existing production data.
- Do not manage schema changes from seed code.
- Do not make application replicas independently run migrations on startup.
- Do not use CI/CD network access to the production database as the primary
  migration path.

## Options Considered

### 1. Dedicated one-shot database release service

Add a deploy-only service that runs migrations and production bootstrap, exits,
and gates application startup.

Advantages:

- migration and bootstrap failures stop the deployment clearly;
- database mutation is owned by one process rather than every app replica;
- reruns and operator recovery have an explicit command surface; and
- production behavior remains separate from local development.

This is the selected approach.

### 2. Application-container startup entrypoint

Run migrations and bootstrap before starting Next.js in every application
container.

This uses fewer deployment components, but it introduces replica races, couples
database failures to application restart behavior, and gives application
containers broader startup responsibilities. This option was rejected.

### 3. CI/CD database release step

Run migrations and bootstrap from GitHub Actions before deploying the
application.

This keeps runtime containers smaller, but requires CI network access and
credentials for the production database. It also couples database
availability to the CI provider. This option was rejected as the primary path.

## Architecture

The database workflow is split into two explicit paths.

### Production bootstrap

The production path:

1. validates the production maintainer configuration;
2. applies committed migrations from `nextjs/drizzle/`;
3. creates the maintainer through Better Auth when the account does not exist;
4. reconciles the maintainer's non-password identity fields when the account
   already exists;
5. upserts the required app catalog by stable app ID; and
6. records the maintainer as the apps' `createdBy` and `updatedBy` audit
   identity.

The bootstrap must not add synthetic run history, profiles, E2E fixtures, or
development users.

### Development seed

The local path preserves the current full fixture dataset. It should reuse the
shared app-catalog bootstrap behavior where practical and then add
development-only authentication, operators, profiles, steps, and run history.

Local commands do not require production maintainer variables.

### Deployment release service

`docker/compose.deploy.yml` includes a one-shot database release service. Its
execution sequence is:

1. wait for the configured database path to be available;
2. apply Drizzle migrations;
3. run the production bootstrap; and
4. exit successfully.

Next.js and Playwright start only after the release service completes
successfully. A migration, validation, or bootstrap failure produces a nonzero
exit code and prevents the application services from starting against an
unprepared schema.

## Configuration

Production deployment requires:

- `PROD_MAINTAINER_NAME`
- `PROD_MAINTAINER_EMAIL`
- `PROD_MAINTAINER_PASSWORD`

No production defaults are committed.

Validation occurs at two boundaries:

1. Deploy Compose uses required-variable interpolation so configuration fails
   before container startup when a value is absent.
2. The production bootstrap validates the values inside the release container
   before making database writes. It requires a nonempty name, valid email, and
   a password that satisfies the chosen Better Auth password policy.

The variables remain required on every production deployment so a fresh
database can always be initialized.

## Maintainer Credential Lifecycle

The configured password is used only when the maintainer account does not
exist. Later deployments do not reset an existing password when the deployment
secret changes. Password rotation uses Better Auth's supported
account-management flow.

The maintainer is resolved by normalized email. Repeated bootstrap runs must
not create duplicate users.

## Migration and Bootstrap Semantics

- Drizzle applies only migrations that have not already been recorded.
- Production bootstrap is idempotent.
- Apps are upserted by their stable IDs.
- Existing app names, descriptions, and maintainer audit references are
  reconciled on subsequent deployments.
- Existing operational records, histories, profiles, test results, and
  user-created data remain untouched.
- Related bootstrap writes run in a transaction where the Better Auth
  account-creation boundary permits it.
- Seed code never creates, alters, or drops schema objects.

## Failure Handling and Recovery

- Missing or invalid configuration fails before bootstrap writes.
- Migration failure stops bootstrap.
- Bootstrap failure exits nonzero and prevents dependent application services
  from starting.
- Logs identify whether validation, migration, maintainer creation, or app
  reconciliation failed without printing secrets.
- Operators receive a documented command for retrying the one-shot release
  service after correcting configuration or database availability.
- `db reset` is explicitly prohibited for production recovery.

Before applying migrations, operators should use the platform's normal
database-backup procedure. Application rollback and schema rollback are
separate decisions: deployments may roll application images back, while
database migrations should be forward-compatible and corrected with a new
Drizzle migration when necessary.

## Verification

Automated and configuration checks cover:

- missing maintainer variables are rejected;
- invalid maintainer email or password values are rejected before writes;
- a fresh database receives all migrations, one maintainer, and exactly the
  four required apps;
- repeated production bootstrap does not duplicate records;
- repeated production bootstrap does not overwrite the existing maintainer
  password;
- repeated production bootstrap preserves operational data;
- development seeding continues to produce the current complete fixture
  dataset;
- deploy Compose renders with valid configuration;
- the application services do not start when the database release service
  fails; and
- the application services start after a successful release.

## Documentation Deliverables

Update deployment documentation with:

- the required production variables and their consumers;
- the automatic migrate-and-bootstrap sequence;
- the exact normal deployment and manual retry commands;
- expected success and failure logs;
- the local-development versus production seed boundary;
- backup and failure-recovery guidance;
- forward-migration and application rollback guidance; and
- a production warning for the destructive database reset command.

## Decisions

- Use a dedicated one-shot database release service.
- Run the service automatically before Next.js and Playwright.
- Seed one deployment-configured maintainer and four Smoke Testing apps in
  production.
- Make production configuration mandatory and provide no committed credential
  defaults.
- Preserve the existing full development fixture seed.
- Do not reset an existing maintainer password during deployment.
- Keep Drizzle migrations as the only schema-change mechanism.

## Open Questions

None.
