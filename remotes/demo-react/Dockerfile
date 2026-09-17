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

COPY remotes/demo-react/package.json remotes/demo-react/pnpm-lock.yaml /workspace/remotes/demo-react/

WORKDIR /workspace/remotes/demo-react
RUN pnpm install --frozen-lockfile
# Full SDK install after the file: link — tsc path-maps SyncedMemoryRouter into
# packages/mfe-sdk/src and needs React peers in that tree (axios included).
RUN cd /workspace/packages/mfe-sdk && pnpm install --frozen-lockfile

COPY remotes/demo-react /workspace/remotes/demo-react

ENV CHOKIDAR_USEPOLLING=true
EXPOSE 5175
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5175"]

FROM development AS builder
RUN pnpm build

FROM caddy:2-alpine AS production
COPY --from=builder /workspace/remotes/demo-react/dist /srv
COPY remotes/demo-react/Caddyfile.static /etc/caddy/Caddyfile
EXPOSE 80
