<script setup lang="ts">
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
