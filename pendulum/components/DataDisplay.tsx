import type { FC, ReactElement } from "react";

import { GRAVITY, COLORS } from "../constants";
import type { SimulationState, PhysicsParams } from "../types";
import { Latex } from "./Latex";

interface DataDisplayProps {
  state: SimulationState;
  params: PhysicsParams;
}

// Extract Row component outside to prevent re-creation on every render (fixes flickering)
const Row = ({
  label,
  symbol,
  value,
  unit,
  colorClass,
  hexColor,
  digits = 2,
}: {
  label: string;
  symbol: string;
  value: number;
  unit: string;
  colorClass?: string;
  hexColor?: string;
  digits?: number;
}): ReactElement => (
  <div className="flex items-center justify-between border-b border-slate-700 py-4 last:border-0">
    <div className="flex items-center gap-3">
      {/* Symbol with MathJax */}
      <div className="w-8 flex justify-center">
        <Latex latex={symbol} className="text-xl" color={hexColor} />
      </div>
      <span className="text-slate-300 text-lg">{label}</span>
    </div>
    <div className="text-right">
      <span className={`text-2xl font-mono font-bold ${colorClass ?? "text-slate-100"}`}>
        {value.toFixed(digits)}
      </span>
      <span className="text-slate-500 ml-2 text-lg">{unit}</span>
    </div>
  </div>
);

// Helper: Calculate Exact Period using Arithmetic-Geometric Mean (AGM)
// This solves the Complete Elliptic Integral of the First Kind K(k)
const calculateExactPeriod = (length: number, gravity: number, maxAngleDeg: number): number => {
  // If angle is 0, return small angle approximation limit
  if (maxAngleDeg === 0) return 2 * Math.PI * Math.sqrt(length / gravity);

  const theta0 = maxAngleDeg * (Math.PI / 180);

  // k = sin(theta0 / 2)
  // We actually need AGM(1, cos(theta0/2))
  let a = 1;
  let b = Math.cos(theta0 / 2);

  // 5-6 iterations are usually enough for double precision
  for (let i = 0; i < 10; i++) {
    const nextA = 0.5 * (a + b);
    const nextB = Math.sqrt(a * b);

    // Check convergence
    if (Math.abs(a - b) < 1e-9) break;

    a = nextA;
    b = nextB;
  }

  // T = 2 * PI * sqrt(L/g) / AGM
  return (2 * Math.PI * Math.sqrt(length / gravity)) / a;
};

export const DataDisplay: FC<DataDisplayProps> = ({ state, params }) => {
  // Calculations

  // Use Exact Period formula instead of Small Angle Approximation
  const period = calculateExactPeriod(params.length, GRAVITY, params.initialAngle);

  // Tangential Acceleration: a_t = g * sin(theta)
  const aT = Math.abs(GRAVITY * Math.sin(state.theta));

  // Radial (Centripetal) Acceleration: a_n = L * omega^2
  const aN = params.length * (state.omega * state.omega);

  // Total Acceleration
  const a = Math.sqrt(aT * aT + aN * aN);

  // Velocity: v = L * omega
  const v = Math.abs(state.omega * params.length);

  // Tension: T = m(g*cos(theta) + a_n)
  const tension = params.mass * (GRAVITY * Math.cos(state.theta) + aN);

  // Gravity: G = mg
  const gravityForce = params.mass * GRAVITY;

  // Angle in degrees
  const angleDeg = (state.theta * 180) / Math.PI;

  return (
    <div className="h-full flex flex-col p-6 bg-slate-800 border-l border-slate-700 shadow-xl w-[420px] overflow-y-auto">
      <div className="pb-2 mb-2">
        <h2 className="text-2xl font-bold text-white">实时数据</h2>
      </div>

      <div className="flex-1">
        <Row
          label="摆角"
          symbol="\theta"
          value={Math.abs(angleDeg)}
          unit="°"
          colorClass="text-slate-200"
          digits={1}
        />
        <Row
          label="理论周期"
          symbol="T"
          value={period}
          unit="s"
          colorClass="text-white"
          hexColor="#ffffff"
        />
        <div className="h-8"></div> {/* Spacer */}
        <h3 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-2">
          动力学
        </h3>
        <Row
          label="重力"
          symbol="G"
          value={gravityForce}
          unit="N"
          colorClass="text-blue-400"
          hexColor={COLORS.forceGravity}
        />
        <Row
          label="绳拉力"
          symbol="F_{\text{T}}"
          value={tension}
          unit="N"
          colorClass="text-pink-400"
          hexColor={COLORS.forceTension}
        />
        <div className="h-8"></div> {/* Spacer */}
        <h3 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-2">
          运动学
        </h3>
        <Row
          label="线速度"
          symbol="v"
          value={v}
          unit="m/s"
          colorClass="text-green-400"
          hexColor={COLORS.velocity}
        />
        <Row
          label="合加速度"
          symbol="a"
          value={a}
          unit="m/s²"
          colorClass="text-amber-400"
          hexColor={COLORS.accelTotal}
        />
        <Row
          label="切向加速度"
          symbol="a_t"
          value={aT}
          unit="m/s²"
          colorClass="text-purple-400"
          hexColor={COLORS.accelTangential}
        />
        <Row
          label="径向加速度"
          symbol="a_n"
          value={aN}
          unit="m/s²"
          colorClass="text-red-400"
          hexColor={COLORS.accelRadial}
        />
      </div>

      <div className="mt-8 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <h4 className="text-slate-400 text mb-2 font-semibold">图例说明</h4>
        <div className="grid grid-cols-2 gap-y-3 gap-x-2">
          <div className="flex items-center gap-2 text-green-400">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>
              <Latex latex="v" /> 速度
            </span>
          </div>
          <div className="flex items-center gap-2 text-amber-400">
            <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
            <span>
              <Latex latex="a" /> 合加速度
            </span>
          </div>
          <div className="flex items-center gap-2 text-purple-400">
            <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
            <span>
              <Latex latex="a_t" /> 切向
            </span>
          </div>
          <div className="flex items-center gap-2 text-red-400">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span>
              <Latex latex="a_n" /> 径向
            </span>
          </div>
          <div className="flex items-center gap-2 text-pink-400">
            <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
            <span>
              <Latex latex="F_T" /> 拉力
            </span>
          </div>
          <div className="flex items-center gap-2 text-blue-400">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span>
              <Latex latex="G" /> 重力
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
