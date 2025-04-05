FROM node:alpine3.21 AS deps
WORKDIR /usr/src/app 
COPY package.json package-lock.json 
RUN npm ci --omit=dev 

FROM node:alpine3.21 AS builder
WORKDIR /usr/src/app 
COPY . . 
COPY --from=deps /usr/src/app/node_modules ./node_modules 
RUN npm ci 
RUN npm run build


FROM node:alpine3.21 AS runner 
WORKDIR /usr/src/app 
ENV NODE_ENV prod
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/dist ./dist 
COPY --from=deps /usr/src/app/node_modules ./node_modules
EXPOSE 3000
RUN addgroup -S appgroup && adduser -S appuser -G appgroup 
USER appuser 

CMD ["node", "dist/server.js"]
