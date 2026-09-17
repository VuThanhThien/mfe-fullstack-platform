# Phase 04 — shell harden history sync

**Priority:** P2  
**Status:** Complete  
**Effort:** 1h  
**Owns:** `shell/src/routing/`, `shell/src/nav/use-shell-pathname.ts`  
**Blocked by:** P1 (if consuming shared helpers; else can start after location-sync API stable)

## Overview

Reduce re-entry risk and basename drift in shell sync / active pathname.

## Requirements

1. `ShellHistorySync`: wrap `navigate(..., { replace: true })` in `runWithoutLocationNotify` (mirror remote WindowToMemory).
2. Keep `lastSynced` sync-before-navigate guard.
3. Dedupe `BASENAME='/app'` — prefer SDK helper if P1 exported `shellPathFromWindow`; else one shell const shared by both files.
4. Document in file comment: pathname-only for shell sync (search/hash owned by remote unless shell needs them later — YAGNI).
5. typecheck shell.

## Related files

**Modify**

- `shell/src/routing/ShellHistorySync.tsx`
- `shell/src/nav/use-shell-pathname.ts`
- Optional tiny `shell/src/nav/app-basename.ts` if SDK helper not shipped

**Must not:** change Gate boot; RemoteOutlet remount keys; remotes.

## Implementation steps

1. [x] Import `runWithoutLocationNotify` (+ helper if any).
2. [x] Apply depth guard around shell `navigate`.
3. [x] Unify basename / `toShellPath` / `shellPathFromWindow`.
4. [x] `pnpm typecheck` in shell.

## Success criteria

- [x] No duplicate magic `/app` string across the two files (or both call same helper)
- [ ] e2e shell-nav-click still passes after P2/P3 land *(skipped in P5: Puppeteer Chrome not installed)*

## Next

P5.
