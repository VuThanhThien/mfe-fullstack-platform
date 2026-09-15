# Build context: repository root (needs packages/mfe-sdk + packages/mfe-ui)
ARG NODE_VERSION=20.18.0

FROM node:${NODE_VERSION}-bookworm-slim AS development
WORKDIR /workspace

COPY packages/mfe-sdk /workspace/packages/mfe-sdk
COPY packages/mfe-ui /workspace/packages/mfe-ui
# file: deps — install package runtimes in place.
# SDK: axios. UI: auth peers only (not full icons) so consumer `tsc` can follow sources.
RUN rm -rf /workspace/packages/mfe-sdk/node_modules /workspace/packages/mfe-ui/node_modules \
 && npm install --prefix /workspace/packages/mfe-sdk --omit=dev --no-package-lock --no-audit --no-fund \
 && npm install --prefix /workspace/packages/mfe-ui --no-package-lock --no-audit --no-fund --no-save \
      react@18.3.1 react-dom@18.3.1 \
      @types/react@18.3.18 @types/react-dom@18.3.5 \
      @mui/material@6.5.0 @emotion/react@11.14.0 @emotion/styled@11.14.1 \
      react-hook-form@7.88.0 zod@4.6.4 @hookform/resolvers@5.9.1

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
