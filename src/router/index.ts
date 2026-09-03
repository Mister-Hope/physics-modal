import { createRouter, createWebHistory } from "vue-router";

import HomeView from "@/views/Home.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/pendulum",
      name: "pendulum",
      component: () => import("@/views/pendulum/PendulumView.vue"),
    },
    {
      path: "/conical-pendulum",
      name: "conical-pendulum",
      component: () => import("@/views/conical-pendulum/ConicalPendulumView.vue"),
    },
    {
      path: "/train-turn",
      name: "train-turn",
      component: () => import("@/views/train-turn/TrainTurnView.vue"),
    },
    {
      path: "/oscilloscope",
      name: "oscilloscope",
      component: () => import("@/views/oscilloscope/OscilloscopeView.vue"),
    },
    {
      path: "/electric-field",
      name: "electric-field",
      component: () => import("@/views/electric-field/ElectricFieldView.vue"),
    },
    {
      path: "/micrometer",
      name: "micrometer",
      component: () => import("@/views/micrometer/MicrometerView.vue"),
    },
    {
      path: "/multimeter",
      name: "multimeter",
      component: () => import("@/views/multimeter/MultimeterView.vue"),
    },
  ],
});
