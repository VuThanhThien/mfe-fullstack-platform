<script setup lang="ts">
import { useDashboardStore } from '@/stores/dashboard.store';

const store = useDashboardStore();

function publish() {
  store.addNotification(
    'Report generated',
    'A new summary report was generated from the Reports page.',
    'success',
  );
}
</script>

<template>
  <div
    class="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
  >
    <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Reports</h2>
    <p class="text-sm text-slate-600 dark:text-slate-300">
      Mock report actions share Pinia state with the Notifications tab.
    </p>
    <button
      type="button"
      class="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      @click="publish"
    >
      Generate summary report
    </button>
  </div>
</template>
