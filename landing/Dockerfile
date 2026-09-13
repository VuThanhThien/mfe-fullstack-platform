# syntax=docker/dockerfile:1
# Build context: repository root (needs packages/mfe-sdk)
ARG NODE_VERSION=20.18.0

FROM node:${NODE_VERSION}-bookworm-slim AS development
WORKDIR /workspace

COPY packages/mfe-sdk /workspace/packages/mfe-sdk
# The SDK is consumed as a file: dependency, so the app install only *links* it.
# Its own runtime dependencies (axios) must be installed in place, otherwise Vite
# cannot resolve them from packages/mfe-sdk/src.
# The `rm -rf` guard matters: npm does not prune directories it does not
# recognise, so any node_modules that reached the image via COPY (host pnpm
# store, darwin-only binaries) would linger. Start from a clean slate.
RUN rm -rf /workspace/packages/mfe-sdk/node_modules \
 && npm install --prefix /workspace/packages/mfe-sdk --omit=dev --no-package-lock --no-audit --no-fund
COPY landing/package.json landing/package-lock.json /workspace/landing/

# Prefer npm here — landing currently ships package-lock.json / no pnpm lock
WORKDIR /workspace/landing
RUN npm ci --no-audit --no-fund

COPY landing /workspace/landing

ENV CHOKIDAR_USEPOLLING=true
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ── production static build ──────────────────────────────────────────────
FROM development AS builder
RUN npm run build

FROM caddy:2-alpine AS production
COPY --from=builder /workspace/landing/dist /srv
COPY landing/Caddyfile.static /etc/caddy/Caddyfile
EXPOSE 80
