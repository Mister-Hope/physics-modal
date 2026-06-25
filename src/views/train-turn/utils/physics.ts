import type { PhysicsResult } from "../types";

// oxlint-disable-next-line id-length
export const G = 9.8;
export const TRAIN_MASS = 1000;

export const calculatePhysics = (
  velocity: number,
  angleDeg: number,
  radius: number,
): PhysicsResult => {
  const angleRad = (angleDeg * Math.PI) / 180;
  const idealVelocity = Math.sqrt(G * radius * Math.tan(angleRad));
  const centripetalAccel = (velocity * velocity) / radius;

  const normalForce = TRAIN_MASS * (G * Math.cos(angleRad) + centripetalAccel * Math.sin(angleRad));

  const flangeForce = TRAIN_MASS * (centripetalAccel * Math.cos(angleRad) - G * Math.sin(angleRad));

  const gravity = TRAIN_MASS * G;
  const netForce = TRAIN_MASS * centripetalAccel;

  let status: PhysicsResult["status"] = "perfect";
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
