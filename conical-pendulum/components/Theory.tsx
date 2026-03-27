import type { FC } from "react";

import { Latex } from "../../components/Latex";

export const Theory: FC = () => (
  <div className="bg-slate-900 rounded-xl p-5 mt-3 border border-slate-800 shadow-lg">
    <h2 className="text-2xl font-bold mb-6 text-indigo-300 border-b border-indigo-500/30 pb-3">
      原理推导
    </h2>

    <div className="space-y-8 text-lg text-slate-300 leading-relaxed">
      {/* Step 1 */}
      <section>
        <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-xs flex items-center justify-center">
            1
          </span>
          受力分析
        </h3>
        <p className="mb-2 text-slate-400">
          小球受重力 <Latex>mg</Latex> 和绳子拉力 <Latex>F_T</Latex>。
          由于小球在水平面上做匀速圆周运动，小球在竖直方向受力平衡，水平方向的合力充当向心力。
        </p>
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <div className="mb-2">
            竖直方向：<Latex block>{String.raw`F_T \cos\theta = mg`}</Latex>
          </div>
          <div>
            水平方向：
            <Latex
              block
            >{String.raw`F_T \sin\theta = F_{n} = m \omega^2 r = m \frac{4\pi^2}{T^2} r`}</Latex>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section>
        <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-xs flex items-center justify-center">
            2
          </span>
          几何关系
        </h3>
        <p className="mb-2 text-slate-400">
          绳长 <Latex>L</Latex>，回转半径 <Latex>r</Latex>，悬点高度 <Latex>h</Latex>。
        </p>
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <Latex block>{String.raw`\tan\theta = \frac{r}{h}`}</Latex>
        </div>
      </section>

      {/* Step 3 */}
      <section>
        <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-xs flex items-center justify-center">
            3
          </span>
          联立求解
        </h3>
        <p className="mb-2 text-slate-400">将水平方程除以竖直方程：</p>
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
          <Latex
            block
          >{String.raw`\tan\theta = \frac{m \omega^2 r}{mg} = \frac{\omega^2 r}{g}`}</Latex>
        </div>
        <p className="text-slate-400 my-2">
          代入几何关系 <Latex>{String.raw`\tan\theta = r/h`}</Latex>
        </p>
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
          <Latex block>{String.raw`\frac{r}{h} = \frac{\omega^2 r}{g}`}</Latex>
        </div>
        <p className="text-slate-400 my-2">
          消去 <Latex>r</Latex> (当 <Latex>r \neq 0</Latex>)
        </p>
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
          <Latex
            block
          >{String.raw`\omega^2 = \frac{g}{h} \implies \omega = \sqrt{\frac{g}{h}}`}</Latex>
        </div>
      </section>

      {/* Conclusion */}
      <section className="bg-indigo-900/20 border border-indigo-500/30 p-5 rounded-xl">
        <h3 className="text-xl font-bold text-indigo-300 mb-2">核心结论</h3>
        <p>
          圆锥摆的角速度 <Latex>\omega</Latex>{" "}
          <strong>
            只与垂直高度 <Latex>h</Latex> 有关
          </strong>
          。
        </p>
        <p className="mt-2 font-bold text-white">
          与小球质量 <Latex>m</Latex> 无关，与绳长 <Latex>L</Latex> 无关。
        </p>
      </section>
    </div>
  </div>
);
