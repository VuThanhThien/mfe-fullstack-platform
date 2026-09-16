# Researcher 02 — Reference `remote-vue` port subset

**Source:** `/Users/vuthanhthien/Documents/Coding/personal/vite-micro-frontends/remote-vue`  
**Date:** 2026-09-15

## Must-port (core dashboard)

| Area | Paths |
|------|-------|
| Tabs shell | `src/components/Dashboard.vue` |
| Tab views | `src/views/dashboard/{Overview,Analytics,Reports,Notifications}View.vue` |
| Cards / overview | `src/components/Dashboard/Cards/*`, `Overview.vue`, `DateRangePicker.vue` (if used) |
| Store | `src/stores/dashboard.store.ts` (mock) |
| Router | `src/router/{index,routes,routeMap}.ts` — keep **embedded memory** + routes for 4 tabs only; drop auth/settings from routeMap usage |
| UI primitives used | `components/ui/{button,card,tabs,chart-bar,…}` — chase imports from the files above |
| Styles | `style.css` + Tailwind v4 config / `@tailwindcss/vite` |

## Drop / replace

| Item | Action |
|------|--------|
| `HomeView` → `AuthenticatedLayout` | **Drop layout**; root = `Dashboard` only (shell owns chrome) |
| `layouts/**`, LayoutConfigurator, sidebar chrome | Drop |
| Auth / settings routeMap entries | Drop (not in `routes.ts` anyway) |
| `theme.store` `useDark` / `boilerplate:theme-color` | **Replace** with bridge to `mfe-ui-mode` + `mfe-ui:mode` (see plan) |
| `DarkModeButton` | Drop when hosted |
| originjs federation / `exposes/pages` host `mode` key | Do not copy; rebuild expose as `{mount,unmount}` for platform |
| Reference localStorage key `mode` | Wrong key — platform uses `mfe-ui-mode` |

## Theme bridge (locked)

Do **not** add `@mfe/ui` as Vue dep (pulls React/MUI Docker peers).  
Mirror constants from `packages/mfe-ui/src/mode.ts`:

- `MODE_KEY = 'mfe-ui-mode'`
- `MODE_EVENT = 'mfe-ui:mode'`
- `getMode` / `subscribeMode` equivalent → toggle `dark` class on **mount element** (prefer) or remote root

Document lockstep with `@mfe/ui` mode.ts in remote README.

## Deps likely required

`vue`, `vue-router`, `pinia`, `@vueuse/core`, `tailwindcss` + `@tailwindcss/vite`, `radix-vue`, `class-variance-authority` / `clsx` / `tailwind-merge` (as reference), `@unovis/vue` (analytics chart), `lucide-vue-next` / `@iconify/vue` if cards use icons, `@mfe/sdk` file:.

## SDK proof

Add on Overview: `api.get('/api/v1/users/me')` — not in reference; new code.

## Effort note

UI port dominates (~8–11h). Stub MF first validates wiring before chasing UI import graph.
