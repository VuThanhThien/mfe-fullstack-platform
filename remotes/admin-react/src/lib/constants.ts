/** Nest `@RequireScopes(ADMIN)` is the real gate; the SoftGate only mirrors it for UX. */
export const ADMIN_SCOPE = 'ADMIN';

/** Shell slug of this remote — editing its config can hide Admin from your own nav. */
export const ADMIN_ROUTE_NAME = 'admin';

/** routeNames created by the backend seeder; deleting one can blank the shell nav. */
export const SEEDED_ROUTE_NAMES = new Set([ADMIN_ROUTE_NAME, 'demo']);

/** Mirrors backend `MFE_FRAMEWORKS`. */
export const FRAMEWORKS = ['react', 'vue', 'angular'] as const;

export type Framework = (typeof FRAMEWORKS)[number];
