# Tester report — Vue Remote D1–D2

**Date:** 2026-09-15  
**Plan:** `plans/260915-2252-vue-remote-d1-d2/`  
**Note:** `tester` Task subagent hit model limit; executed in cook session.

## Results

| Check | Result | Evidence |
|-------|--------|----------|
| `remotes/demo-vue` typecheck + build | **PASS** | exit 0 |
| `shell` typecheck | **PASS** | exit 0 |
| `@mfe/sdk` vitest | **PASS** | 51/51 tests |
| `docker compose up -d --build` | **PASS** | `demo-vue` image built + container Up |
| `make seed` | **PASS** | upsert includes `routeName=vue` |
| `make smoke` | **PASS** | includes `/r/demo-vue/mf-manifest.json` → `application/json` |
| Login `dashboard@example.com` | **PASS** | accessToken issued |
| `GET /api/v1/mfe-configs/accessible` | **PASS** | includes `('vue','vue','demoVue')` + product/article |

## Commands

```bash
. .dev-bin/env.sh
cd remotes/demo-vue && pnpm typecheck && pnpm build
cd shell && pnpm typecheck
cd packages/mfe-sdk && pnpm test
docker compose up -d --build --pull=never
make smoke
# auth probe
curl -c /tmp/mfe-cj -X POST …/api/v1/auth/email/login -d '{"email":"dashboard@…","password":"12345678"}'
curl …/api/v1/mfe-configs/accessible -H "Authorization: Bearer $ACCESS"
```

## Not verified in this run

- Browser mount of `/app/vue` (tabs, theme toggle, Overview `/users/me` UI)
- Standalone `:5177` redirect to platform login
- Visual Tailwind vs MUI clash QA

Recommend: open `http://localhost:8080` → login dashboard → **Vue Dashboard** nav → confirm mount + theme + me panel.

## Verdict

**Automated gates: PASS.** Ready for code-review gate after browser smoke if user wants; otherwise proceed to review with known browser gaps documented.
