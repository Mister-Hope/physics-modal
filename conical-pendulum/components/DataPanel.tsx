import type { FC } from "react";

import { Latex } from "../../components/Latex";
import type { PendulumConfig } from "../types";

interface DataPanelProps {
  height: number;
  angularVelocity: number;
  period: number;
  pendulums: PendulumConfig[];
}

export const DataPanel: FC<DataPanelProps> = ({ height, angularVelocity, period, pendulums }) => (
  <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 shadow-lg">
    <h3 className="text-2xl font-bold mb-4 text-white flex items-center gap-3">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-purple-400"
      >
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>
      实时数据
    </h3>

    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
        <div className="text-lg text-slate-400 uppercase tracking-wider mb-2 font-bold">
          角速度 <Latex>\omega</Latex>
        </div>
        <div className="text-3xl font-mono text-white font-bold">
          {angularVelocity.toFixed(2)} <span className="text-lg text-slate-500">rad/s</span>
        </div>
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
        <div className="text-lg text-slate-400 uppercase tracking-wider mb-2 font-bold">
          周期 <Latex>T</Latex>
        </div>
        <div className="text-3xl font-mono text-white font-bold">
          {period.toFixed(2)} <span className="text-lg text-slate-500">s</span>
        </div>
      </div>
    </div>

    <div className="overflow-hidden rounded-lg border border-slate-800">
      <table className="w-full text-lg text-left">
        <thead className="text-slate-300 uppercase bg-slate-800">
          <tr>
            <th className="px-4 py-3">对象</th>
            <th className="px-4 py-3">
              半径 <Latex>r</Latex>
            </th>
            <th className="px-4 py-3">
              角度 <Latex>\theta</Latex>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-900/50 text-md">
          {pendulums.map((pendulum) => {
            const radius = Math.sqrt(
              Math.max(0, pendulum.length * pendulum.length - height * height),
            );
            const angleDeg = (Math.acos(Math.min(1, height / pendulum.length)) * 180) / Math.PI;

            return (
              <tr key={pendulum.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 font-bold flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: pendulum.color }}
                  ></div>
                  <span className="text-slate-200">{pendulum.label.split(" ")[0]}</span>
                </td>
                <td className="px-4 py-3 font-mono text-slate-300">{radius.toFixed(2)} m</td>
                <td className="px-4 py-3 font-mono text-slate-300">{angleDeg.toFixed(1)}°</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);
