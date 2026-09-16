<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  useDashboardStore,
  type DashboardTab,
} from '@/stores/dashboard.store';
import OverviewPanel from '@/views/panels/OverviewPanel.vue';
import AnalyticsPanel from '@/views/panels/AnalyticsPanel.vue';
import ReportsPanel from '@/views/panels/ReportsPanel.vue';
import NotificationsPanel from '@/views/panels/NotificationsPanel.vue';

const TABS: { value: DashboardTab; label: string; path: string }[] = [
  { value: 'overview', label: 'Overview', path: '/' },
  { value: 'analytics', label: 'Analytics', path: '/analytics' },
  { value: 'reports', label: 'Reports', path: '/reports' },
  { value: 'notifications', label: 'Notifications', path: '/notifications' },
];

const route = useRoute();
const router = useRouter();
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

function go(path: string) {
  void router.push(path);
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Vue Dashboard
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        Memory-router tabs · mock Pinia data · theme synced to shell
      </p>
    </header>

    <div
      class="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/60"
      role="tablist"
    >
      <button
        v-for="tab in TABS"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.value"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition"
        :class="
          activeTab === tab.value
            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-50'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
        "
        @click="go(tab.path)"
      >
        {{ tab.label }}
        <span class="ml-1 text-xs opacity-60">({{ store.tabVisits[tab.value] }})</span>
      </button>
    </div>

    <section class="min-h-[280px]">
      <OverviewPanel v-if="activeTab === 'overview'" />
      <AnalyticsPanel v-else-if="activeTab === 'analytics'" />
      <ReportsPanel v-else-if="activeTab === 'reports'" />
      <NotificationsPanel v-else />
    </section>
  </div>
</template>
