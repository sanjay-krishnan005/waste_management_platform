FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY services/mqtt-bridge ./services/mqtt-bridge
RUN npm ci --workspace=@sortyx/mqtt-bridge --workspace=@sortyx/shared
RUN npx --package=esbuild@^0.24.0 esbuild services/mqtt-bridge/src/index.ts \
  --bundle --platform=node --target=node20 --format=esm \
  --outfile=/app/dist/bridge.js

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/bridge.js"]
