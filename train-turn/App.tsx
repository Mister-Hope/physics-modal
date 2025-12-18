import type { FC } from "react";
import { useState, useMemo } from "react";
import type { SimulationState } from "./types";
import { calculatePhysics } from "./utils/physics";
import ControlPanel from "./components/ControlPanel";
import SimulationCanvas from "./components/SimulationCanvas";
import StatusCard from "./components/StatusCard";

const App: FC = () => {
  const [state, setState] = useState<SimulationState>({
    velocity: 25, // 90 km/h (Classic Green Train speed)
    angle: 8, // Typical banking for conventional rail
    radius: 600, // 600m (Conventional mainline curve)
    mass: 1000,
    forceMode: "none", // Default to none
    showPlane: false, // Default to off
  });

  const physics = useMemo(() => {
    return calculatePhysics(state.velocity, state.angle, state.radius);
  }, [state.velocity, state.angle, state.radius]);

  const handleStateChange = (newState: Partial<SimulationState>): void => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-base overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 flex items-center justify-start shadow-sm z-10">
        <h1 className="text-2xl font-bold text-slate-800">火车转弯物理模型</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col lg:flex-row gap-6">
        {/* Left Column: Controls & Feedback */}
        {/* Fixed width on large screens for stability, flex column for internal scrolling */}
        <div className="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-4 h-full overflow-hidden">
          {/* Feedback Section (Fixed at top of column) */}
          <div className="flex-shrink-0">
            <StatusCard status={physics.status} />
          </div>

          {/* Control Panel Section (Scrollable) */}
          <div className="flex-1 min-h-0">
            <ControlPanel
              state={state}
              physics={physics}
              onChange={handleStateChange}
            />
          </div>
        </div>

        {/* Right Column: Visualization */}
        <div className="flex-1 h-full min-w-0 flex flex-col gap-2 relative">
          <SimulationCanvas state={state} physics={physics} />

          <div className="absolute bottom-2 left-0 w-full text-center text-slate-500 text-sm pointer-events-none">
            视图：火车尾部横截面 | 红色圆点：重心
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
