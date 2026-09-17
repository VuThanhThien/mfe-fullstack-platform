<script setup lang="ts">
import 'vue3-toastify/dist/index.css';
defineProps<{
  basePath: string;
  routeName: string;
  locale?: string;
}>();
</script>

<template>
  <div class="demo-vue-root min-h-full">
    <RouterView />
  </div>
</template>
