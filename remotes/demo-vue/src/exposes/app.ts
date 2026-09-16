import { createApp, type App } from 'vue';
import { createPinia } from 'pinia';
import type { RemoteMountContext } from '@mfe/sdk';
import { createAppRouter, type RouterMode } from '@/router';
import { bindThemeToEl } from '@/theme/mode';
import AppRoot from '@/App.vue';
import '@/style.css';

/** One module-level root per expose file. */
let app: App<Element> | null = null;
let unbindTheme: (() => void) | null = null;

function boot(el: HTMLElement, ctx: RemoteMountContext, routerMode: RouterMode): void {
  unmount();

  el.setAttribute('data-demo-vue', '');
  unbindTheme = bindThemeToEl(el);

  const pinia = createPinia();
  const router = createAppRouter(routerMode);

  app = createApp(AppRoot, {
    basePath: ctx.basePath,
    routeName: ctx.routeName,
    locale: ctx.locale,
  });
  app.use(pinia);
  app.use(router);
  app.mount(el);
}

export function mount(el: HTMLElement, ctx: RemoteMountContext): void {
  boot(el, ctx, 'embedded');
}

/** Used by standalone main.ts after successful refresh (rare without COOKIE_DOMAIN). */
export function mountStandalone(el: HTMLElement, ctx: RemoteMountContext): void {
  boot(el, ctx, 'standalone');
}

export function unmount(): void {
  unbindTheme?.();
  unbindTheme = null;
  app?.unmount();
  app = null;
}
