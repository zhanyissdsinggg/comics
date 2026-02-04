FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4000

CMD ["./docker-entrypoint.sh"]
