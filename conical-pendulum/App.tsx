import type { ReactElement } from "react";
import { useState, useMemo, useEffect } from "react";

import { Controls } from "./components/Controls";
import { DataPanel } from "./components/DataPanel";
import { PendulumSimulation } from "./components/PendulumSimulation";
import { Theory } from "./components/Theory";
import { GRAVITY, PENDULUM_PRESETS } from "./constants.js";
import type { PendulumConfig } from "./types.js";

export default function App(): ReactElement {
  // Height (h) is the independent variable shared by all conical pendulums
  const [height, setHeight] = useState<number>(1.2);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Start with only the first pendulum (Blue)
  const [pendulums, setPendulums] = useState<PendulumConfig[]>([PENDULUM_PRESETS[0]]);

  // Calculate shared physics properties
  const angularVelocity = useMemo(() => Math.sqrt(GRAVITY / height), [height]);
  const period = useMemo(() => (2 * Math.PI) / angularVelocity, [angularVelocity]);

  // Determine the maximum allowable height based on the shortest string
  const minLength = Math.min(...pendulums.map((p) => p.length));
  const maxHeight = minLength * 0.99; // Cap extremely close to L to allow low theta

  // Auto-correct height if lengths change to be smaller than current height
  useEffect(() => {
    if (height > maxHeight) setHeight(maxHeight);
  }, [maxHeight, height]);

  const handleHeightChange = (newHeight: number): void => {
    const safeHeight = Math.min(Math.max(0.1, newHeight), maxHeight);

    setHeight(safeHeight);
  };

  const handlePendulumUpdate = (id: number, updates: Partial<PendulumConfig>): void => {
    setPendulums((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        return { ...p, ...updates };
      }),
    );
  };

  const handleAddPendulum = (): void => {
    if (pendulums.length >= 3) return;
    const nextPresetIndex = pendulums.length;

    if (nextPresetIndex < PENDULUM_PRESETS.length)
      setPendulums([...pendulums, PENDULUM_PRESETS[nextPresetIndex]]);
  };

  const handleRemovePendulum = (): void => {
    if (pendulums.length <= 1) return;
    setPendulums(pendulums.slice(0, -1));
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden flex flex-col">
      {/* Header - Compact */}
      <header className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0 h-16">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          圆锥摆演示教学系统
        </h1>
      </header>

      <main className="flex-grow flex flex-row overflow-hidden h-[calc(100vh-4rem)]">
        {/* Left Column: Controls & Data - 30% Width (approx 400px-450px) */}
        <div className="w-[420px] shrink-0 flex flex-col bg-slate-900/50 border-r border-slate-800 overflow-y-auto custom-scrollbar p-3 gap-3">
          <Controls
            height={height}
            setHeight={handleHeightChange}
            maxHeight={maxHeight}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            pendulums={pendulums}
            onUpdatePendulum={handlePendulumUpdate}
            onAddPendulum={handleAddPendulum}
            onRemovePendulum={handleRemovePendulum}
          />
          <div className="mt-auto pt-4 text-xs text-slate-500 text-center">
            制作者：
            <a href="https://github.com/mister-hope" target="_blank" rel="noopener noreferrer">
              Mister Hope
            </a>
          </div>
        </div>

        {/* Middle Column: Simulation (Flexible Width) */}
        <div className="flex-grow relative bg-slate-950 overflow-hidden flex flex-col">
          <div className="w-full h-full">
            <PendulumSimulation
              height={height}
              pendulums={pendulums}
              isPlaying={isPlaying}
              angularVelocity={angularVelocity}
            />
          </div>
        </div>

        {/* Right Column: Theory & Derivation - Fixed Width */}

        <div className="w-[450px] shrink-0 bg-slate-900/50 border-l border-slate-800 overflow-y-auto custom-scrollbar p-3 gap-3">
          <DataPanel
            height={height}
            angularVelocity={angularVelocity}
            period={period}
            pendulums={pendulums}
          />
          <Theory />
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f172a; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155; 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569; 
        }
      `}</style>
    </div>
  );
}
