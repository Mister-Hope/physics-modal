import type { FC } from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { ControlPanel } from "./components/ControlPanel";
import { DataDisplay } from "./components/DataDisplay";
import { Visualizer } from "./components/Visualizer";
import type { SimulationState, PhysicsParams, VectorConfig } from "./types";
import { SimulationMode } from "./types";
import { GRAVITY, DT } from "./constants";

const INITIAL_PARAMS: PhysicsParams = {
  mass: 2.0,
  length: 2.0,
  gravity: GRAVITY,
  initialAngle: 30,
};

const INITIAL_STATE: SimulationState = {
  theta: INITIAL_PARAMS.initialAngle * (Math.PI / 180),
  omega: 0,
  alpha: 0,
  time: 0,
};

// Start with all vectors hidden
const INITIAL_VECTORS: VectorConfig = {
  showForces: false,
  showVelocity: false,
  showAcceleration: false,
};

const App: FC = () => {
  const [params, setParams] = useState<PhysicsParams>(INITIAL_PARAMS);
  const [state, setState] = useState<SimulationState>(INITIAL_STATE);
  const [mode, setMode] = useState<SimulationMode>(SimulationMode.Paused);
  const [vectors, setVectors] = useState<VectorConfig>(INITIAL_VECTORS);

  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const accumulatorRef = useRef<number>(0);

  // Use a Ref to store the latest physics state.
  // This decoupling prevents React StrictMode's double-invoke from messing up the time accumulator.
  const stateRef = useRef<SimulationState>(INITIAL_STATE);

  // Core function to reset physics state to the current "Max Angle" (Amplitude)
  const initializeState = useCallback(() => {
    const startState = {
      theta: params.initialAngle * (Math.PI / 180),
      omega: 0,
      alpha: 0,
      time: 0,
    };

    stateRef.current = startState;
    setState(startState);
    accumulatorRef.current = 0;
    lastTimeRef.current = undefined;
  }, [params.initialAngle]);

  // Live Update: Whenever the Max Angle (initialAngle) slider changes,
  // immediately update the simulation state to reflect this new amplitude.
  // This allows the user to "drag" the pendulum by moving the slider.
  useEffect(() => {
    initializeState();
  }, [initializeState]);

  // Manual Reset Button: Resets state AND pauses the simulation
  const handleReset = (): void => {
    initializeState();
    setMode(SimulationMode.Paused);
  };

  // Runge-Kutta 4 (RK4) Integration for higher precision
  const updatePhysics = useCallback(
    (
      currentState: SimulationState,
      currentParams: PhysicsParams,
      dt: number,
    ): SimulationState => {
      const { theta, omega } = currentState;
      const { gravity, length } = currentParams;

      // Define the state derivatives: dTheta/dt = omega, dOmega/dt = -g/L * sin(theta)
      const evaluateDerivatives = (
        t: number,
        th: number,
        om: number,
      ): {
        dTheta: number;
        dOmega: number;
      } => {
        return {
          dTheta: om,
          dOmega: -(gravity / length) * Math.sin(th),
        };
      };

      // k1
      const k1 = evaluateDerivatives(0, theta, omega);

      // k2
      const k2 = evaluateDerivatives(
        0 + dt * 0.5,
        theta + k1.dTheta * dt * 0.5,
        omega + k1.dOmega * dt * 0.5,
      );

      // k3
      const k3 = evaluateDerivatives(
        0 + dt * 0.5,
        theta + k2.dTheta * dt * 0.5,
        omega + k2.dOmega * dt * 0.5,
      );

      // k4
      const k4 = evaluateDerivatives(
        0 + dt,
        theta + k3.dTheta * dt,
        omega + k3.dOmega * dt,
      );

      // Combine
      const newTheta =
        theta +
        (dt / 6.0) * (k1.dTheta + 2 * k2.dTheta + 2 * k3.dTheta + k4.dTheta);
      const newOmega =
        omega +
        (dt / 6.0) * (k1.dOmega + 2 * k2.dOmega + 2 * k3.dOmega + k4.dOmega);

      // Calculate instantaneous alpha for display (based on new position)
      const newAlpha = -(gravity / length) * Math.sin(newTheta);

      return {
        theta: newTheta,
        omega: newOmega,
        alpha: newAlpha,
        time: currentState.time + dt,
      };
    },
    [],
  );

  const animate = useCallback(
    (time: number) => {
      if (lastTimeRef.current !== undefined) {
        // Calculate real delta time in seconds
        const frameTime = Math.min((time - lastTimeRef.current) / 1000, 0.1); // Clamp to 0.1s

        // Update accumulator
        accumulatorRef.current += frameTime;

        // Only process physics if not paused
        if (mode !== SimulationMode.Paused) {
          let active = true;
          // Work on the ref state directly
          let nextState = { ...stateRef.current };

          // Process fixed time steps
          // The mutation of accumulatorRef happens HERE, outside of setState
          while (accumulatorRef.current >= DT && active) {
            // We need to pass the 'previous step state' to calculate the 'next step state'
            const prevState = nextState;

            nextState = updatePhysics(nextState, params, DT);
            accumulatorRef.current -= DT;

            // Check Pause Conditions
            if (mode === SimulationMode.PauseAtBottom) {
              // Detect zero crossing of Theta
              if (
                (prevState.theta > 0 && nextState.theta <= 0) ||
                (prevState.theta < 0 && nextState.theta >= 0)
              ) {
                setMode(SimulationMode.Paused);
                nextState.theta = 0;
                active = false;
              }
            }

            if (mode === SimulationMode.PauseAtTop) {
              // Detect velocity zero crossing (Turning point) on the Right side (theta > 0)
              if (prevState.theta > 0.1) {
                if (
                  (prevState.omega > 0 && nextState.omega <= 0) ||
                  (prevState.omega < 0 && nextState.omega >= 0)
                ) {
                  setMode(SimulationMode.Paused);
                  nextState.omega = 0;
                  active = false;
                }
              }
            }
          }

          // Update the ref
          stateRef.current = nextState;
          // Trigger React render with the new state
          setState(nextState);
        } else {
          // If paused, just reset accumulator to avoid jump on resume
          accumulatorRef.current = 0;
        }
      }

      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [mode, params, updatePhysics],
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);

    return (): void => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-slate-100 font-sans bg-slate-900">
      {/* Navigation Bar */}
      <header className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0 h-16">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          单摆演示教学系统
        </h1>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Controls */}
        <ControlPanel
          params={params}
          setParams={setParams}
          mode={mode}
          setMode={setMode}
          reset={handleReset}
          vectors={vectors}
          setVectors={setVectors}
        />

        {/* Center: Visualization */}
        <Visualizer state={state} params={params} vectors={vectors} />

        {/* Right: Data */}
        <DataDisplay state={state} params={params} />
      </div>
    </div>
  );
};

export default App;
