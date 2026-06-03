<script setup lang="ts">
import Latex from "@/components/Latex.vue";
</script>

<template>
  <div class="bg-slate-900 rounded-xl p-4 mt-3 border border-slate-800 shadow-lg">
    <h2 class="text-xl font-bold mb-5 text-indigo-300 border-b border-indigo-500/30 pb-2">
      原理推导
    </h2>

    <div class="space-y-6 text-base text-slate-300 leading-relaxed">
      <section>
        <h3 class="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-blue-600 text-xs flex items-center justify-center">1</span>
          受力分析
        </h3>
        <p class="mb-2 text-slate-400">
          小球受重力 <Latex latex="mg" /> 和绳子拉力 <Latex latex="F_T" />。
          由于小球在水平面上做匀速圆周运动，小球在竖直方向受力平衡，水平方向的合力充当向心力。
        </p>
        <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div class="mb-1">
            竖直方向：<Latex block latex="F_T \cos\theta = mg" />
          </div>
          <div>
            水平方向：
            <Latex block latex="F_T \sin\theta = F_{n} = m \omega^2 r = m \frac{4\pi^2}{T^2} r" />
          </div>
        </div>
      </section>

      <section>
        <h3 class="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-blue-600 text-xs flex items-center justify-center">2</span>
          几何关系
        </h3>
        <p class="mb-2 text-slate-400">
          绳长 <Latex latex="L" />，回转半径 <Latex latex="r" />，悬点高度 <Latex latex="h" />。
        </p>
        <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <Latex block latex="\tan\theta = \frac{r}{h}" />
        </div>
      </section>

      <section>
        <h3 class="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-blue-600 text-xs flex items-center justify-center">3</span>
          联立求解
        </h3>
        <p class="mb-2 text-slate-400">将水平方程除以竖直方程：</p>
        <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <Latex block latex="\tan\theta = \frac{m \omega^2 r}{mg} = \frac{\omega^2 r}{g}" />
        </div>
        <p class="text-slate-400 my-2">
          代入几何关系 <Latex latex="\tan\theta = r/h" />
        </p>
        <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <Latex block latex="\frac{r}{h} = \frac{\omega^2 r}{g}" />
        </div>
        <p class="text-slate-400 my-2">
          消去 <Latex latex="r" /> (当 <Latex latex="r \neq 0" />)
        </p>
        <div class="bg-slate-950 p-3 rounded-lg border border-slate-800">
          <Latex block latex="\omega^2 = \frac{g}{h} \implies \omega = \sqrt{\frac{g}{h}}" />
        </div>
      </section>

      <section class="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl">
        <h3 class="text-lg font-bold text-indigo-300 mb-2">核心结论</h3>
        <p>
          圆锥摆的角速度 <Latex latex="\omega" />
          <strong>只与垂直高度 <Latex latex="h" /> 有关</strong>。
        </p>
        <p class="mt-2 font-bold text-white">
          与小球质量 <Latex latex="m" /> 无关，与绳长 <Latex latex="L" /> 无关。
        </p>
      </section>
    </div>
  </div>
</template>
