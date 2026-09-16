<script setup lang="ts">
import { computed } from 'vue';
import { useDashboardStore } from '@/stores/dashboard.store';

const store = useDashboardStore();
const max = computed(() =>
  Math.max(...store.analyticsBars.map((b) => b.value), 1),
);
</script>

<template>
  <div
    class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
  >
    <h2
      class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500"
    >
      Weekly traffic (mock)
    </h2>
    <div class="flex h-40 items-end gap-2">
      <div
        v-for="bar in store.analyticsBars"
        :key="bar.label"
        class="flex flex-1 flex-col items-center gap-1"
      >
        <div
          class="w-full rounded-t bg-sky-500/80 dark:bg-sky-400/70"
          :style="{ height: `${(bar.value / max) * 100}%` }"
        />
        <span class="text-xs text-slate-500">{{ bar.label }}</span>
      </div>
    </div>
  </div>
</template>
