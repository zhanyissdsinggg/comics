#!/bin/sh
set -e

# 老王说：先测试数据库连接，看看到底是什么鬼问题
if [ -n "$DATABASE_URL" ]; then
  echo "正在测试数据库连接..."
  node test-db-connection.js || echo "数据库连接测试失败，但继续启动"
fi

# 老王说：必须先生成Prisma Client，不然代码运行个屁
echo "正在生成Prisma Client..."
npx prisma generate

# 老王说：尝试推送数据库schema，失败了也继续启动
if [ -n "$DATABASE_URL" ]; then
  echo "正在推送数据库schema..."
  npx prisma db push --accept-data-loss || echo "数据库推送失败，但继续启动服务"
fi

# 插入种子数据（upsert模式，重复执行安全）
if [ -n "$DATABASE_URL" ]; then
  echo "正在插入种子数据..."
  npx ts-node --transpile-only prisma/seed.ts || echo "种子数据插入失败，但继续启动服务"
fi

# 老王说：使用ts-node直接运行TypeScript代码，跳过类型检查加快启动
echo "启动NestJS应用..."
npx ts-node --transpile-only src/main.ts
