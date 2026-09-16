# Phase 02 — Gateway + compose + smoke

## Context Links

- Spec §4 platform wiring
- Scout §6–§7
- Mirror `admin-react` / `demo-react` routes

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 1.5h
- **Risk:** low
- **Parallel:** Wave 0 with P1, P3

Wire `/r/demo-vue*` through all Caddy variants, compose service, Makefile smoke JSON check.

## Requirements

- Dev Caddy: `localhost:5177`
- Docker Caddy: `host.docker.internal:5177`
- Compose Caddy: `demo-vue:80`
- `docker-compose.yml`: service `demo-vue` (Dockerfile from P3 — add service stub pointing at path; build fails until P3 exists — **coordinate**: land compose service in same merge as P3 or after)
- `make smoke`: add `/r/demo-vue/mf-manifest.json` Content-Type JSON assert
- Update `gateway/README.md` port table

## Related Code Files

**Modify**
- `gateway/Caddyfile`
- `gateway/Caddyfile.docker`
- `gateway/Caddyfile.compose`
- `gateway/README.md`
- `docker-compose.yml` (service + gateway `depends_on`)
- `Makefile` (`smoke` target)

**Do not**
- Remote source (P3), shell, seeder

## Implementation Steps

1. Copy admin-react handle block → `demo-vue` / `:5177` / `demo-vue:80`.
2. Add compose service mirroring admin-react (build context `.`, dockerfile `remotes/demo-vue/Dockerfile`).
3. Extend smoke curls.
4. Document in gateway README.

## Todo

- [x] All three Caddyfiles
- [x] compose service + depends_on
- [x] smoke includes demo-vue manifest
- [x] README updated

## Success Criteria

- [x] With P3 running: `curl -sI http://localhost:8080/r/demo-vue/mf-manifest.json` → JSON
- [x] `make smoke` passes including new check (needs stack up)

## Risks

- Compose references Dockerfile before P3 → land P2+P3 together or placeholder Dockerfile in P3 first.

## Conflict prevention

- Only this phase edits gateway/Makefile/compose (except P3 creates Dockerfile path compose references).

## Next Steps

P3 provides Dockerfile + dist; P6 may mention smoke in docs only.
