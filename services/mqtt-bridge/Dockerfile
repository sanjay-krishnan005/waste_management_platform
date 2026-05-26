FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY services/mqtt-bridge ./services/mqtt-bridge
RUN npm install --workspace=@sortyx/mqtt-bridge --workspace=@sortyx/shared
WORKDIR /app/services/mqtt-bridge
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/mqtt-bridge/dist ./dist
COPY --from=builder /app/services/mqtt-bridge/package.json ./
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
