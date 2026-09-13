# Phase 3 — URL as shared state (all three lists)

## Context Links

- `remotes/admin-react/src/pages/users/UsersListPage.tsx:29,34-53` — `page` in `useState`, mount effect hardcodes `load(1)`
- `remotes/admin-react/src/pages/scopes/ScopesListPage.tsx`, `pages/configs/ConfigsListPage.tsx` — same pattern
- `remotes/admin-react/src/lib/api/users.ts:8-13` → `GET /api/v1/users?page&limit`
- `remotes/admin-react/src/lib/api/scopes.ts:6-8` → `GET /api/v1/scopes?page&limit`
- `remotes/admin-react/src/lib/api/configs.ts:6-11` → `GET /api/v1/configs?page&limit`
- `backend/src/api/user/dto/list-user.req.dto.ts` — extends `PageOptionsDto` (offset pagination)
- `remotes/admin-react/src/AdminApp.tsx:27` — `BrowserRouter basename={basePath}`
- `docs/code-standards-frontend.md` §2.3 (Component Patterns)

## Overview

- **Priority:** P1
- **Status:** pending
- **Effort:** 2.5h
- **Risk:** low-medium (three files, one convention)

Make list/paging state live in the **URL query string** instead of component memory, so it is shareable, reload-safe, and survives back/forward. Apply to **users, scopes and configs** — all three already call APIs that accept `page`/`limit`.

## Key Insights

- All three list APIs already take `{ page, limit }`, so URL state maps 1:1 onto real server-side paging — nothing needs inventing client-side.
- Today every list holds `page` in `useState` and loads page 1 on mount with `[]` deps: the URL cannot express page 2, and refresh always resets to page 1.
- The remote owns its own `BrowserRouter basename={basePath}`, so `useSearchParams()` works inside the remote with **no shell involvement**.
- This only becomes genuinely useful once Phase 1 lands — otherwise a shared `?page=2` link 404s on refresh.
- Keep query strings **non-sensitive**: never a token, never PII beyond what the page already displays.

## Requirements

- `page` for users, scopes and configs is represented in the URL and is the single source of truth.
- Parsing must be defensive: invalid/missing values fall back to defaults, never crash.
- Prev/Next must update the URL (push) so back/forward walks paging history.
- Out-of-range pages clamp and rewrite the param (no blank table from a stale link).
- The convention is documented once, in code-standards, so later remotes copy it.

## Architecture

```
URL  /app/admin/users?page=2
        │
        ▼
 useSearchParams()  ──▶  page = parse & clamp(param, 1, totalPages)
        │
        ▼
 listUsers(page)  ──▶  GET /api/v1/users?page=2&limit=20
        │
        ▼
 render; Prev/Next → setSearchParams({page: n})   (URL is the source of truth)
```

## Related Code Files

**Modify**
- `remotes/admin-react/src/pages/users/UsersListPage.tsx`
- `remotes/admin-react/src/pages/scopes/ScopesListPage.tsx`
- `remotes/admin-react/src/pages/configs/ConfigsListPage.tsx`
- `docs/code-standards-frontend.md` — add the convention under §2.3

**Read/verify**
- The three `lib/api/*.ts` wrappers — confirm each forwards `page`

## Implementation Steps

1. **Land users first**, verify, then copy the same shape to scopes and configs. Replace local page state with URL state:
   ```tsx
   const [searchParams, setSearchParams] = useSearchParams();
   const raw = Number(searchParams.get('page') ?? '1');
   const page = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
   ```
2. Key the load on the URL value and drop the hardcoded first load:
   ```tsx
   useEffect(() => { void load(page); /* eslint-disable-next-line */ }, [page]);
   ```
3. Prev/Next write to the URL instead of calling `load` directly:
   ```tsx
   const goTo = (n: number) => setSearchParams(n > 1 ? { page: String(n) } : {});
   ```
4. Clamp after the response arrives: if the requested page exceeds `totalPages`, re-set the param to the clamped value.
5. **Do not** call `load` from the paging buttons — the URL change drives the load (single source of truth).
6. Preserve existing behaviour in each list: `useDeleteFlow` reloads the **current** page (`onDeleted: () => load(page)`) — keep that, now reading the URL-derived `page`.
7. Repeat steps 1–6 for scopes and configs. Note scopes/configs default `limit` differs (100 vs 20) — keep each file's existing limit.
8. Verify per list: `?page=2` renders page 2; refresh keeps page 2; back returns to page 1; `?page=abc` degrades to page 1; `?page=9999` clamps.
9. Document the convention in `docs/code-standards-frontend.md` §2.3 (short subsection, e.g. "URL as state"):
   - Shareable UI state (page, filter, tab, search) → query string, read via `useSearchParams()`.
   - Ephemeral state (open dialog, hover, in-flight form) → component state.
   - **Never** put tokens or secrets in the URL (guarantee #3/#10).
   - Parse defensively with a default; clamp values that depend on server data.
   > Keep §2.11 (pins table) last — add inside §2.3, do not create a new trailing section. See Phase 4, which also touches this file: coordinate so the two edits land coherently.

## Todo List

- [ ] `UsersListPage` reads `page` from URL; effect keys on it
- [ ] Users Prev/Next write to URL; out-of-range clamps
- [ ] Users: shareable link + refresh + back/forward verified
- [ ] `ScopesListPage` converted (keep `limit=100`)
- [ ] `ConfigsListPage` converted (keep its existing limit)
- [ ] All three: `?page=abc` degrades gracefully
- [ ] `useDeleteFlow` still reloads the current page in all three
- [ ] Convention documented in `code-standards-frontend.md` §2.3

## Success Criteria

- `/app/admin/users?page=2`, `/app/admin/scopes?page=2`, `/app/admin/configs?page=2` are shareable and survive hard refresh.
- Browser back/forward moves between pages correctly in all three lists.
- Invalid params degrade gracefully; stale high page numbers clamp instead of showing an empty table.
- Delete-then-reload stays on the current page.
- Convention documented in exactly one place.

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Double-load when both URL and a state update fire | URL is the only trigger; buttons never call `load` |
| Stale link points past the last page | Clamp and rewrite the param (step 4) |
| Three files drift into three slightly different implementations | Land users first, then copy verbatim; document once |
| Losing the page on delete | Keep `onDeleted: () => load(page)` reading the URL value |
| Shell router confused by remote query changes | Query changes do not alter the matched route path; Phase 1's splat covers refresh |
| Concurrent edit with Phase 4 on `code-standards-frontend.md` | Sequence the two edits or land them in one commit |

## Security Considerations

- Query strings appear in history, logs and referrers: allow only non-sensitive list state.
- Never place the access token or any credential in the URL (locked rule; SDK spec asserts no URL tokens).
- Page numbers are not an authorization boundary — the API still enforces `@RequireScopes(ADMIN)`.

## Next Steps

Phase 4 adds the approved shell→remote signal; Phase 5 verifies end-to-end and syncs docs.
