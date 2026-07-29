#!/bin/sh
set -e

cd /app/nextjs

if [ "$DATABASE_RESET" = "true" ]; then
  ./node_modules/.bin/tsx scripts/reset-production-database.ts
else
  ./node_modules/.bin/tsx scripts/release-database.ts
fi

unset PROD_MAINTAINER_PASSWORD

cd /app
exec node server.js
