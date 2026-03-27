import type { FC, ReactElement } from "react";
import { useRef, useEffect, useState } from "react";

import {
  GRAVITY,
  COLORS,
  PIXELS_PER_METER,
  SCALE_VELOCITY,
  SCALE_ACCEL,
  SCALE_FORCE,
} from "../constants";
import type { SimulationState, PhysicsParams, VectorConfig } from "../types";

// Helper to define markers dynamically
// refX="0" ensures the arrow attaches at its base
const MarkerDef = ({ color }: { color: string }): ReactElement => (
  <marker
    id={`arrowhead-${color.replace("#", "")}`}
    markerWidth="3.3"
    markerHeight="2.3"
    refX="0"
    refY="1.15"
    orient="auto"
  >
    <polygon points="0 0, 3.3 1.15, 0 2.3" fill={color} />
  </marker>
);

interface VisualizerProps {
  state: SimulationState;
  params: PhysicsParams;
  vectors: VectorConfig;
}

export const Visualizer: FC<VisualizerProps> = ({ state, params, vectors }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle Resize
  useEffect(() => {
    const handleResize = (): void => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return (): void => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Coordinate Calculation
  // Origin (Pivot) is at top center relative to viewing area
  const pivotX = dimensions.width / 2;
  const pivotY = 50; // Top margin reduced slightly

  const bobX = pivotX + Math.sin(state.theta) * params.length * PIXELS_PER_METER;
  const bobY = pivotY + Math.cos(state.theta) * params.length * PIXELS_PER_METER;

  // Physics Values for Vector Lengths
  const vMag = state.omega * params.length;
  // Tangential direction (perpendicular to string)
  const tanX = Math.cos(state.theta);
  const tanY = -Math.sin(state.theta);
  // Radial direction (from bob to pivot)
  const radX = -Math.sin(state.theta);
  const radY = -Math.cos(state.theta);

  // --- Kinematics Vectors ---

  // Velocity: purely tangential
  const vVecX = tanX * vMag * PIXELS_PER_METER * SCALE_VELOCITY;
  const vVecY = tanY * vMag * PIXELS_PER_METER * SCALE_VELOCITY;

  // Accelerations
  const atMag = -GRAVITY * Math.sin(state.theta);
  const anMag = params.length * state.omega * state.omega;

  // Tangential Acc vector
  const atVecX = (tanX * atMag * PIXELS_PER_METER * SCALE_ACCEL) / 9.8;
  const atVecY = (tanY * atMag * PIXELS_PER_METER * SCALE_ACCEL) / 9.8;

  // Radial Acc vector (points towards pivot)
  const anVecX = (radX * anMag * PIXELS_PER_METER * SCALE_ACCEL) / 9.8;
  const anVecY = (radY * anMag * PIXELS_PER_METER * SCALE_ACCEL) / 9.8;

  // Total Acc
  const aTotalX = atVecX + anVecX;
  const aTotalY = atVecY + anVecY;

  // --- Force Vectors ---
  // Force vectors should scale with Mass. We removed the division by mass.
  // Formula: Force * PIXELS_PER_METER * SCALE_FORCE

  const tensionMag = params.mass * (GRAVITY * Math.cos(state.theta) + anMag);
  const tensionX = radX * tensionMag * PIXELS_PER_METER * SCALE_FORCE;
  const tensionY = radY * tensionMag * PIXELS_PER_METER * SCALE_FORCE;

  // Gravity: Points straight down (0, 1)
  const gravityMag = params.mass * GRAVITY;
  const gravityX = 0;
  const gravityY = gravityMag * PIXELS_PER_METER * SCALE_FORCE;

  // Gravity Components
  const GnMag = gravityMag * Math.cos(state.theta);
  // Direction: (-radX, -radY)
  const GnVecX = -radX * GnMag * PIXELS_PER_METER * SCALE_FORCE;
  const GnVecY = -radY * GnMag * PIXELS_PER_METER * SCALE_FORCE;

  // G_t (Tangential) = G - G_n
  const GtVecX = gravityX - GnVecX;
  const GtVecY = gravityY - GnVecY;

  // SVG Arrow Helper
  const Arrow = ({
    dx,
    dy,
    color,
    label,
    showLabel = true,
    dashed = false,
  }: {
    dx: number;
    dy: number;
    color: string;
    label?: string;
    showLabel?: boolean;
    dashed?: boolean;
  }): ReactElement => {
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return null;
    const endX = bobX + dx;
    const endY = bobY + dy;

    return (
      <g>
        <line
          x1={bobX}
          y1={bobY}
          x2={endX}
          y2={endY}
          stroke={color}
          strokeWidth="4"
          strokeDasharray={dashed ? "5,5" : "none"}
          markerEnd={`url(#arrowhead-${color.replace("#", "")})`}
        />
        {showLabel && label && (
          <text
            x={endX + (dx > 0 ? 10 : -30)}
            y={endY + (dy > 0 ? 20 : -10)}
            fill={color}
            fontSize="30"
            fontWeight="bold"
            style={{ textShadow: "0px 0px 4px #000" }}
          >
            {label}
          </text>
        )}
      </g>
    );
  };

  // Helper to draw projection lines (Parallelogram rule)
  const ProjectionLine = ({
    startDx,
    startDy,
    endDx,
    endDy,
  }: {
    startDx: number;
    startDy: number;
    endDx: number;
    endDy: number;
  }): ReactElement => (
    <line
      x1={bobX + startDx}
      y1={bobY + startDy}
      x2={bobX + endDx}
      y2={bobY + endDy}
      stroke={COLORS.projectionLine}
      strokeWidth="2"
      strokeDasharray="4,4"
    />
  );

  return (
    <div ref={containerRef} className="flex-1 bg-slate-900 relative overflow-hidden select-none">
      <div className="absolute top-4 left-4 text-slate-500 text-sm pointer-events-none">
        Scale: {PIXELS_PER_METER}px/m
      </div>

      <svg width="100%" height="100%" className="absolute top-0 left-0">
        <defs>
          <MarkerDef color={COLORS.velocity} />
          <MarkerDef color={COLORS.accelTotal} />
          <MarkerDef color={COLORS.accelRadial} />
          <MarkerDef color={COLORS.accelTangential} />
          <MarkerDef color={COLORS.forceTension} />
          <MarkerDef color={COLORS.forceGravity} />
          <MarkerDef color={COLORS.forceGravityComponent} />
        </defs>

        {/* Pivot Point */}
        <circle cx={pivotX} cy={pivotY} r="6" fill="#94a3b8" />
        <rect x={pivotX - 50} y={pivotY - 4} width="100" height="4" fill="#64748b" rx="2" />

        {/* String */}
        <line x1={pivotX} y1={pivotY} x2={bobX} y2={bobY} stroke={COLORS.string} strokeWidth="3" />

        {/* Vertical Reference */}
        <line
          x1={pivotX}
          y1={pivotY}
          x2={pivotX}
          y2={pivotY + params.length * PIXELS_PER_METER + 50}
          stroke="#475569"
          strokeWidth="2"
          strokeDasharray="8,8"
        />

        {/* Bob */}
        <circle
          cx={bobX}
          cy={bobY}
          r={6 * params.mass ** (1 / 3)}
          fill={COLORS.bob}
          stroke="#0ea5e9"
          strokeWidth="2"
          className="shadow-lg z-10 relative"
        />

        {/* VECTORS */}
        {vectors.showAcceleration && (
          <>
            {/* Projection Lines for Acceleration */}
            <ProjectionLine startDx={anVecX} startDy={anVecY} endDx={aTotalX} endDy={aTotalY} />
            <ProjectionLine startDx={atVecX} startDy={atVecY} endDx={aTotalX} endDy={aTotalY} />

            {/* Radial Acc */}
            <Arrow dx={anVecX} dy={anVecY} color={COLORS.accelRadial} label="an" dashed />
            {/* Tangential Acc */}
            <Arrow dx={atVecX} dy={atVecY} color={COLORS.accelTangential} label="at" dashed />
            {/* Total Acc */}
            <Arrow dx={aTotalX} dy={aTotalY} color={COLORS.accelTotal} label="a" />
          </>
        )}

        {vectors.showVelocity && (
          <>
            {/* Velocity */}
            <Arrow dx={vVecX} dy={vVecY} color={COLORS.velocity} label="v" />
          </>
        )}

        {vectors.showForces && (
          <>
            {/* Gravity Components */}
            <ProjectionLine startDx={GnVecX} startDy={GnVecY} endDx={gravityX} endDy={gravityY} />
            <ProjectionLine startDx={GtVecX} startDy={GtVecY} endDx={gravityX} endDy={gravityY} />

            <Arrow dx={GnVecX} dy={GnVecY} color={COLORS.forceGravityComponent} label="Gn" dashed />
            <Arrow dx={GtVecX} dy={GtVecY} color={COLORS.forceGravityComponent} label="Gt" dashed />

            {/* Main Forces */}
            <Arrow dx={gravityX} dy={gravityY} color={COLORS.forceGravity} label="G" />
            <Arrow dx={tensionX} dy={tensionY} color={COLORS.forceTension} label="T" />
          </>
        )}
      </svg>
    </div>
  );
};
