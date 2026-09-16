<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { mountStandalone, unmount } from '@/exposes/app';

/**
 * Hosts the federated dashboard root for standalone dual-mode.
 * Teardown calls expose `unmount` when SessionGate leaves ready.
 */
const hostEl = ref<HTMLElement | null>(null);

onMounted(() => {
  if (!hostEl.value) return;
  mountStandalone(hostEl.value, {
    basePath: '/',
    routeName: 'vue',
  });
});

onBeforeUnmount(() => {
  unmount();
});
</script>

<template>
  <div ref="hostEl" class="min-h-screen" />
</template>
