export const GRAVITY = 9.8; // m/s^2
export const DT = 0.016; // Time step (approx 60fps)
export const MAX_ANGLE_DEG = 30; // Max initial amplitude for the demo
export const PIXELS_PER_METER = 125; // Scaling factor adjusted for 4m length (approx 0.85x of 150)

// Vector Scaling factors
export const SCALE_VELOCITY = 0.2; // Reduced to 1/4 of previous 0.8
export const SCALE_ACCEL = 1.5;
// Significantly reduced because we no longer divide by mass/g.
// Now it is roughly Pixels per Newton-Meter-Scaled unit.
// Target: m=2.5kg -> G=24.5N -> ~100px.
// Formula: Force * PPM * Scale. 24.5 * 125 * 0.035 = 107px.
export const SCALE_FORCE = 0.035;

// Colors
export const COLORS = {
  bob: "#38bdf8", // sky-400
  string: "#94a3b8", // slate-400
  velocity: "#4ade80", // green-400
  accelTotal: "#fbbf24", // amber-400
  accelRadial: "#f87171", // red-400
  accelTangential: "#c084fc", // purple-400
  forceTension: "#f472b6", // pink-400
  forceGravity: "#60a5fa", // blue-400
  forceGravityComponent: "#94a3b8", // slate-400 for components
  projectionLine: "#cbd5e1", // slate-300
  text: "#e2e8f0", // slate-200
  panelBg: "#1e293b", // slate-800
};
