export interface PendulumConfig {
  id: number;
  length: number; // in meters
  mass: number; // in kg
  color: string;
  label: string;
}

export interface SimulationState {
  // oxlint-disable-next-line id-length
  t: number; // accumulated time
}
