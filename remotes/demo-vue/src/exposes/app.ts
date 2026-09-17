import { createApp, type App } from 'vue';
import { createPinia } from 'pinia';
import type { RemoteMountContext } from '@mfe/sdk';
import {
  createAppRouter,
  seedEmbeddedLocation,
  type RouterMode,
} from '@/router';
import { bindSyncedMemoryLocation } from '@/routing/sync-memory-location';
import { bindThemeToEl } from '@/theme/mode';
import AppRoot from '@/App.vue';
import '@/style.css';

/** One module-level root per expose file. */
let app: App<Element> | null = null;
let unbindTheme: (() => void) | null = null;
let unbindLocation: (() => void) | null = null;
/** Bumps on each boot so a superseded async mount does not finish after unmount. */
let bootGen = 0;

async function boot(
  el: HTMLElement,
  ctx: RemoteMountContext,
  routerMode: RouterMode,
): Promise<void> {
  unmount();
  const gen = ++bootGen;

  el.setAttribute('data-demo-vue', '');
  unbindTheme = bindThemeToEl(el);

  const pinia = createPinia();
  const router = createAppRouter(routerMode);

  if (routerMode === 'embedded') {
    // Await seed BEFORE location sync — otherwise afterEach on the default `/`
    // pushStates `/app/vue` and a hard reload of `/app/vue/reports` collapses.
    await seedEmbeddedLocation(router, ctx.basePath);
    if (gen !== bootGen) return;
    unbindLocation = bindSyncedMemoryLocation(router, ctx.basePath);
  }

  if (gen !== bootGen) return;

  app = createApp(AppRoot, {
    basePath: ctx.basePath,
    routeName: ctx.routeName,
    locale: ctx.locale,
  });
  app.use(pinia);
  app.use(router);
  app.mount(el);
}

export function mount(
  el: HTMLElement,
  ctx: RemoteMountContext,
): void | Promise<void> {
  return boot(el, ctx, 'embedded');
}

/** Used by standalone SessionGate after successful refresh / login (dual-mode). */
export function mountStandalone(
  el: HTMLElement,
  ctx: RemoteMountContext,
): void | Promise<void> {
  return boot(el, ctx, 'standalone');
}

export function unmount(): void {
  bootGen += 1;
  unbindLocation?.();
  unbindLocation = null;
  unbindTheme?.();
  unbindTheme = null;
  app?.unmount();
  app = null;
}
