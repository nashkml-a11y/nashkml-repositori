FROM node:20-slim AS builder

WORKDIR /srv

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-slim

WORKDIR /srv
ENV NODE_ENV=production

COPY --from=builder /srv/next.config.js ./
COPY --from=builder /srv/package.json ./
COPY --from=builder /srv/.next ./.next
COPY --from=builder /srv/node_modules ./node_modules
COPY --from=builder /srv/public ./public

EXPOSE 3000

CMD ["npx", "next", "start", "-p", "3000"]
