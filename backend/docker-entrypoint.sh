#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  npx prisma db push --accept-data-loss
  # 老王说：scripts/seed.js不存在，暂时注释掉
  # node scripts/seed.js || true
fi

# 老王说：使用ts-node直接运行TypeScript代码
npx ts-node src/main.ts
