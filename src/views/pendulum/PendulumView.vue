<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

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
const stateRef = reactive<SimulationState>({ ...INITIAL_STATE });

const initializeState = (): void => {
  const startState: SimulationState = {
    theta: params.value.initialAngle * (Math.PI / 180),
    omega: 0,
    alpha: 0,
    time: 0,
  };
  state.value = { ...startState };
  accumulatorRef = 0;
  lastTimeRef = null;
};

// Re-initialize when initial angle changes
const updateParams = (newParams: PhysicsParams): void => {
  params.value = newParams;
  initializeState();
};

// RK4 Integration
const updatePhysics = (
  currentState: SimulationState,
  currentParams: PhysicsParams,
  timeStep: number,
): SimulationState => {
  const { theta, omega } = currentState;
  const { gravity, length } = currentParams;

  const evaluateDerivatives = (
    thetaArg: number,
    omegaArg: number,
  ): { dTheta: number; dOmega: number } => ({
    dTheta: omegaArg,
    dOmega: -(gravity / length) * Math.sin(thetaArg),
  });

  const k1 = evaluateDerivatives(theta, omega);
  const k2 = evaluateDerivatives(
    theta + k1.dTheta * timeStep * 0.5,
    omega + k1.dOmega * timeStep * 0.5,
  );
  const k3 = evaluateDerivatives(
    theta + k2.dTheta * timeStep * 0.5,
    omega + k2.dOmega * timeStep * 0.5,
  );
  const k4 = evaluateDerivatives(theta + k3.dTheta * timeStep, omega + k3.dOmega * timeStep);

  const newTheta = theta + (timeStep / 6) * (k1.dTheta + 2 * k2.dTheta + 2 * k3.dTheta + k4.dTheta);
  const newOmega = omega + (timeStep / 6) * (k1.dOmega + 2 * k2.dOmega + 2 * k3.dOmega + k4.dOmega);
  const newAlpha = -(gravity / length) * Math.sin(newTheta);

  return {
    theta: newTheta,
    omega: newOmega,
    alpha: newAlpha,
    time: currentState.time + dt,
  };
};

const animate = (time: number): void => {
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
};

const handleReset = (): void => {
  initializeState();
  mode.value = SimulationMode.Paused;
};

// Keep stateRef in sync with state (used for external resets)
watch(state, (newState) => {
  stateRef.theta = newState.theta;
  stateRef.omega = newState.omega;
  stateRef.alpha = newState.alpha;
  stateRef.time = newState.time;
});

onMounted(() => {
  requestRef = requestAnimationFrame(animate);
});

onBeforeUnmount(() => {
  if (requestRef != null) cancelAnimationFrame(requestRef);
});
</script>

<template>
  <div
    class="flex flex-col h-screen w-screen overflow-hidden text-slate-100 font-sans bg-slate-900"
  >
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

      <Visualizer :state="stateRef" :params="params" :vectors="vectors" />

      <DataDisplay :state="stateRef" :params="params" />

      <Copyright />
    </div>
  </div>
</template>
