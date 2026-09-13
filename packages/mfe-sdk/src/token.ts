/**
 * In-memory access token — the single source of truth.
 *
 * Lives in its own dependency-free module so the axios instance (`http.ts`) can
 * read the token **synchronously** without importing `auth.ts`. `auth.ts`
 * imports the axios instance, so importing `auth.ts` from `http.ts` would create
 * a static import cycle (auth → http → auth).
 *
 * Locked rule: the access token is NEVER persisted to localStorage,
 * sessionStorage, a cookie, or a URL.
 */

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
