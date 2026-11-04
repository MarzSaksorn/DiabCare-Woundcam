# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ARG VITE_PUBLIC_DEMO_MODE=false
ENV VITE_PUBLIC_DEMO_MODE=${VITE_PUBLIC_DEMO_MODE}

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY patches ./patches
RUN npm install --global corepack@latest \
  && corepack pnpm install --frozen-lockfile

COPY . .
RUN corepack pnpm build
RUN mkdir -p dist/models \
  && cp server/models/diabetes-wound-detector.onnx server/models/diabetes-wound-detector.labels.json dist/models/ \
  && cp server/models/azh-classifier.onnx server/models/azh-classifier.labels.json dist/models/ \
  && cp server/models/wound-segmentation.onnx server/models/wound-segmentation.labels.json dist/models/

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000
RUN mkdir -p /data && chown node:node /data

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
