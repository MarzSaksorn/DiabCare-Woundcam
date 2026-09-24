# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN npm install --global corepack@latest \
  && corepack pnpm install --frozen-lockfile

COPY . .
RUN corepack pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# The bundled server resolves the model from dist/models at runtime.
COPY --from=builder /app/server/models ./dist/models

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000)).then((response) => process.exit(response.status < 500 ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
