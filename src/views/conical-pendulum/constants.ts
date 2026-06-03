import type { PendulumConfig } from "./types";

export const GRAVITY = 9.81; // m/s^2

export const PENDULUM_PRESETS: PendulumConfig[] = [
  { id: 1, length: 2, mass: 1, color: "#3b82f6", label: "蓝球" },
  { id: 2, length: 1.5, mass: 2, color: "#ef4444", label: "红球" },
  { id: 3, length: 1.8, mass: 0.5, color: "#22c55e", label: "绿球" },
];
