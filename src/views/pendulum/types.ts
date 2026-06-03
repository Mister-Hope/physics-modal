export interface SimulationState {
  theta: number; // Angle in radians (0 is vertical down)
  omega: number; // Angular velocity in rad/s
  alpha: number; // Angular acceleration in rad/s^2
  time: number; // Simulation time
}

export interface PhysicsParams {
  mass: number; // kg
  length: number; // meters
  gravity: number; // m/s^2
  initialAngle: number; // degrees
}

export interface VectorConfig {
  showForces: boolean;
  showVelocity: boolean;
  showAcceleration: boolean;
}

export enum SimulationMode {
  Running = "RUNNING",
  Paused = "PAUSED",
  PauseAtBottom = "PAUSE_AT_BOTTOM",
  PauseAtTop = "PAUSE_AT_TOP",
}

export interface Vector2D {
  x: number;
  y: number;
}
