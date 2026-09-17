# Build context: repository root (needs packages/mfe-sdk + packages/mfe-ui)
# bookworm-slim + npm-installed pnpm (avoid corepack keyid bugs on Node 20.18).

ARG NODE_VERSION=20.18.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN corepack disable && npm install -g pnpm@9.12.3
WORKDIR /workspace

FROM base AS development
COPY packages/mfe-sdk /workspace/packages/mfe-sdk
COPY packages/mfe-ui /workspace/packages/mfe-ui
# @mfe/ui auth runtime deps are declared in package.json (frozen --prod).
RUN cd /workspace/packages/mfe-ui && pnpm install --frozen-lockfile --prod

COPY remotes/admin-react/package.json remotes/admin-react/pnpm-lock.yaml /workspace/remotes/admin-react/

WORKDIR /workspace/remotes/admin-react
RUN pnpm install --frozen-lockfile
# Full SDK install after the file: link — tsc path-maps SyncedMemoryRouter into
# packages/mfe-sdk/src and needs React peers in that tree (axios included).
RUN cd /workspace/packages/mfe-sdk && pnpm install --frozen-lockfile

COPY remotes/admin-react /workspace/remotes/admin-react

ENV CHOKIDAR_USEPOLLING=true
EXPOSE 5176
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5176"]

FROM development AS builder
RUN pnpm build

FROM caddy:2-alpine AS production
COPY --from=builder /workspace/remotes/admin-react/dist /srv
COPY remotes/admin-react/Caddyfile.static /etc/caddy/Caddyfile
EXPOSE 80
