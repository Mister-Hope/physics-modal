<script setup lang="ts">
interface Props {
  title: string;
  gradient?: boolean;
  light?: boolean;
  showDarkToggle?: boolean;
  darkMode?: boolean;
}

const {
  gradient = false,
  light = false,
  showDarkToggle = false,
  darkMode = false,
} = defineProps<Props>();

const emit = defineEmits<{
  "update:darkMode": [value: boolean];
}>();
</script>

<template>
  <header
    :class="[
      'px-6 py-3 border-b flex items-center shrink-0 h-16 relative gap-3',
      light && !darkMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800',
    ]"
  >
    <router-link
      to="/"
      :class="[
        'text-sm transition-colors flex items-center gap-1 shrink-0',
        light && !darkMode
          ? 'text-slate-500 hover:text-slate-700'
          : 'text-slate-400 hover:text-slate-200',
      ]"
    >
      ← 返回首页
    </router-link>
    <h1
      v-if="gradient"
      class="absolute left-1/2 -translate-x-1/2 text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent whitespace-nowrap"
    >
      {{ title }}
    </h1>
    <h1
      v-else
      :class="[
        'absolute left-1/2 -translate-x-1/2 text-2xl font-bold whitespace-nowrap',
        light && !darkMode ? 'text-slate-800' : 'text-white',
      ]"
    >
      {{ title }}
    </h1>

    <button
      v-if="showDarkToggle"
      class="ml-auto shrink-0 p-1.5 rounded-md transition-colors cursor-pointer"
      :class="darkMode ? 'text-amber-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'"
      :title="darkMode ? '切换日间模式' : '切换夜间模式'"
      @click="emit('update:darkMode', !darkMode)"
    >
      <!-- Moon icon -->
      <svg
        v-if="!darkMode"
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <!-- Sun icon -->
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    </button>
  </header>
</template>
