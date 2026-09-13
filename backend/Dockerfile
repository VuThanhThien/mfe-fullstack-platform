##################
# BUILD BASE IMAGE
##################
# bookworm-slim (glibc) — pnpm@9 has no linux-arm64-musl build (Alpine + Apple Silicon).
# Install pnpm via npm (not corepack) — Node 20.18 corepack hits signature keyid errors.

ARG NODE_VERSION=20.18.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends procps \
  && rm -rf /var/lib/apt/lists/* \
  && corepack disable \
  && npm install -g pnpm@9.12.3 \
  && pnpm --version

#############################
# BUILD FOR LOCAL DEVELOPMENT
#############################

FROM base AS development
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .
RUN chmod +x /app/docker-entrypoint.dev.sh \
  && mkdir -p dist \
  && chown -R node:node /app

# node user can write dist/; Compose still injects env
USER node
ENTRYPOINT ["/app/docker-entrypoint.dev.sh"]
CMD ["pnpm", "start:dev"]

#####################
# BUILD BUILDER IMAGE
#####################

FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY --from=development /app/node_modules ./node_modules
COPY --from=development /app/src ./src
COPY --from=development /app/tsconfig.json ./tsconfig.json
COPY --from=development /app/tsconfig.build.json ./tsconfig.build.json
COPY --from=development /app/nest-cli.json ./nest-cli.json

RUN pnpm build

ENV NODE_ENV=production
RUN pnpm prune --prod
RUN pnpm install --prod

USER node

######################
# BUILD FOR PRODUCTION
######################

FROM node:${NODE_VERSION}-bookworm-slim AS production
WORKDIR /app

RUN mkdir -p src/generated && chown -R node:node src

COPY --chown=node:node --from=builder /app/src/generated/i18n.generated.ts ./src/generated/i18n.generated.ts
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/package.json ./

USER node
CMD ["node", "dist/main.js"]
