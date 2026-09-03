<script setup lang="ts">
import { computed, ref } from "vue";

import Copyright from "@/components/Copyright.vue";
import NavBar from "@/components/NavBar.vue";

import GearSelector from "./components/GearSelector.vue";
import MultimeterDial from "./components/MultimeterDial.vue";
import NeedleSlider from "./components/NeedleSlider.vue";
import ReadingDisplay from "./components/ReadingDisplay.vue";
import type { Gear } from "./types";
import { calculateReading, GEARS } from "./utils/multimeter";

// Initial needle deflection: strictly starts at the far-left zero position (u = 0)
const deflection = ref(0);

// Default to DC 50V (standard high-school demonstration range)
const selectedGear = ref<Gear>(GEARS.find((g) => g.id === "dcv_50") ?? GEARS[3]);

// Toggle to show or hide the reading display
const showReading = ref(false);
const zoom = ref(1);

// Calculated reading
const reading = computed(() => calculateReading(selectedGear.value, deflection.value));

// Fullscreen toggle helper for projector presentations
const toggleFullscreen = (): void => {
  if (!document.fullscreenElement) {
    void document.documentElement.requestFullscreen().catch(() => {
      // Fullscreen may be unavailable or rejected by browser permissions.
    });
    return;
  }
  void document.exitFullscreen().catch(() => {
    // Ignore fullscreen exit errors because the document may already be restored.
  });
};

const changeZoom = (delta: number): void => {
  const adjustedZoom = Number((zoom.value + delta).toFixed(1));
  zoom.value = Math.max(1, Math.min(1.8, adjustedZoom));
};
</script>

<template>
  <div
    class="relative flex h-screen w-screen select-none flex-col overflow-hidden bg-stone-200/80 text-stone-900"
  >
    <NavBar title="多用电表仿真" light />

    <!-- Main Workspace (2-Column Horizontal Layout for Classroom Projectors) -->
    <main
      class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-2 sm:gap-6 sm:p-4 lg:flex-row"
    >
      <!-- LEFT COLUMN: The Multimeter Body (Dominates Left Area, Scaled to Fit Display Exactly) -->
      <section
        class="relative flex h-full min-h-0 w-full flex-col items-center justify-start overflow-auto pt-2 lg:w-[58%] xl:w-[60%]"
      >
        <div
          class="absolute left-2 top-2 z-20 flex overflow-hidden rounded-lg border border-stone-300 bg-white/95 shadow-sm"
        >
          <button
            type="button"
            class="px-3 py-1.5 text-lg leading-none text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="放大表盘"
            :disabled="zoom >= 1.8"
            @click="changeZoom(0.1)"
          >
            +
          </button>
          <button
            type="button"
            class="border-l border-stone-200 px-3 py-1.5 text-lg leading-none text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="缩小表盘"
            :disabled="zoom <= 1"
            @click="changeZoom(-0.1)"
          >
            −
          </button>
        </div>
        <!-- Integrated Multimeter Housing (Dial + Rotary Switch) -->
        <!-- Sized proportionally with aspect-ratio: 700 / 845 so the dial is NEVER compressed or clipped -->
        <div
          class="flex flex-col rounded-2xl border-4 border-stone-900 shadow-2xl bg-[#eae5d5] ring-1 ring-stone-900/10 overflow-hidden w-full max-w-[580px] lg:w-auto lg:h-full lg:max-h-full lg:aspect-[700/845] lg:max-w-[620px] shrink-0"
          :style="{ transform: `scale(${zoom})`, transformOrigin: '50% 0' }"
        >
          <!-- Top Half: Dial with Needle (Aspect ratio: 700 / 450) -->
          <MultimeterDial :deflection="deflection" :gear="selectedGear" class="w-full shrink-0" />
          <!-- Bottom Half: Circular Rotary Switch with 18 Radial Positions (Aspect ratio: 700 / 395) -->
          <GearSelector v-model="selectedGear" class="w-full shrink-0" />
        </div>
      </section>

      <!-- RIGHT COLUMN: Operation & Display Console -->
      <section
        class="flex min-h-0 w-full flex-col justify-start gap-4 overflow-y-auto pr-1 lg:w-[42%] xl:w-[40%]"
      >
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded border border-stone-300 bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-200"
            @click="deflection = 0"
          >
            指针归零
          </button>
          <button
            type="button"
            class="rounded border border-stone-300 bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-200"
            @click="showReading = !showReading"
          >
            {{ showReading ? "隐藏示数" : "显示示数" }}
          </button>
          <button
            type="button"
            class="rounded border border-stone-300 bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-200"
            @click="toggleFullscreen"
          >
            全屏
          </button>
        </div>
        <!-- 1. Needle Deflection Slider (Strictly without numerical output) -->
        <NeedleSlider v-model="deflection" />

        <!-- 2. Reading Display & Formula Breakdown (Toggled via button) -->
        <ReadingDisplay :reading="reading" v-model:show-reading="showReading" />
      </section>
    </main>
    <Copyright light />
  </div>
</template>
