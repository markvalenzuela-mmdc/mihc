# mmdc-sanity

IT Monitoring & E2E Platform -- foundation setup.

## Prerequisites

- Node.js >= 20
- pnpm
- Docker + Docker Compose

## Quick start

```bash
cp .env.example .env
docker compose up -d            # postgres, redis, minio, bucket
pnpm install
npx playwright install --with-deps chromium
pnpm db:migrate
pnpm dev                        # web on :3000, runner consuming the queue
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Run web + runner concurrently |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run ESLint across workspace |
| `pnpm typecheck` | Type-check across workspace |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Prisma Studio |