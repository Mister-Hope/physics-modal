import { CheckCircle2, AlertTriangle, AlertOctagon, PauseCircle } from "lucide-react";
import type { FC } from "react";

import type { PhysicsResult } from "../types";

interface StatusCardProps {
  status: PhysicsResult["status"];
}

const StatusCard: FC<StatusCardProps> = ({ status }) => {
  const config = {
    perfect: {
      color: "bg-green-100 text-green-900 border-green-300",
      icon: <CheckCircle2 className="w-8 h-8 text-green-700" />,
      title: "完美状态",
      desc: "轮缘无侧压，重力与支持力的合力提供向心力。",
    },
    fast: {
      color: "bg-red-100 text-red-900 border-red-300",
      icon: <AlertTriangle className="w-8 h-8 text-red-700" />,
      title: "速度过快",
      desc: "火车有离心趋势，轮缘挤压外轨 (外轨提供指向内侧的弹力)。",
    },
    slow: {
      color: "bg-orange-100 text-orange-900 border-orange-300",
      icon: <AlertOctagon className="w-8 h-8 text-orange-700" />,
      title: "速度过慢",
      desc: "火车有近心趋势，轮缘挤压内轨 (内轨提供指向外侧的弹力)。",
    },
    stopped: {
      color: "bg-slate-200 text-slate-800 border-slate-400",
      icon: <PauseCircle className="w-8 h-8 text-slate-700" />,
      title: "静止状态",
      desc: "火车有沿斜面下滑趋势，依靠内轨轮缘阻挡。",
    },
  };

  const current = config[status];

  return (
    <div
      className={`p-4 rounded-xl border-l-4 shadow-md flex items-start gap-4 transition-all duration-300 ${current.color} border-${current.color.split(" ")[2].replace("border-", "")}`}
    >
      <div className="flex-shrink-0 mt-0.5">{current.icon}</div>
      <div>
        <h3 className="text-xl font-bold mb-1">{current.title}</h3>
        <p className="text-sm opacity-90 leading-snug">{current.desc}</p>
      </div>
    </div>
  );
};

export default StatusCard;
