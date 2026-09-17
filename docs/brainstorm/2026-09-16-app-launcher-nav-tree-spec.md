# Design Spec — App Launcher + API-Managed Nested Nav Tree

**Date:** 2026-09-16  
**Status:** approved (brainstorm) — **shipped**; running code is ground truth. Plan owns historical execution notes.  
**Approach:** Approach 1 — Nav tree entity + admin CRUD + shell chrome rewrite  
**Plan:** [`plans/260916-1737-app-launcher-nav-tree/`](../../plans/260916-1737-app-launcher-nav-tree/plan.md)  
**Related:** Phase C shell (`ShellLayout`); Admin remote D5; dashboard layout widgets (explicit prior non-goal: nested remote sidebar — **this spec supersedes that non-goal** for shell-owned API nav)

**Authority:** Running code in `backend/src/api/mfe-config/`, `shell/src/`, `remotes/admin-react/`, `packages/mfe-sdk/` is ground truth for integration points. This file is design intent.

---

## 1. Problem statement

Shell today lists every accessible `MfeConfig` as a **flat** drawer item. That conflates “which apps exist” with “routes inside an app.” Portal UX (national single-window style) needs:

1. **Launcher** — grid of apps (widgets) on Home + header Apps popover.
2. **Per-app sidebar** — nested menu for the **current** `MfeConfig` only, managed via API + admin, scope-gated per node.

### User stories

- As a signed-in user, `/app` shows a grid of apps I can access (`accessible`); clicking one opens `/app/{routeName}` with that app’s sidebar.
- As a user already inside an app, header Apps control switches apps without returning to Home first.
- As an ADMIN, I CRUD nested nav (`group` / `route`) per config, assign scopes per node, set icon URLs.
- As security, nav visibility is UX only; Nest `@RequireScopes` / SoftGate remain real gates. No ADMIN bypass on accessible lists. Scope-only (no RBAC tables).

### Non-goals

- RBAC / roles / permissions tables
- MinIO / icon upload (icon = HTTPS URL only)
- Remote-owned second sidebar / double chrome
- External URL nav leaves
- Cross-remote links from another app’s sidebar
- Changing mount contract (`basePath`, `routeName`, `locale?`, `onNotify?`)
- Embedding full nav trees in `GET accessible`
- Angular remotes; Vue-specific nav editor
- Replacing remote internal routers

---

## 2. Decisions locked

| # | Decision | Choice |
|---|----------|--------|
| 1 | Sidebar owner | **Shell** |
| 2 | Authz | **Scope-only**; per-node `scopes[]`; no silent inherit |
| 3 | Launcher unit | **1 `MfeConfig` = 1 widget = 1 nav tree** |
| 4 | Launcher UX | **Home `/app` + header Apps grid** (same data) |
| 5 | Node types | **`group` \| `route`**; path relative to `/app/{routeName}` |
| 6 | Icons | **HTTPS `iconUrl`** on config + optional on nodes |
| 7 | Nav load | **Lazy** on enter `/app/:routeName`; memory cache per session |
| 8 | Approach | **1** — entity + ADMIN CRUD + shell rewrite |
| 9 | Mount contract | **Unchanged** — nav not passed into `mount` |
| 10 | Deep-link | Allowed; hidden nav ≠ ACL; remotes/API must still guard |

---

## 3. Evaluated approaches

| # | Summary | Effort | Verdict |
|---|---------|--------|---------|
| **1** | `mfe_nav_item` + scopes join; accessible nav endpoint; admin tree UI; shell Home + Apps + drawer | ~22–30h | **Selected** |
| 2 | JSON blob on `MfeConfig` | ~12–16h | Rejected — weak nested CRUD / per-node scopes |
| 3 | Remote-declared nav / layout slot | ~14–20h | Rejected — not API+admin managed |

---

## 4. Architecture & components

```
/app                    → HomeLauncher (accessible widgets)
/app/:routeName/*       → Shell drawer = lazy nav tree | RemoteOutlet

GET /api/v1/mfe-configs/accessible                         → launcher (+ iconUrl)
GET /api/v1/mfe-configs/by-route/:routeName/nav/accessible → scoped tree (lazy)

ADMIN CRUD under /api/v1/mfe-configs/:id/nav-items ...
```

| Unit | Owns | Must not |
|------|------|----------|
| Backend nav module | Entity, migration, filter, CRUD | React route knowledge beyond stored paths |
| `MfeConfig` | Registry + `iconUrl` | Nav blob column |
| Shell | Home, Apps popover, drawer binding, cache | Hardcoded menus; remote nav exposes |
| Admin remote | Tree editor UI | Runtime shell drawer |
| Remotes | Pages under `basePath` | Full second AppBar/Drawer chrome |
| `@mfe/sdk` | Types (+ optional helpers) | UI |

### Invariants

1. Launcher tile only if config in `accessible`.
2. Drawer only when `routeName` present; `/app` = no app drawer.
3. Parent failing scope filter → entire subtree omitted.
4. Empty `group` after filter → omit group.
5. Leaf href = `/app/{routeName}/{path}` with `path` normalized (no leading `/`).
6. Nav is not authorization.

---

## 5. Data model & API

### 5.1 Schema

**`mfe_config`** — add nullable `icon_url` (`varchar`, length ≤ 2048).

**`mfe_nav_item`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `mfe_config_id` | uuid FK CASCADE | tree root owner |
| `parent_id` | uuid FK CASCADE NULL | adjacency list; null = root |
| `type` | enum/text | `group` \| `route` |
| `title` | varchar(80) | |
| `path` | varchar(200) NULL | required iff `type=route`; relative; `^[a-z0-9-]+(?:/[a-z0-9-]+)*$` |
| `icon_url` | varchar(2048) NULL | https only when set |
| `sort_order` | int | sibling order, default 0 |
| timestamps | | AbstractEntity pattern |

**`mfe_nav_item_scope`** — M2M mirror `mfe_config_scope` (owner CASCADE, scope RESTRICT/NO ACTION).

Constraints:

- `route` nodes: `path` NOT NULL; `group`: `path` NULL.
- Same `mfe_config_id` + `parent_id` + `path` unique among `route` siblings (optional soft: document collision → 409).
- Max depth **recommended ≤ 3** in admin UX; server may enforce ≤ 5.

### 5.2 Filter algorithm (`nav/accessible`)

1. Resolve `MfeConfig` by `routeName`; 404 if missing.
2. If user lacks ANY-overlap with **config** scopes → **404** (do not leak existence) *or* 403 — **prefer 404** consistent with shell NotFound when not in accessible. Spec lock: **404** if config not in user’s accessible set.
3. Load all nav items for config + scopes.
4. Keep node if `node.scopes` empty? **Lock: empty scopes = visible to any user who can see the config** (folder chrome) OR require ≥1 scope? **Lock: `@ArrayNotEmpty` on write — every node must have ≥1 scope** (same spirit as MfeConfig create). Safer.
5. Keep node if user scopes ∩ node.scopes ≠ ∅.
6. Drop nodes whose ancestor was dropped.
7. Drop `group` with zero remaining children.
8. Sort by `sort_order`, build tree JSON.

### 5.3 Endpoints

| Method | Path | Scope | Purpose |
|--------|------|-------|---------|
| GET | `/mfe-configs/accessible` | auth | unchanged + `iconUrl?` |
| GET | `/mfe-configs/by-route/:routeName/nav/accessible` | auth | filtered tree (`by-route` avoids clash with UUID `:id`) |
| GET | `/mfe-configs/:id/nav-items` | ADMIN | flat or tree (admin editor) |
| POST | `/mfe-configs/:id/nav-items` | ADMIN | create node |
| PATCH | `/mfe-configs/:id/nav-items/:itemId` | ADMIN | update |
| DELETE | `/mfe-configs/:id/nav-items/:itemId` | ADMIN | cascade children |
| PATCH | `/mfe-configs/:id/nav-items/reorder` | ADMIN | optional batch `{ id, parentId, sortOrder }[]` |

Declare static segments (`accessible`, `by-route`, `nav-items`) **before** UUID `:id` (same lesson as `accessible` vs `:id`).

### 5.4 DTOs (sketch)

```ts
// accessible nav node
{ id, type: 'group'|'route', title, path?: string, iconUrl?: string,
  children: NavNode[] }

// admin create
{ type, title, path?, iconUrl?, parentId?, sortOrder?, scopeNames: string[] }
```

`iconUrl` validation: `@IsUrl({ protocols: ['https'], require_protocol: true })` when present.

### 5.5 Seed

Per demo configs (`product`, `admin`, `vue`, optionally `article`): small trees with DASHBOARD/ADMIN scopes so shell drawer is non-empty after migrate+seed.

---

## 6. Shell UX & data flow

### Boot (unchanged core)

`refresh` → `GET accessible` → `registerRemotes` → ready.

### Routes

| Path | UI |
|------|----|
| `/app` | Home launcher grid; **no** app NavDrawer (or drawer closed / empty state) |
| `/app/:routeName/*` | Lazy fetch nav; NavDrawer = tree; Main = RemoteOutlet |

### Header

Apps icon → popover/modal grid (same `accessibles` + `iconUrl`). Selecting app → `navigate(/{routeName})`.

### Cache

`Map<routeName, NavNode[]>` in React context; invalidate on `refreshAccessibles` and on nav fetch error retry. No `localStorage` for nav.

### Active item

Match longest prefix of current location under `/app/{routeName}/` against leaf `path`.

### Icon render

`<img src={iconUrl}>` or Avatar fallback to title initial if missing/broken (`onError`).

### CSP note

Document that production CSP `img-src` must allow icon hosts; admin-compromised URL = XSS vector only if rendered unsafely — use `<img>` not `dangerouslySetInnerHTML`; prefer URL allowlist later (out of v1).

---

## 7. Admin UI

Under admin remote **Configs**:

- Config edit: field `iconUrl`.
- Tab or nested route **Nav** per config: tree view (expand/collapse), add child, edit, delete, reorder (up/down or drag if cheap), scope multi-select.

Reuse RHF + zod + `api.*` patterns from existing config pages. SoftGate unchanged.

---

## 8. Error handling & edge cases

| Case | Behavior |
|------|----------|
| Nav fetch fail | Drawer error + Retry; remote outlet may still mount |
| Empty tree after filter | Drawer: “No menu items” |
| Unknown `routeName` | Existing NotFound (not in accessible) |
| Invalid `path` on write | 422 |
| Cycle parentId | 422 on write |
| HTTPS icon http:// | 422 |
| Deep-link hidden leaf | Remote loads; API 403 if guarded — do not auto-redirect from shell |
| Switch app | New lazy fetch (cache hit if visited) |

---

## 9. Testing strategy

**Backend**

- Unit: filter (parent hide, empty group, ANY-overlap), path validation, 404 when config not accessible.
- e2e: admin CRUD + user nav/accessible shape.

**SDK**

- Type export; optional helper tests if added.

**Shell**

- Route: `/app` shows grid; `/app/:route` shows tree links.
- Manual/browser: Apps popover switch; no tokens in storage.

**Admin**

- Create nested group→route; scope-hide node for dashboard user.

---

## 10. Implementation considerations & risks

| Risk | Mitigation |
|------|------------|
| Route collision `nav` vs `:id` | Declare routes carefully; prefer `:routeName/nav/accessible` on dedicated controller method before `:id` |
| Double chrome | Remotes must not add full NavDrawer; PageToolbar OK |
| Icon SSRF/phishing | https-only; `<img>` only; CSP docs |
| Stale cache | Invalidate with accessible refresh |
| Effort creep (drag-drop) | v1 = up/down reorder OK |
| Prior “no nested sidebar” docs | Update standards/roadmap; this spec wins |

**Effort:** ~22–30h (backend 8–10, SDK 1–2, shell 6–8, admin 6–8, seed/docs/tests 2–3).

---

## 11. Success metrics

- [ ] `/app` launcher shows accessible configs with `iconUrl` when set
- [ ] Header Apps switches apps
- [ ] Inside app, drawer shows nested scoped tree from API (not flat config list)
- [ ] ADMIN can CRUD nested items + scopes + icon URLs
- [ ] User without node scope does not see node; API still enforces on data routes
- [ ] Mount contract unchanged; no axios outside SDK
- [ ] `make migrate && make seed` yields demo trees
- [ ] Unit/e2e coverage for filter + CRUD happy path

---

## 12. Next steps

1. Implementation plan: `plans/260916-1737-app-launcher-nav-tree/`
2. Cook phases with file ownership (backend → SDK+admin parallel → shell → docs)
3. Update `docs/code-standards-frontend.md` / roadmap after ship

---

**Approved:** 2026-09-16 (user: approve all sections + Approach 1)  
**Last updated:** 2026-09-16
