<script setup lang="ts">
interface Props {
  /** Whether to use lighter text (for light-themed demos) */
  light?: boolean;
}

withDefaults(defineProps<Props>(), {
  light: false,
});
</script>

<template>
  <div
    :class="[
      'absolute bottom-3 right-4 text-xs pointer-events-none z-10 px-3 py-1.5 rounded-md',
      light
        ? 'text-slate-400 bg-white/80'
        : 'text-slate-500 bg-slate-900/60',
    ]"
  >
    © 版权所有 东北育才 张伯望
  </div>
</template>
