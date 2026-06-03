export type ForceMode = "none" | "real" | "concurrent";

export interface SimulationState {
  velocity: number; // m/s
  angle: number; // degrees
  radius: number; // m
  mass: number; // kg
  forceMode: ForceMode;
  showPlane: boolean;
}

export interface PhysicsResult {
  idealVelocity: number;
  netForce: number;
  normalForce: number;
  flangeForce: number;
  gravity: number;
  status: "perfect" | "fast" | "slow" | "stopped";
}
