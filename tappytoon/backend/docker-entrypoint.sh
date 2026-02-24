#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  npx prisma db push --accept-data-loss
  node scripts/seed.js || true
fi

node dist/main.js
