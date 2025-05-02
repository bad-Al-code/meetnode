FROM node:lts-alpine3.21 AS builder
LABEL stage=builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
RUN pnpm prune --prod

FROM node:lts-alpine3.21 AS production
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /usr/src/app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs
USER nodejs
COPY --chown=nodejs:nodejs --from=builder /usr/src/app/package.json ./package.json
COPY --chown=nodejs:nodejs --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=nodejs:nodejs --from=builder /usr/src/app/dist ./dist
EXPOSE ${PORT}

CMD ["node", "dist/server.js"]