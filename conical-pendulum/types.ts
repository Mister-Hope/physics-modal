export interface PendulumConfig {
  id: number;
  length: number; // in meters
  mass: number; // in kg
  color: string;
  label: string;
}

export interface SimulationState {
  time: number; // accumulated time
}
