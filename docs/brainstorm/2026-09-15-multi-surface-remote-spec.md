# Design Spec — Multi-Surface Remote (Hybrid Expose)

**Date:** 2026-09-15  
**Status:** approved — plan at `plans/260915-1117-remote-standalone-multi-surface/`  
**Approach:** Convention + proof on product remote (Approach 2)  
**Related:** [Remote Standalone Auth](./2026-09-15-remote-standalone-auth-spec.md) (Spec A — dual-mode SPA; standalone = primary tree only)

**Authority:** Running code (`MfeConfig`, SDK `loadRemote`, shell `RemoteOutlet`) wins over older Phase C wording where they conflict.

---

## 1. Problem statement

Team remote theo feature có **nhiều màn**. Cần rule rõ: khi nào nested trong một `{ mount, unmount }`, khi nào thêm MF expose + `MfeConfig` (nav/scope tách) — không nhân remote repo cho mỗi page.

### User stories

- As a feature team, I ship **one deployable** with many screens via nested routes by default.
- As the platform, I show **multiple shell nav entries** from one bundle when nav or scopes must split.
- As a dashboard user, I open **Products** (nested category/article flows) and optionally **Articles** as a separate nav surface from the same remote.
- As a local developer (Spec A), I run standalone against the **primary** product tree only.

---

## 2. Decisions locked

| Decision | Choice |
|----------|--------|
| Model | **Hybrid (3):** nested default; extra expose only when needed |
| Split rule (C) | New expose + `MfeConfig` if **scopes differ** OR **separate shell nav / title / routeName** |
| Registry group | **No `bundleId`** — convention: same `remoteName` (+ same `remoteEntry` origin) = one bundle |
| Standalone | **Primary nested app only** — multi-expose is a shell concern |
| Proof naming | Domain: **product / category / article** — not `demo` / `demo-tools` |
| Proof scopes | Secondary same `[DASHBOARD]` (nav-split proof); scope-split documented only |
| Schema / SDK / mount contract | **Unchanged** |
| Package folder rename `demo-react` | Optional follow-up; seed/`remoteName` move to product-oriented ids |

---

## 3. Evaluated approaches

| # | Name | Verdict |
|---|------|---------|
| 1 | Docs-only (admin nested as sole reference) | Rejected — no multi-`MfeConfig` proof |
| 2 | Convention + proof (Vite multi-expose + seed) | **Selected** |
| 3 | `bundleId` + admin grouping | Rejected — YAGNI vs lock A |

---

## 4. Architecture & components

### Deployable layout

```
remotes/demo-react/          # folder rename optional later
  vite exposes:
    ./Product  → src/exposes/product.tsx   { mount, unmount }
    ./Article  → src/exposes/article.tsx   { mount, unmount }
  Product app: nested router (category + article-under-product)
  standalone/main.tsx (Spec A): Product tree only
```

### Registry (seed target)

| `routeName` | `title` (example) | `remoteName` | `exposedModule` | `scopeNames` |
|-------------|-------------------|--------------|-----------------|--------------|
| `product` | Products | `productReact` | `./Product` | `[DASHBOARD]` |
| `article` | Articles | `productReact` | `./Article` | `[DASHBOARD]` |

- `routeName` remains **globally unique**.
- Replace legacy `demo` / `demoReact` / `./App` in seed (migration path: seeder idempotent by `routeName`; plan may delete or leave orphan `demo` row — prefer replace).
- Gateway `/r/...` path alignment decided in implementation plan (may keep `/r/demo-react` until folder rename).

### Nested vs expose

| Surface | How |
|---------|-----|
| Product list/detail | Nested in `./Product` |
| Category | Nested in `./Product` — **not** a separate expose in this spec |
| Article under product | Nested in `./Product` |
| Articles hub (shell nav) | Separate `./Article` expose + `MfeConfig` |

### Anti-patterns

- One expose per page  
- Duplicate `MfeConfig` for a URL already nested under primary  
- Extra expose without nav or scope justification  
- Sharing one module-level `root` across Product and Article expose files  

### Unchanged platform pieces

- `{ mount, unmount }` + `RemoteMountContext`  
- `GET /api/v1/mfe-configs/accessible` ANY-overlap  
- Shell one nav item ↔ one config ↔ one mount lifecycle  

---

## 5. Data flow & interfaces

### Hosted

```
accessible → [product, article] (same remoteName)
registerRemotes (runtime; entry shared)
/app/product  → loadRemote(product) → Product.mount
/app/article  → loadRemote(article) → Article.mount
navigate away → previous unmount()
```

### Primary nested (illustrative)

```
/app/product
/app/product/categories
/app/product/:productId
/app/product/:productId/articles
```

`basename={ctx.basePath}` (admin pattern).

### Standalone

SessionGate (Spec A) → Product router with full nested category/article routes. No requirement to expose or register `./Article` locally.

### Interfaces

| Surface | Contract |
|---------|----------|
| Each expose file | `{ mount, unmount }` only |
| `MfeRemoteRef` | Existing fields; no bundle field |
| Vite `exposes` | Map string → module path exporting mount API |
| Docs | Decision table + convention same `remoteName` |

---

## 6. Error handling

| Case | Behavior |
|------|----------|
| Both configs accessible | Two nav items; independent mount lifecycles |
| Only one accessible (future different scopes) | Normal `accessible` filtering |
| Bad `exposedModule` | Existing RemoteOutlet error + Retry |
| Duplicate `routeName` | Existing uniqueness / seeder by `routeName` |
| Same `remoteName`, divergent `remoteEntry` | Convention violation — document; no hard validate in Spec B |
| Nested 404 | Remote NotFound; do not cross-jump to Article expose |
| product ↔ article nav | Full unmount/mount; no cross-expose React state |
| `onNotify` | Per-mount, unchanged |

---

## 7. Testing strategy

### Unit / contract

- Both exposes export `{ mount, unmount }`.  
- SDK moduleId fixtures: `productReact/Product`, `productReact/Article`.  
- Seeder idempotent for `product` + `article`.

### Shell integration

- DASHBOARD user: nav Products + Articles.  
- `/app/product` nested paths work.  
- `/app/article` mounts secondary.  
- Cross-nav unmount/mount clean (no federation runtime blow-up).

### Standalone

- Primary tree includes category nested routes without second Vite HTML entry.

### Smoke / e2e

- Update browser script for `/app/product` (+ optional `/app/article`).  
- `make smoke` paths if gateway remote prefix changes.  
- No access token in web storage.

### Success metrics

1. Two configs, one `remoteName`, two exposes — both on nav for DASHBOARD.  
2. Category is nested-only in proof.  
3. Docs encode hybrid rules + anti-patterns.  
4. No `bundleId` migration.

---

## 8. Implementation considerations & risks

| Risk | Mitigation |
|------|------------|
| Seed/e2e/docs still say `demo` | Checklist rename routeName/remoteName/titles |
| Folder still `demo-react` vs `productReact` | Allow path lag; document mapping in plan |
| Over-splitting by teams | Spec + code-standards blurb: split rule C |
| Spec A ordering | Prefer Spec A SessionGate on primary before or with this slice; multi-expose proof can land in shell-integrated mode first |
| Legacy `demo` config row | Seeder replace/remove; avoid two nav demos |

**Reference implementation:** product remote (current `remotes/demo-react`). Admin stays single-expose nested CRUD example for ADMIN scope.

---

## 9. Out of scope

- `bundleId` / deployable FK  
- New scopes for article-only proof  
- Vue/Angular, widget view, route ACL tables  
- Mandatory rename of disk folder `demo-react`  
- Changing mount ctx or passing tokens  

---

## 10. Dependencies & next steps

1. User approves this spec (+ Spec A if not already).  
2. `/plan` Spec A then Spec B (or combined plan with clear phase order: auth standalone → multi-surface proof).  
3. Update `docs/code-standards-frontend.md` (or hub) with hybrid remote rules when implementing.

---

## 11. Validation checklist

- [ ] Seed: `product` + `article`, `remoteName=productReact`, exposes `./Product` + `./Article`  
- [ ] Category only under product nested routes  
- [ ] Shell nav shows both for DASHBOARD user  
- [ ] Standalone (when Spec A done) uses primary tree only  
- [ ] Docs: split rule C + same-`remoteName` convention + anti-patterns  
- [ ] No schema migration for bundling  

---

**Last updated:** 2026-09-15
