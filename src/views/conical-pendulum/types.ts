export interface PendulumConfig {
  id: number;
  length: number;
  mass: number;
  color: string;
  label: string;
}

export interface SimulationState {
  // oxlint-disable-next-line id-length
  t: number;
}
