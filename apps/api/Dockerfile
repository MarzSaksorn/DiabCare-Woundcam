FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

COPY src ./src
COPY migrations ./migrations

ENV NODE_ENV=production
EXPOSE 3000

USER node
CMD ["node", "src/server.js"]
