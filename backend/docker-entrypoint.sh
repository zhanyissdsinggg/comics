#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  npx prisma migrate deploy
  node scripts/seed.js
fi

node dist/main.js
