<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useDashboardStore, type DashboardTab } from '@/stores/dashboard.store';

const route = useRoute();
const store = useDashboardStore();

const activeTab = computed<DashboardTab>(() => {
  const tab = route.meta.tab;
  return typeof tab === 'string' ? (tab as DashboardTab) : 'overview';
});

watch(
  activeTab,
  (tab) => {
    store.recordVisit(tab);
  },
  { immediate: true },
);

const titles: Record<DashboardTab, string> = {
  overview: 'Overview',
  analytics: 'Analytics',
  reports: 'Reports',
  notifications: 'Notifications',
};
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <header class="space-y-1">
      <h1
        class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
      >
        Vue Dashboard · {{ titles[activeTab] }}
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        Shell nav ↔ URL sync · mock Pinia data · theme synced to shell
        <span class="opacity-60"
          >(visits: {{ store.tabVisits[activeTab] }})</span
        >
      </p>
    </header>

    <section class="min-h-[280px]">
      <RouterView />
    </section>
  </div>
</template>
