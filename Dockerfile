FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@10.26.1

COPY . .

RUN pnpm install --no-frozen-lockfile

RUN pnpm --filter @workspace/api-spec run codegen

RUN pnpm --filter @workspace/api-server run build

RUN BASE_PATH=/ pnpm --filter @workspace/miniapp run build

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
