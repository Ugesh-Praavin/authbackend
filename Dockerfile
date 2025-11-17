# stage 1 — build
FROM node:20-alpine AS builder
WORKDIR /app

# system deps for native modules (if needed)
RUN apk add --no-cache python3 make g++ tini

# copy sources
COPY package*.json ./
COPY pnpm-lock.yaml* ./
# install deps
RUN npm ci --production=false

COPY . .
# build (Nest builds to dist)
RUN npx prisma generate
RUN npm run build

# stage 2 — runtime
FROM node:20-alpine AS runner
WORKDIR /app

# tini for proper pid 1 handling
RUN apk add --no-cache tini

ENV NODE_ENV=production
# copy only what we need
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/src ./dist/src
COPY --from=builder /app/prisma ./prisma

# ensure permissions
RUN chown -R node:node /app
USER node

# health port + app port
EXPOSE 4000


# use tini as entrypoint
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/main.js"]
