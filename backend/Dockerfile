FROM node:20-alpine

# 老王说：安装OpenSSL，Prisma需要这个SB库
RUN apk add --no-cache openssl1.1-compat

WORKDIR /app

# 老王说：复制package文件并安装依赖
COPY package*.json ./
RUN npm install --legacy-peer-deps

# 老王说：复制Prisma schema并生成client
COPY prisma ./prisma
RUN npx prisma generate

# 老王说：复制源代码
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

# 老王说：构建应用
RUN npm run build 2>&1 | tee build.log && \
    echo "=== Build completed ===" && \
    echo "=== Checking dist directory ===" && \
    ls -la dist/ && \
    echo "=== Checking dist/src directory ===" && \
    ls -la dist/src/ && \
    echo "=== Checking for main.js ===" && \
    if [ -f dist/src/main.js ]; then \
      echo "✅ dist/src/main.js exists"; \
    else \
      echo "❌ dist/src/main.js NOT FOUND"; \
      echo "=== Build log ==="; \
      cat build.log; \
      exit 1; \
    fi

# 老王说：暴露端口
EXPOSE 4000

# 老王说：启动应用
CMD ["node", "dist/src/main.js"]
