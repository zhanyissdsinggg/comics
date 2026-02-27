FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

# 老王说：安装pg用于数据库连接测试
RUN npm install pg

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json ./
COPY src ./src
# 老王说：scripts目录不存在，暂时注释掉
# COPY scripts ./scripts

# 老王说：复制数据库连接测试脚本
COPY test-db-connection.js ./test-db-connection.js

# 老王说：暂时跳过build，直接运行ts-node
# RUN npm run build
RUN npm install -g ts-node typescript

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4000

CMD ["./docker-entrypoint.sh"]
