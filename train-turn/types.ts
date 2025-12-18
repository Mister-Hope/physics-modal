export type ForceMode = "none" | "real" | "concurrent";

export interface SimulationState {
  velocity: number; // m/s
  angle: number; // degrees
  radius: number; // m (fixed for simplicity in this demo)
  mass: number; // kg (arbitrary for visualization scaling)
  forceMode: ForceMode;
  showPlane: boolean;
}

export interface PhysicsResult {
  idealVelocity: number;
  netForce: number; // Centripetal force required
  normalForce: number; // Fn
  flangeForce: number; // F_flange (positive = inward/down-slope, negative = outward/up-slope)
  gravity: number;
  status: "perfect" | "fast" | "slow" | "stopped";
}
