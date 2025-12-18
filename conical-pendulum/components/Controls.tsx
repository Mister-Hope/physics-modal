import type { FC } from "react";
import { Latex } from "../../components/Latex";
import type { PendulumConfig } from "../types";

interface ControlsProps {
  height: number;
  setHeight: (h: number) => void;
  maxHeight: number;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  pendulums: PendulumConfig[];
  onUpdatePendulum: (id: number, updates: Partial<PendulumConfig>) => void;
  onAddPendulum: () => void;
  onRemovePendulum: () => void;
}

export const Controls: FC<ControlsProps> = ({
  height,
  setHeight,
  maxHeight,
  isPlaying,
  setIsPlaying,
  pendulums,
  onUpdatePendulum,
  onAddPendulum,
  onRemovePendulum,
}) => {
  return (
    <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-400"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          全局控制
        </h2>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-6 py-2 rounded-lg text-lg font-bold transition-all flex items-center gap-2 ${
            isPlaying
              ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/50"
              : "bg-green-500/20 text-green-500 hover:bg-green-500/30 border border-green-500/50"
          }`}
        >
          {isPlaying ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
              <span>暂停</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>演示</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-8">
        {/* Height Control */}
        <div>
          <div className="flex justify-between items-end mb-3">
            <label
              htmlFor="height-slider"
              className="text-lg text-slate-300 font-bold"
            >
              垂直高度 <Latex>h</Latex>
            </label>
            <span className="text-3xl text-blue-400 font-bold">
              {height.toFixed(2)}m
            </span>
          </div>

          <input
            id="height-slider"
            type="range"
            min={0.1}
            max={maxHeight}
            step={0.01}
            value={height}
            onChange={(e) => setHeight(parseFloat(e.target.value))}
            className="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
          />
          <div className="flex justify-between text-slate-200 mt-2">
            <span>0.10m</span>
            <span>Max (L限制): {maxHeight.toFixed(2)}m</span>
          </div>
        </div>

        {/* Individual Pendulum Controls */}
        <div className="border-t border-slate-700 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-200">对象参数调节</h3>
            <div className="flex gap-2">
              <button
                onClick={onRemovePendulum}
                disabled={pendulums.length <= 1}
                className="w-8 h-8 flex items-center justify-center rounded bg-slate-800 text-slate-200 hover:bg-red-900/50 hover:text-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="减少小球"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <button
                onClick={onAddPendulum}
                disabled={pendulums.length >= 3}
                className="w-8 h-8 flex items-center justify-center rounded bg-slate-800 text-slate-200 hover:bg-green-900/50 hover:text-green-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="增加小球"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {pendulums.map((p) => (
              <div
                key={p.id}
                className="bg-slate-950/60 p-4 rounded-lg border border-slate-800"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: p.color }}
                  ></div>
                  <span className="font-bold text-slate-200 text-lg">
                    {p.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Length Slider */}
                  <div>
                    <div className="flex justify-between text-base mb-1">
                      <span>
                        绳长 <Latex>L</Latex>
                      </span>
                      <span className="font-mono text-slate-200">
                        {p.length.toFixed(2)}
                        <span className="font-serif">m</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={4.0}
                      step={0.1}
                      value={p.length}
                      onChange={(e) =>
                        onUpdatePendulum(p.id, {
                          length: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
                    />
                  </div>
                  {/* Mass Slider */}
                  <div>
                    <div className="flex justify-between text-base mb-1">
                      <span>
                        质量 <Latex>m</Latex>
                      </span>
                      <span className="font-mono text-slate-200">
                        {p.mass.toFixed(1)}
                        <span className="font-serif">kg</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={5.0}
                      step={0.1}
                      value={p.mass}
                      onChange={(e) =>
                        onUpdatePendulum(p.id, {
                          mass: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
