# Phase 02 — Gateway route for admin-react

**Effort:** 0.5h · **Owns:** `gateway/**` (+ compose if remote is containerized) · **Depends on:** —

## Context Links

- Spec §4 architecture
- Existing: `gateway/Caddyfile.docker`, `gateway/Caddyfile` (host), demo handle `/r/demo-react*`

## Overview

Same-origin path `/r/admin-react*` → Vite admin remote on **5176**.

## Implementation Steps

1. Add to all relevant Caddyfiles:
   ```
   handle /r/admin-react* {
     reverse_proxy host.docker.internal:5176   # or 127.0.0.1:5176 for host Caddy
   }
   ```
2. If docker-compose lists frontend services, add `admin-react` service port `5176:5176` mirroring demo-react (or document host-only hybrid).
3. Confirm no conflict with `/r/demo-react*` / `/app*` / `/api*`.

## Todo List

- [x] Caddyfile.docker + host Caddyfile updated
- [x] Compose / docs port 5176 if applicable
- [x] `curl -sI http://localhost:8080/r/admin-react/` returns upstream (once Vite up)

## Success Criteria

- Gateway routes admin assets without CORS / wrong upstream
- Demo route unchanged

## Next

P3 scaffold.
