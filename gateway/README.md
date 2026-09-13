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
| `/` (catch-all)    | `localhost:5173`    | Landing page (Vite)  |

---

## Recommended: Host Caddy (best local DX)

Running Caddy on the host avoids Docker-to-host networking headaches and keeps Vite HMR working out of the box.

### Prerequisites

```bash
# macOS
brew install caddy

# Arch / Manjaro
sudo pacman -S caddy

# Ubuntu / Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### Start order

```bash
# 1. Backend (Docker)
cd ../backend && docker compose up -d

# 2. Gateway — from THIS directory
caddy run --config Caddyfile

# 3. Landing
cd ../landing && pnpm dev          # listens on :5173

# 4. Shell MFE
cd ../shell && pnpm dev            # listens on :5174

# 5. Remote MFEs
cd ../remotes/demo-react && pnpm dev    # listens on :5175
cd ../remotes/admin-react && pnpm dev   # listens on :5176
```

> **Tip:** Open four terminal tabs (or use a tool like `tmux` / Overmind). The gateway must stay in the foreground (`caddy run`) or you can daemonize with `caddy start`.

### Verify

```bash
# NestJS health / Swagger (once backend is up)
curl -I http://localhost:8080/api/docs

# Landing page
curl -I http://localhost:8080/

# Shell MFE
curl -I http://localhost:8080/app/

# Remote MFE entry point
curl -I http://localhost:8080/r/demo-react/remoteEntry.js

# Admin remote entry point
curl -I http://localhost:8080/r/admin-react/remoteEntry.js
```

---

## Alternative: umbrella `make up` (all-in Docker)

From the **repo root**, Compose wires Caddy to container DNS (`gateway/Caddyfile.compose`):

```bash
make up      # http://localhost:8080
make smoke
make down
```

See [docs/local-development-guide.md](../docs/local-development-guide.md) §0.

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
