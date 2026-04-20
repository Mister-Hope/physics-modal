import type { PhysicsResult } from "../types";

// oxlint-disable-next-line id-length
export const G = 9.8; // m/s^2
export const TRAIN_MASS = 1000; // Arbitrary mass for vector scaling

export const calculatePhysics = (
  velocity: number,
  angleDeg: number,
  radius: number,
): PhysicsResult => {
  const angleRad = (angleDeg * Math.PI) / 180;

  // Ideal velocity: v = sqrt(g * r * tan(theta))
  const idealVelocity = Math.sqrt(G * radius * Math.tan(angleRad));

  // Forces calculation
  // We use a coordinate system aligned with the banked slope for easier force component calculation:
  // X-axis: Parallel to slope (Positive = Downwards/Inwards)
  // Y-axis: Perpendicular to slope (Positive = Upwards/Normal)

  // Acceleration components required for circular motion:
  // a_horizontal = v^2 / r
  // Decomposed to slope coordinates:
  // a_parallel = (v^2 / r) * cos(theta)
  // a_perpendicular = (v^2 / r) * sin(theta)

  // Newton's 2nd Law equations:
  // Perpendicular: Fn - G_perp = m * a_perpendicular
  // Fn - mg*cos(theta) = m * (v^2 / r) * sin(theta)
  // => Fn = m * (g*cos(theta) + (v^2 / r) * sin(theta))

  const centripetalAccel = (velocity * velocity) / radius;

  const normalForce = TRAIN_MASS * (G * Math.cos(angleRad) + centripetalAccel * Math.sin(angleRad));

  // Parallel: G_parallel + F_flange = m * a_parallel
  // mg*sin(theta) + F_flange = m * (v^2 / r) * cos(theta)
  // => F_flange = m * ((v^2 / r) * cos(theta) - g*sin(theta))
  // NOTE: If F_flange > 0, it points DOWN the slope (Inner rail pulling or Outer rail pushing inward).
  // In the context of "Rail Pressure":
  // Positive F_flange => Force points INWARD (down slope) => Outer rail pushes IN => Squeezing Outer Rail.
  // Negative F_flange => Force points OUTWARD (up slope) => Inner rail pushes OUT => Squeezing Inner Rail.

  const flangeForce = TRAIN_MASS * (centripetalAccel * Math.cos(angleRad) - G * Math.sin(angleRad));

  const gravity = TRAIN_MASS * G;
  const netForce = TRAIN_MASS * centripetalAccel;

  // Determine Status
  let status: PhysicsResult["status"] = "perfect";

  // Use a small epsilon for "perfect" floating point comparison
  const epsilon = 0.5;

  if (velocity === 0) status = "stopped";
  else if (Math.abs(velocity - idealVelocity) < epsilon) status = "perfect";
  else if (velocity > idealVelocity) status = "fast";
  else status = "slow";

  return {
    idealVelocity,
    netForce,
    normalForce,
    flangeForce,
    gravity,
    status,
  };
};
