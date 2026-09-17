# Brainstorm summary — location / history sync

**Verdict:** Keep demo-react + SDK patch model; canonicalize; migrate admin; document MUST rule.

## Problem

Nested MFEs + one address bar require a single history notification bus and one remote router pattern. Today: three patterns → inconsistent deep link / shell-nav / back behaviour; admin nested BrowserRouter is the sharp edge.

## Options

| # | Approach | Pros | Cons |
|---|----------|------|------|
| A | Memory + SyncedMemoryRouter in SDK | One model; shell nav works; matches working product remote | Admin migrate; SDK gains optional React peers |
| B | Nested BrowserRouter + sync listener | Smaller admin diff | Two BrowserRouters; weaker mental model |
| C | Shared history / shell deep router | Pure history | Breaks non-goal; overkill |

## Locked

- **A**
- SyncedMemoryRouter in **`@mfe/sdk`** (subpath `@mfe/sdk/react-router`)
- Docs/READMEs: hosted React → SyncedMemoryRouter; no nested BrowserRouter under shell
- Vue sync OOS

## Improve while migrating

- Unit tests location-sync re-entrancy
- ShellHistorySync + `runWithoutLocationNotify`
- Optional `APP_BASENAME` / `shellPathFromWindow` shared from SDK (pathname helpers only — no React)
