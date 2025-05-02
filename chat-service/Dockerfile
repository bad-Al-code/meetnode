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
COPY --chown=nodejs:nodejs --from=builder /usr/src/app/docs ./docs

RUN find /usr/src/app/node_modules -type f -name '*.js.map' -delete || true && \
    find /usr/src/app/node_modules -type f -name '*.ts' -delete || true && \
    find /usr/src/app/node_modules -type f -name '*.d.ts' -delete || true && \
    find /usr/src/app/node_modules -type d -name 'test' -exec rm -rf {} + || true && \
    find /usr/src/app/node_modules -type d -name 'tests' -exec rm -rf {} + || true && \
    find /usr/src/app/node_modules -type d -name 'doc' -exec rm -rf {} + || true && \
    find /usr/src/app/node_modules -type d -name 'docs' -exec rm -rf {} + || true && \
    find /usr/src/app/node_modules -type d -name 'examples' -exec rm -rf {} + || true && \
    find /usr/src/app/node_modules -type f -name '*.md' -delete || true && \
    find /usr/src/app/node_modules -type f -name 'LICENSE*' -delete || true && \
    echo "Cleaned up node_modules"

USER nodejs
EXPOSE ${PORT}

CMD ["node", "dist/server.js"]