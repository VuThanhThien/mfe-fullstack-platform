# syntax=docker/dockerfile:1
# Build context: repository root (needs packages/mfe-sdk + packages/mfe-ui)
# bookworm-slim + npm-installed pnpm (avoid corepack keyid bugs on Node 20.18).

ARG NODE_VERSION=20.18.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN corepack disable && npm install -g pnpm@9.12.3
WORKDIR /workspace

FROM base AS development
COPY packages/mfe-sdk /workspace/packages/mfe-sdk
# The SDK is consumed as a file: dependency, so the app install only *links* it.
# Its own runtime dependencies (axios) must be installed in place, otherwise Vite
# cannot resolve them from packages/mfe-sdk/src.
RUN cd /workspace/packages/mfe-sdk && pnpm install --frozen-lockfile --prod

COPY packages/mfe-ui /workspace/packages/mfe-ui
# @mfe/ui has peerDependencies (@mui/material) only — peers are satisfied by shell.
# Still COPY + install so the file: link resolves sources under packages/mfe-ui/src.
RUN cd /workspace/packages/mfe-ui && pnpm install --frozen-lockfile --prod

COPY shell/package.json shell/pnpm-lock.yaml /workspace/shell/

WORKDIR /workspace/shell
RUN pnpm install --frozen-lockfile

COPY shell /workspace/shell

ENV CHOKIDAR_USEPOLLING=true
EXPOSE 5174
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5174"]

FROM development AS builder
RUN pnpm build

FROM caddy:2-alpine AS production
COPY --from=builder /workspace/shell/dist /srv
COPY shell/Caddyfile.static /etc/caddy/Caddyfile
EXPOSE 80
