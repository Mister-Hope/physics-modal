<script setup lang="ts">
import { computed, ref } from "vue";

import Copyright from "@/components/Copyright.vue";
import NavBar from "@/components/NavBar.vue";

import ControlPanel from "./components/ControlPanel.vue";
import SimulationCanvas from "./components/SimulationCanvas.vue";
import StatusCard from "./components/StatusCard.vue";
import type { SimulationState } from "./types";
import { calculatePhysics } from "./utils/physics";

const darkMode = ref(false);

const state = ref<SimulationState>({
  velocity: 25,
  angle: 8,
  radius: 600,
  mass: 1000,
  forceMode: "none",
  showPlane: false,
});

const physics = computed(() =>
  calculatePhysics(state.value.velocity, state.value.angle, state.value.radius),
);

const handleStateChange = (newState: Partial<SimulationState>): void => {
  state.value = { ...state.value, ...newState };
};
</script>

<template>
  <div
    :class="[
      'h-screen flex flex-col font-sans text-base overflow-hidden',
      darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800',
    ]"
  >
    <NavBar
      title="火车转弯物理模型"
      :light="!darkMode"
      :show-dark-toggle="true"
      v-model:dark-mode="darkMode"
    />

    <main class="flex-1 p-4 md:p-6 overflow-hidden flex flex-col lg:flex-row gap-6 relative">
      <div class="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-4 h-full overflow-hidden">
        <div class="flex-shrink-0">
          <StatusCard :status="physics.status" />
        </div>
        <div class="flex-1 min-h-0">
          <ControlPanel :state="state" :physics="physics" @update:state="handleStateChange" />
        </div>
      </div>

      <div class="flex-1 h-full min-w-0 flex flex-col gap-2 relative">
        <SimulationCanvas :state="state" :physics="physics" :dark-mode="darkMode" />
        <div
          :class="[
            'absolute bottom-2 left-0 w-full text-center text-sm pointer-events-none',
            darkMode ? 'text-slate-500' : 'text-slate-400',
          ]"
        >
          视图：火车尾部横截面 | 红色圆点：重心
        </div>
        <Copyright :light="!darkMode" />
      </div>
    </main>
  </div>
</template>
