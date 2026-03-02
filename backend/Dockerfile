FROM node:20-alpine

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
RUN npm run build

# 老王说：暴露端口
EXPOSE 4000

# 老王说：启动应用
CMD ["node", "dist/main.js"]
