# Micro-Frontend Fullstack — local orchestration
#
# Quick start (all Docker):
#   make up          → http://localhost:8080
#   make down
#
# Hybrid (infra in Docker, apps on host — best HMR DX):
#   make infra
#   then follow docs/local-development-guide.md

COMPOSE       ?= docker compose
COMPOSE_FILE  ?= docker-compose.yml
COMPOSE_INFRA ?= docker-compose.infra.yml
BACKEND_COMPOSE ?= backend/docker-compose.yml

.DEFAULT_GOAL := help

.PHONY: help up down stop start build rebuild ps logs \
	infra infra-down migrate seed reset clean \
	shell-backend shell-db smoke wait-backend \
	test-backend lint-backend

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage: make \033[36m<target>\033[0m\n\n"} \
		/^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@printf "\nBrowser entry: \033[33mhttp://localhost:8080\033[0m\n\n"

# ── Full stack (Docker) ──────────────────────────────────────────────────

up: ## Build & start full stack (db, redis, api, FE, caddy)
	$(COMPOSE) -f $(COMPOSE_FILE) up -d --build
	@$(MAKE) wait-backend
	@echo ""
	@echo "✓ Stack is up → http://localhost:8080"
	@echo "  Seed: dashboard@example.com / 12345678  (DASHBOARD)"
	@echo "        admin@example.com / 12345678      (ADMIN)"

down: ## Stop and remove containers (keep volumes)
	$(COMPOSE) -f $(COMPOSE_FILE) down

stop: ## Stop containers without removing
	$(COMPOSE) -f $(COMPOSE_FILE) stop

start: ## Start existing containers
	$(COMPOSE) -f $(COMPOSE_FILE) start

build: ## Build images only
	$(COMPOSE) -f $(COMPOSE_FILE) build

rebuild: ## Rebuild without cache, then up
	$(COMPOSE) -f $(COMPOSE_FILE) build --no-cache
	$(COMPOSE) -f $(COMPOSE_FILE) up -d
	@$(MAKE) wait-backend

ps: ## List compose services
	$(COMPOSE) -f $(COMPOSE_FILE) ps

logs: ## Tail all logs (Ctrl+C to stop)
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f --tail=200

# ── Infra only (host-based FE/backend workflow) ──────────────────────────

infra: ## Start Postgres + Redis only (host ports 25432 / 6379)
	$(COMPOSE) -f $(COMPOSE_FILE) -f $(COMPOSE_INFRA) up -d db redis
	@echo "✓ db :25432  redis :6379 — run backend/FE on host (see docs/local-development-guide.md)"

infra-down: ## Stop infra containers
	$(COMPOSE) -f $(COMPOSE_FILE) -f $(COMPOSE_INFRA) stop db redis

# ── Backend ops inside compose ───────────────────────────────────────────

wait-backend: ## Wait until backend /health returns 200
	@echo "Waiting for backend health..."
	@i=0; \
	until curl -sf http://localhost:3000/health >/dev/null 2>&1; do \
		i=$$((i+1)); \
		if [ $$i -ge 60 ]; then echo "backend not healthy after 60s" >&2; exit 1; fi; \
		sleep 2; \
	done
	@echo "✓ backend healthy"

migrate: ## Run DB migrations in backend container
	$(COMPOSE) -f $(COMPOSE_FILE) exec backend pnpm migration:up

seed: ## Run seeders in backend container
	$(COMPOSE) -f $(COMPOSE_FILE) exec backend pnpm seed:run

shell-backend: ## Open a shell in the backend container
	$(COMPOSE) -f $(COMPOSE_FILE) exec backend sh

shell-db: ## psql into Postgres
	$(COMPOSE) -f $(COMPOSE_FILE) exec db psql -U postgres -d mfe_backend

# ── Cleanup / quality ────────────────────────────────────────────────────

reset: ## down + wipe volumes + up (DESTROYS local DB data)
	$(COMPOSE) -f $(COMPOSE_FILE) down -v
	$(COMPOSE) -f $(COMPOSE_FILE) up -d --build
	@$(MAKE) wait-backend
	@echo "✓ Reset complete → http://localhost:8080"

clean: ## Remove containers, volumes, and dangling images for this project
	$(COMPOSE) -f $(COMPOSE_FILE) down -v --rmi local --remove-orphans

smoke: ## Curl gateway routes (stack must be up)
	@echo "→ GET /"; curl -sI http://localhost:8080/ | head -n1
	@echo "→ GET /api/docs"; curl -sI http://localhost:8080/api/docs | head -n1
	@echo "→ GET /app/"; curl -sI http://localhost:8080/app/ | head -n1
	@echo "→ GET /r/demo-react/remoteEntry.js"; curl -sI http://localhost:8080/r/demo-react/remoteEntry.js | head -n1
	@echo "→ GET /r/admin-react/mf-manifest.json"; curl -sI http://localhost:8080/r/admin-react/mf-manifest.json | head -n1
	@echo "→ GET /health (direct)"; curl -s http://localhost:3000/health; echo

test-backend: ## Run backend unit tests on host (needs pnpm in backend/)
	cd backend && pnpm test

lint-backend: ## Lint backend on host
	cd backend && pnpm lint
