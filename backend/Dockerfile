# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# 安装必需的库
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# 复制package文件并安装依赖
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# 复制Prisma schema并生成client
COPY prisma ./prisma
RUN npx prisma generate

# 复制源代码和配置
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

# 构建应用
RUN npm run build

# Stage 2: Runtime
FROM node:20-slim

WORKDIR /app

# 安装必需的库
RUN apt-get update && apt-get install -y openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*

# 创建非root用户
RUN groupadd -g 1001 -S nodejs && \
    useradd -S nodejs -u 1001

# 复制必要的文件
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 4000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# 启动应用
CMD ["node", "dist/src/main.js"]
