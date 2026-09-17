# Build context: repository root (needs packages/mfe-sdk + packages/mfe-ui)
ARG NODE_VERSION=20.18.0

FROM node:${NODE_VERSION}-bookworm-slim AS development
WORKDIR /workspace

COPY packages/mfe-sdk /workspace/packages/mfe-sdk
COPY packages/mfe-ui /workspace/packages/mfe-ui
# file: deps — install package runtimes in place (omit-dev = axios / @mfe/ui auth deps).
RUN rm -rf /workspace/packages/mfe-sdk/node_modules /workspace/packages/mfe-ui/node_modules \
 && npm install --prefix /workspace/packages/mfe-sdk --omit=dev --no-package-lock --no-audit --no-fund \
 && npm install --prefix /workspace/packages/mfe-ui --omit=dev --no-package-lock --no-audit --no-fund

COPY landing/package.json landing/package-lock.json /workspace/landing/

WORKDIR /workspace/landing
RUN npm ci --no-audit --no-fund

COPY landing /workspace/landing

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ── production static build ──────────────────────────────────────────────
FROM development AS builder
RUN npm run build

FROM caddy:2-alpine AS production
COPY --from=builder /workspace/landing/dist /srv
COPY landing/Caddyfile.static /etc/caddy/Caddyfile
EXPOSE 80
