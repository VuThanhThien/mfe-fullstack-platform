# Code Standards & Conventions (Hub)

**Date:** 2026-09-13  
**Version:** 2.0  
**Scope:** Hub — cross-cutting conventions (§4–§6). Backend §1, Frontend §2, SDK §3 live in the satellites.

> **Split note (v2.0):** the former single-file document was split into a hub plus three satellites. §1, §2 and §3 moved **verbatim**; every section number is unchanged, so existing citations (`§2.4`, `§3.4`, …) still resolve to exactly the same content.

**Authority:** running code wins — see [`../CLAUDE.md`](../CLAUDE.md) for the full precedence order.

---

## Where to find what

| Document | Sections | Covers |
|----------|----------|--------|
| [`code-standards-backend.md`](./code-standards-backend.md) | §1.1–§1.8 | NestJS project structure, naming, scope naming, decorators, exception handling, TypeORM & migrations, testing, configuration |
| [`code-standards-frontend.md`](./code-standards-frontend.md) | §2.1–§2.11 | React + Vite project structure, naming, component patterns, `@mfe/sdk` usage, error handling, testing, TypeScript, Module Federation, forms, hooks, **locked dependency pins (§2.11)** |
| [`code-standards-sdk.md`](./code-standards-sdk.md) | §3.1–§3.4 | `@mfe/sdk` structure, public exports, in-memory state, axios HTTP layer |
| **This file** | §4–§6 | General conventions, linting & formatting, security checklist |

**Pinned stack:** the locked frontend dependency pins are the table in [`code-standards-frontend.md` §2.11](./code-standards-frontend.md) — do not duplicate or fork it here.

---

## 4. General Conventions

### 4.1 Comments & Documentation

**Code comments (when "why" is not obvious):**

```typescript
// ✓ Good: explains business logic
// ADMIN scope deliberately does NOT bypass accessible check
// to maintain uniform visibility across the platform
const accessible = configs.filter(c =>
  hasIntersection(user.scopes, c.scopes)
);

// ✗ Avoid: obvious from code
// Loop through configs
for (const config of configs) {
  //...
}
```

**Function/type documentation (JSDoc):**

```typescript
/**
 * Load a remote application at runtime.
 * 
 * @param cfg Remote metadata (remoteEntry, remoteName, exposedModule)
 * @returns Remote module with mount/unmount lifecycle
 * @throws If remoteEntry.js fails to load
 */
export async function loadRemote(cfg: MfeRemoteRef): Promise<RemoteModule> {
  // ...
}
```

### 4.2 Error Messages

**User-facing errors (clear, actionable):**
- "Invalid email or password"
- "Your session has expired. Please log in again."
- "You do not have permission to access this resource."

**Developer errors (specific, include context):**
- "Unknown scope names: [UNKNOWN_SCOPE] (availableScopes: [ADMIN, DASHBOARD])"
- "Duplicate routeName 'demo' detected"

### 4.3 Git Commit Messages

**Conventional commits:**

```
<type>(<scope>): <subject>

<body (optional)>

<footer (optional)>

Types: feat, fix, docs, chore, refactor, test, perf, ci
Scopes: backend, frontend, landing, shell, sdk, gateway, docs
```

**Examples:**

```
feat(backend): add cookie refresh token support

- Endpoint POST /auth/refresh reads HttpOnly cookie
- Rotates refresh token on each refresh
- Shipped in Phase C: login/refresh JSON no longer contains refreshToken

Closes #42

---

fix(sdk): deduplicate concurrent refresh calls

Parallel 401s now share a single refresh() promise, preventing
race conditions when multiple remotes retry simultaneously.

---

docs: update README with Phase C architecture

Clarifies one-origin routing via Caddy :8080
```

---

## 5. Linting & Formatting

### 5.1 Backend

**ESLint config (NestJS boilerplate):**
- Enforces NestJS patterns
- Type-aware rules
- Run: `pnpm lint` (auto-fix)

**Code format (Prettier):**
- 80–100 char line length
- 2-space indents
- Single quotes for strings
- Semicolons

### 5.2 Frontend

**No frontend ESLint or Prettier config exists yet.** The only lint/format configs in the repo
are `backend/eslint.config.mjs` and `backend/.prettierrc`; landing, shell, demo-react and
`packages/mfe-sdk` have no `eslint.config.*` / `.prettierrc` and no `lint` script. Do not claim
"same as backend" until a frontend config is actually added.

Until then, match the surrounding code: `strict` TypeScript (which the app configs already
enforce, §5.3), MUI `sx` for styling, and **no unused imports/vars** — `noUnusedLocals` /
`noUnusedParameters` in each `tsconfig.app.json` fail the build for those.
Note that `RemoteOutlet.tsx` still carries one targeted
`// eslint-disable-next-line react-hooks/exhaustive-deps`.

### 5.3 TypeScript

**landing and shell use TypeScript project references.** Their `tsconfig.json` is a solution
file (`"files": []`) that references `tsconfig.app.json` (browser code) and
`tsconfig.node.json` (Vite config). The apps' `typecheck` script is `tsc -b --noEmit`.
`remotes/demo-react` has a single `tsconfig.json` and runs plain `tsc --noEmit`.

```jsonc
// landing/tsconfig.json (same shape in shell/, reference order differs)
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}

// landing/tsconfig.app.json (excerpt) — the actual strict settings
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

**The `@/…` import alias is backend-only.** Only `backend/tsconfig.json` defines `paths`; no
frontend tsconfig or Vite config declares `paths` or `resolve.alias`. Frontend imports are
relative (`./auth/Gate`, `../schemas/auth.js`). An `@/…` import in a frontend app will not
resolve.

---

## 6. Security Checklist

### Backend
- [ ] No plaintext passwords in logs
- [ ] No JWT tokens in logs (redacted)
- [ ] `DATABASE_SYNCHRONIZE: false` (migrations only)
- [ ] Secrets in `.env` (gitignored)
- [ ] CORS allow-list (not `*`)
- [ ] ValidationPipe on all input
- [ ] Exception filter masks internals (no stack in 4xx)

### Frontend
- [ ] No `localStorage` / `sessionStorage` for tokens
- [ ] No `?token=` URLs
- [ ] Cookie transport handled by the SDK (`withCredentials: true`); apps never set it
- [ ] `HttpOnly` cookies enforced (no JS access)
- [ ] Tokens not logged (no `console.log(accessToken)`)
- [ ] API calls through SDK only
- [ ] No hardcoded credentials in code

---

**Document version:** 2.0  
**Last updated:** 2026-09-13
