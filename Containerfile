# Multi-stage build: compile client+server, then ship only prod dependencies.
FROM docker.io/library/node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

FROM base AS prod-deps
RUN pnpm install --prod --frozen-lockfile

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.server.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN pnpm build

FROM docker.io/library/node:24-alpine
# tini as PID 1 so SIGTERM stops node promptly (node ignores it as PID 1 without a handler).
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Run as the image's built-in `node` user (uid/gid 1000). /data is owned by it, so a
# fresh anonymous/named volume is writable; with a bind mount or `-v ...:Z,U` podman
# chowns the host dir to this uid inside the user namespace.
RUN mkdir /data && chown node:node /data
USER node

ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
VOLUME /data
EXPOSE 3000

# Static dist/client is resolved against the working directory (/app).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server/server/main.js"]
