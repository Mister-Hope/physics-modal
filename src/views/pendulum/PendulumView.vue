<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import Copyright from "@/components/Copyright.vue";
import NavBar from "@/components/NavBar.vue";
import ControlPanel from "./components/ControlPanel.vue";
import DataDisplay from "./components/DataDisplay.vue";
import Visualizer from "./components/Visualizer.vue";
import { DT, GRAVITY } from "./constants";
import type { PhysicsParams, SimulationState, VectorConfig } from "./types";
import { SimulationMode } from "./types";

const INITIAL_PARAMS: PhysicsParams = {
  mass: 2,
  length: 2,
  gravity: GRAVITY,
  initialAngle: 30,
};

const INITIAL_STATE: SimulationState = {
  theta: INITIAL_PARAMS.initialAngle * (Math.PI / 180),
  omega: 0,
  alpha: 0,
  time: 0,
};

const INITIAL_VECTORS: VectorConfig = {
  showForces: false,
  showVelocity: false,
  showAcceleration: false,
};

const params = ref<PhysicsParams>({ ...INITIAL_PARAMS });
const state = ref<SimulationState>({ ...INITIAL_STATE });
const mode = ref<SimulationMode>(SimulationMode.Paused);
const vectors = ref<VectorConfig>({ ...INITIAL_VECTORS });

let requestRef: number | null = null;
let lastTimeRef: number | null = null;
let accumulatorRef = 0;
const stateRef = ref<SimulationState>({ ...INITIAL_STATE }).value;

// Keep stateRef in sync
const syncStateRef = computed(() => {
  stateRef.theta = state.value.theta;
  stateRef.omega = state.value.omega;
  stateRef.alpha = state.value.alpha;
  stateRef.time = state.value.time;
  return stateRef;
});

function initializeState(): void {
  const startState: SimulationState = {
    theta: params.value.initialAngle * (Math.PI / 180),
    omega: 0,
    alpha: 0,
    time: 0,
  };
  state.value = { ...startState };
  stateRef.theta = startState.theta;
  stateRef.omega = startState.omega;
  stateRef.alpha = startState.alpha;
  stateRef.time = startState.time;
  accumulatorRef = 0;
  lastTimeRef = null;
}

// Re-initialize when initial angle changes
const updateParams = (newParams: PhysicsParams): void => {
  params.value = newParams;
  initializeState();
};

// RK4 Integration
function updatePhysics(
  currentState: SimulationState,
  currentParams: PhysicsParams,
  dt: number,
): SimulationState {
  const { theta, omega } = currentState;
  const { gravity, length } = currentParams;

  const evaluateDerivatives = (
    th: number,
    om: number,
  ): { dTheta: number; dOmega: number } => ({
    dTheta: om,
    dOmega: -(gravity / length) * Math.sin(th),
  });

  const k1 = evaluateDerivatives(theta, omega);
  const k2 = evaluateDerivatives(theta + k1.dTheta * dt * 0.5, omega + k1.dOmega * dt * 0.5);
  const k3 = evaluateDerivatives(theta + k2.dTheta * dt * 0.5, omega + k2.dOmega * dt * 0.5);
  const k4 = evaluateDerivatives(theta + k3.dTheta * dt, omega + k3.dOmega * dt);

  const newTheta = theta + (dt / 6) * (k1.dTheta + 2 * k2.dTheta + 2 * k3.dTheta + k4.dTheta);
  const newOmega = omega + (dt / 6) * (k1.dOmega + 2 * k2.dOmega + 2 * k3.dOmega + k4.dOmega);
  const newAlpha = -(gravity / length) * Math.sin(newTheta);

  return {
    theta: newTheta,
    omega: newOmega,
    alpha: newAlpha,
    time: currentState.time + dt,
  };
}

function animate(time: number): void {
  if (lastTimeRef != null) {
    const frameTime = Math.min((time - lastTimeRef) / 1000, 0.1);
    accumulatorRef += frameTime;

    if (mode.value === SimulationMode.Paused) {
      accumulatorRef = 0;
    } else {
      let active = true;
      let nextState = { ...stateRef };

      while (accumulatorRef >= DT && active) {
        const prevState = nextState;
        nextState = updatePhysics(nextState, params.value, DT);
        accumulatorRef -= DT;

        if (
          mode.value === SimulationMode.PauseAtBottom &&
          ((prevState.theta > 0 && nextState.theta <= 0) ||
            (prevState.theta < 0 && nextState.theta >= 0))
        ) {
          mode.value = SimulationMode.Paused;
          nextState.theta = 0;
          active = false;
        }

        if (
          mode.value === SimulationMode.PauseAtTop &&
          prevState.theta > 0.1 &&
          ((prevState.omega > 0 && nextState.omega <= 0) ||
            (prevState.omega < 0 && nextState.omega >= 0))
        ) {
          mode.value = SimulationMode.Paused;
          nextState.omega = 0;
          active = false;
        }
      }

      stateRef.theta = nextState.theta;
      stateRef.omega = nextState.omega;
      stateRef.alpha = nextState.alpha;
      stateRef.time = nextState.time;
      state.value = { ...nextState };
    }
  }

  lastTimeRef = time;
  requestRef = requestAnimationFrame(animate);
}

function handleReset(): void {
  initializeState();
  mode.value = SimulationMode.Paused;
}

onMounted(() => {
  requestRef = requestAnimationFrame(animate);
});

onBeforeUnmount(() => {
  if (requestRef != null) cancelAnimationFrame(requestRef);
});
</script>

<template>
  <div class="flex flex-col h-screen w-screen overflow-hidden text-slate-100 font-sans bg-slate-900">
    <NavBar title="单摆演示教学系统" :gradient="true" />

    <div class="flex-1 flex overflow-hidden relative">
      <ControlPanel
        :params="params"
        :mode="mode"
        :vectors="vectors"
        @update:params="updateParams"
        @update:mode="(m) => (mode = m)"
        @update:vectors="(v) => (vectors = v)"
        @reset="handleReset"
      />

      <Visualizer :state="syncStateRef" :params="params" :vectors="vectors" />

      <DataDisplay :state="syncStateRef" :params="params" />

      <Copyright />
    </div>
  </div>
</template>
