# Gateway — Caddy Reverse Proxy

Caddy is the **single browser origin** for the entire MFE platform.  
All traffic enters on **`:8080`** and is routed to the appropriate upstream.

---

## Port Map

| URL prefix         | Upstream            | Service              |
|--------------------|---------------------|----------------------|
| `/api*`            | `localhost:3000`    | NestJS backend       |
| `/app*`            | `localhost:5174`    | Shell MFE (Vite)     |
| `/r/demo-react*`   | `localhost:5175`    | Demo remote (Vite)   |
| `/r/admin-react*`  | `localhost:5176`    | Admin remote (Vite)  |
| `/r/demo-vue*`     | `localhost:5177`    | Vue remote (Vite)    |
| `/` (catch-all)    | `localhost:5173`    | Landing page (Vite)  |

---

## Local development

### Prerequisites

```bash
# macOS
brew install caddy
```

Host Caddy avoids Docker-to-host networking issues and keeps Vite HMR stable. Also need backend + FE Vite processes (see hub).

### Install

No Node deps. Caddy binary only.

### Env

None for Caddy itself.

### Run (hosted hybrid)

```bash
# From repo root
. .dev-bin/env.sh
make infra
cd backend && pnpm start:dev

# Gateway — from THIS directory
caddy run --config Caddyfile

# Landing uses npm; all other FE apps use pnpm
cd ../landing && npm install && npm run dev             # :5173
cd ../shell && pnpm install && pnpm dev                 # :5174
cd ../remotes/demo-react && pnpm install && pnpm dev    # :5175
cd ../remotes/admin-react && pnpm install && pnpm dev   # :5176
cd ../remotes/demo-vue && pnpm install && pnpm dev      # :5177
```

Daemon: `caddy start --config Caddyfile` / `caddy stop`.

### Ports & origins

Browser entry: **`http://localhost:8080`**. See port map at top of this file.

### Quality

N/A (config only). Validate with `make smoke` from repo root.

### Verify

```bash
curl -I http://localhost:8080/
curl -I http://localhost:8080/app/
curl -I http://localhost:8080/r/demo-react/mf-manifest.json
curl -I http://localhost:8080/r/admin-react/mf-manifest.json
curl -I http://localhost:8080/r/demo-vue/mf-manifest.json
cd .. && make smoke
```

### Related

- Hub: [docs/local-development-guide.md](../docs/local-development-guide.md)

> **RUNTIME-003 prevention:** If a remote is not running, the gateway falls through to landing's HTML. The shell then tries to parse HTML as MFE manifest JSON → parse error. The `make smoke` target now validates `Content-Type: application/json` on manifest URLs and hints `docker compose up -d --build {remote-name}` if either is HTML.

---

## Alternative: umbrella `make up` (all-in Docker)

From the **repo root**, Compose wires Caddy to container DNS (`gateway/Caddyfile.compose`):

```bash
make up      # http://localhost:8080
make smoke
make down
```

See [docs/local-development-guide.md](../docs/local-development-guide.md).

---

## Alternative: Docker Compose (gateway only, host Vite)

This runs only the Caddy container. Your Vite dev servers and the NestJS process still need to be up on the host (or in the backend compose network).

```bash
# From this directory
docker compose up -d
```

`docker-compose.yml` uses `Caddyfile.docker` which targets `host.docker.internal` instead of `localhost`.  
On **Linux** the `extra_hosts: ["host.docker.internal:host-gateway"]` entry in the compose file handles the resolution automatically.

> **macOS / Windows:** `host.docker.internal` resolves automatically in Docker Desktop — no extra config needed.

---

## Vite HMR Note

Each Vite app sets `server.hmr.host` (or `server.origin`) to `http://localhost:8080` so that HMR websocket upgrades are proxied correctly through Caddy.  
This is configured per-app in landing, shell and the demo remote.

---

## Files

| File                | Purpose                                        |
|---------------------|------------------------------------------------|
| `Caddyfile`         | **Default** — host Caddy, `localhost` upstreams|
| `Caddyfile.compose` | Used by the root `docker-compose.yml` — Compose service DNS upstreams, plus the `/app` → `/app/` redirect |
| `Caddyfile.docker`  | Docker variant — `host.docker.internal` upstreams |
| `docker-compose.yml`| Optional prod-shaped Docker run for Caddy only |
