/**
 * Decode JWT payload scopes without verifying the signature.
 * SoftGate UX only — Nest `@RequireScopes(ADMIN)` remains the authz source of truth.
 */
export function decodeJwtScopes(token: string | null): string[] {
  if (!token) return [];

  const parts = token.split('.');
  if (parts.length < 2) return [];

  try {
    const payloadJson = base64UrlDecode(parts[1]!);
    const payload = JSON.parse(payloadJson) as { scopes?: unknown };
    if (!Array.isArray(payload.scopes)) return [];
    return payload.scopes.filter((s): s is string => typeof s === 'string');
  } catch {
    return [];
  }
}

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padLength);
  return atob(base64);
}
