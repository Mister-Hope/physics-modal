import { createRouter, createWebHashHistory } from "vue-router";

import HomeView from "@/views/Home.vue";

export const router = createRouter({
  history: createWebHashHistory(),
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
  ],
});
