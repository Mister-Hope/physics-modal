import {
  Play,
  Pause,
  ArrowDownToLine,
  ArrowRightToLine,
  RotateCcw,
  Activity,
  Move,
  FastForward,
} from "lucide-react";
import type { Dispatch, FC, SetStateAction } from "react";

import type { PhysicsParams, VectorConfig } from "../types";
import { SimulationMode } from "../types";

interface ControlPanelProps {
  params: PhysicsParams;
  setParams: (p: PhysicsParams) => void;
  mode: SimulationMode;
  setMode: (m: SimulationMode) => void;
  reset: () => void;
  vectors: VectorConfig;
  setVectors: Dispatch<SetStateAction<VectorConfig>>;
}

export const ControlPanel: FC<ControlPanelProps> = ({
  params,
  setParams,
  mode,
  setMode,
  reset,
  vectors,
  setVectors,
}) => {
  const isRunning =
    mode === SimulationMode.Running ||
    mode === SimulationMode.PauseAtBottom ||
    mode === SimulationMode.PauseAtTop;

  return (
    <div className="h-full flex flex-col gap-8 p-6 bg-slate-800 border-r border-slate-700 shadow-xl overflow-y-auto w-80 z-10">
      {/* Sliders */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">参数调节</h2>
        <div>
          <label className="block text-lg font-medium text-slate-200 mb-2">摆球质量 m (kg)</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={params.mass}
              onChange={(e) => {
                setParams({ ...params, mass: Number.parseFloat(e.target.value) });
              }}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <span className="text-xl font-mono text-sky-400 w-16 text-right">
              {params.mass.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-lg font-medium text-slate-200 mb-2">摆绳长度 L (m)</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.1"
              value={params.length}
              onChange={(e) => {
                setParams({ ...params, length: Number.parseFloat(e.target.value) });
              }}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <span className="text-xl font-mono text-sky-400 w-16 text-right">
              {params.length.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-lg font-medium text-slate-200 mb-2">最大摆角 (振幅)</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={params.initialAngle}
              onChange={(e) => {
                setParams({
                  ...params,
                  initialAngle: Number.parseFloat(e.target.value),
                });
              }}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <span className="text-xl font-mono text-sky-400 w-16 text-right">
              {params.initialAngle.toFixed(0)}°
            </span>
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="space-y-4 pt-4 border-t border-slate-600">
        <h3 className="text-lg font-semibold text-slate-300">播放控制</h3>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => {
              setMode(isRunning ? SimulationMode.Paused : SimulationMode.Running);
            }}
            className={`flex items-center justify-start gap-2 px-4 py-3 rounded-lg font-bold text-lg transition-colors ${
              isRunning
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-green-600 hover:bg-green-500 text-white"
            }`}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
            {isRunning ? "暂停" : "开始 / 继续"}
          </button>

          <button
            onClick={() => {
              setMode(SimulationMode.PauseAtBottom);
            }}
            disabled={mode === SimulationMode.PauseAtBottom}
            className={`flex items-center justify-start gap-3 px-4 py-3 rounded-lg font-medium text-lg border transition-colors ${
              mode === SimulationMode.PauseAtBottom
                ? "bg-sky-900 border-sky-500 text-sky-200"
                : "bg-slate-700 border-transparent hover:bg-slate-600 text-slate-200"
            }`}
          >
            <ArrowDownToLine size={24} />
            最低点暂停
          </button>

          <button
            onClick={() => {
              setMode(SimulationMode.PauseAtTop);
            }}
            disabled={mode === SimulationMode.PauseAtTop}
            className={`flex items-center justify-start gap-3 px-4 py-3 rounded-lg font-medium text-lg border transition-colors ${
              mode === SimulationMode.PauseAtTop
                ? "bg-sky-900 border-sky-500 text-sky-200"
                : "bg-slate-700 border-transparent hover:bg-slate-600 text-slate-200"
            }`}
          >
            <ArrowRightToLine size={24} />
            最高点暂停 (右)
          </button>

          <button
            onClick={reset}
            className="flex items-center justify-start gap-3 px-4 py-3 rounded-lg font-medium text-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
          >
            <RotateCcw size={24} />
            重置模型
          </button>
        </div>
      </div>

      {/* Vector Toggles */}
      <div className="space-y-4 pt-4 border-t border-slate-600">
        <h3 className="text-lg font-semibold text-slate-300">矢量显示</h3>

        <button
          onClick={() => {
            setVectors((prev) => ({ ...prev, showForces: !prev.showForces }));
          }}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-lg transition-all ${
            vectors.showForces
              ? "bg-slate-700 border-slate-500 text-white"
              : "bg-slate-800 border-slate-700 text-slate-400"
          }`}
        >
          <div className="flex items-center gap-3">
            <Move size={24} className={vectors.showForces ? "text-pink-400" : ""} />
            <span>受力分析</span>
          </div>
          <div
            className={`w-3 h-3 rounded-full ${vectors.showForces ? "bg-green-500" : "bg-slate-600"}`}
          />
        </button>

        <button
          onClick={() => {
            setVectors((prev) => ({
              ...prev,
              showVelocity: !prev.showVelocity,
            }));
          }}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-lg transition-all ${
            vectors.showVelocity
              ? "bg-slate-700 border-slate-500 text-white"
              : "bg-slate-800 border-slate-700 text-slate-400"
          }`}
        >
          <div className="flex items-center gap-3">
            <FastForward size={24} className={vectors.showVelocity ? "text-green-400" : ""} />
            <span>速度</span>
          </div>
          <div
            className={`w-3 h-3 rounded-full ${vectors.showVelocity ? "bg-green-500" : "bg-slate-600"}`}
          />
        </button>

        <button
          onClick={() => {
            setVectors((prev) => ({
              ...prev,
              showAcceleration: !prev.showAcceleration,
            }));
          }}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-lg transition-all ${
            vectors.showAcceleration
              ? "bg-slate-700 border-slate-500 text-white"
              : "bg-slate-800 border-slate-700 text-slate-400"
          }`}
        >
          <div className="flex items-center gap-3">
            <Activity size={24} className={vectors.showAcceleration ? "text-amber-400" : ""} />
            <span>加速度</span>
          </div>
          <div
            className={`w-3 h-3 rounded-full ${vectors.showAcceleration ? "bg-green-500" : "bg-slate-600"}`}
          />
        </button>
      </div>

      <div className="mt-auto pt-4 text-xs text-slate-500 text-center">
        制作者：
        <a href="https://github.com/mister-hope" target="_blank" rel="noopener noreferrer">
          Mister Hope
        </a>
      </div>
    </div>
  );
};
