import { Settings } from "lucide-react";
import type { FC } from "react";

import { Latex } from "../../components/Latex";
import type { SimulationState, PhysicsResult, ForceMode } from "../types";

interface ControlPanelProps {
  state: SimulationState;
  physics: PhysicsResult;
  onChange: (newState: Partial<SimulationState>) => void;
}

const ControlPanel: FC<ControlPanelProps> = ({ state, physics, onChange }) => {
  // Conversion constants
  const MS_TO_KMH = 3.6;
  const MAX_KMH = 300;

  const velocityKmh = Math.round(state.velocity * MS_TO_KMH);
  const idealKmh = physics.idealVelocity * MS_TO_KMH;
  const idealMarkerPercent = Math.min((idealKmh / MAX_KMH) * 100, 100);

  const handleVelocityChange = (valKmh: number): void => {
    onChange({ velocity: valKmh / MS_TO_KMH });
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 h-full flex flex-col gap-5 overflow-y-auto">
      <div className="flex items-center gap-2 border-b pb-3 mb-1">
        <Settings className="w-6 h-6 text-slate-700" />
        <h2 className="text-xl font-bold text-slate-800">控制面板</h2>
      </div>

      {/* Angle Control */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-base font-semibold text-slate-600 flex items-center gap-2">
            轨道倾角 <Latex>{String.raw`$\theta$`}</Latex>
          </label>
          <span className="text-blue-600 font-mono font-bold text-lg">{state.angle}°</span>
        </div>
        <input
          type="range"
          min="0"
          max="30"
          step="1"
          value={state.angle}
          onChange={(e) => {
            onChange({ angle: Number(e.target.value) });
          }}
          className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-sm text-slate-500 px-1">
          <span>0°</span>
          <span>30°</span>
        </div>
      </div>

      {/* Radius Control */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-base font-semibold text-slate-600 flex items-center gap-2">
            转弯半径 <Latex>{"$r$"}</Latex>
          </label>
          <span className="text-blue-600 font-mono font-bold text-lg">{state.radius} m</span>
        </div>
        <input
          type="range"
          min="100"
          max="4000"
          step="50"
          value={state.radius}
          onChange={(e) => {
            onChange({ radius: Number(e.target.value) });
          }}
          className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-sm text-slate-500 px-1">
          <span>100 m</span>
          <span>4000 m</span>
        </div>
      </div>

      {/* Velocity Control */}
      <div className="space-y-3 pt-1">
        {/* Label Row with Ideal Velocity Info */}
        <div className="flex justify-between items-end">
          <label className="text-base font-semibold text-slate-600 flex items-center gap-2">
            火车速度 <Latex>{"$v$"}</Latex>
          </label>
          <div className="text-right flex flex-col items-end">
            <span className="text-blue-600 font-mono font-bold text-lg">{velocityKmh} km/h</span>
            <span
              className="text-xs text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-green-100 transition-colors"
              onClick={() => {
                handleVelocityChange(idealKmh);
              }}
              title="点击应用规定速度"
            >
              规定: {idealKmh.toFixed(1)} km/h
            </span>
          </div>
        </div>

        <div className="relative pt-6 pb-2">
          <div
            className="absolute top-1 transform -translate-x-1/2 flex flex-col items-center pointer-events-none z-0"
            style={{ left: `${idealMarkerPercent}%` }}
          >
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-green-600"></div>
          </div>

          <input
            type="range"
            min="0"
            max={MAX_KMH}
            step="1"
            value={velocityKmh}
            onChange={(e) => {
              handleVelocityChange(Number(e.target.value));
            }}
            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer relative z-10"
            style={{ background: "transparent", boxShadow: "none" }}
          />
          <div className="absolute top-[30px] left-0 w-full h-3 bg-slate-200 rounded-lg -z-10"></div>
        </div>
        <div className="flex justify-between text-sm text-slate-500 px-1">
          <span>0 km/h</span>
          <span>{MAX_KMH} km/h</span>
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-100">
        {/* Force Analysis Segmented Control */}
        <div className="space-y-2">
          <label className="text-base font-medium text-slate-700 block">受力分析模式</label>
          <div className="flex bg-slate-200 p-1 rounded-lg">
            {(["none", "real", "concurrent"] as ForceMode[]).map((mode) => {
              const labels = {
                none: "不显示",
                real: "真实位置",
                concurrent: "共点(重心)",
              };
              const isActive = state.forceMode === mode;

              return (
                <button
                  key={mode}
                  onClick={() => {
                    onChange({ forceMode: mode });
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    isActive
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Plane Toggle Switch */}
        <div className="flex items-center justify-between">
          <label className="text-base font-medium text-slate-700">显示圆周运动平面</label>
          <button
            onClick={() => {
              onChange({ showPlane: !state.showPlane });
            }}
            className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              state.showPlane ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                state.showPlane ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Legend */}
      {state.forceMode !== "none" && (
        <div className="mt-auto pt-4 border-t text-sm">
          <h3 className="font-semibold text-slate-600 mb-3">图例</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-6 h-1 bg-black/80 flex-shrink-0"></div>
              <div className="flex items-center whitespace-nowrap">
                <span className="mr-1">重力</span>
                <Latex>{"$G$"}</Latex>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-6 h-1 bg-purple-600 flex-shrink-0"></div>
              <div className="flex items-center whitespace-nowrap">
                <span className="mr-1">支持力</span>
                <Latex>{"$F_N$"}</Latex>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-6 h-1 bg-red-500 flex-shrink-0"></div>
              <div className="flex items-center whitespace-nowrap">
                <span className="mr-1">轮缘弹力</span>
                <Latex>{"$F$"}</Latex>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="w-6 h-1 bg-green-500 dashed border-b-2 border-green-500 flex-shrink-0"
                style={{ borderStyle: "dashed" }}
              ></div>
              <div className="flex items-center whitespace-nowrap">
                <span className="mr-1">向心力</span>
                <Latex>{"$F_{向}$"}</Latex>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4 text-xs text-slate-500 text-center">
        制作者：
        <a href="https://github.com/mister-hope" target="_blank" rel="noopener noreferrer">
          Mister Hope
        </a>
      </div>
    </div>
  );
};

export default ControlPanel;
