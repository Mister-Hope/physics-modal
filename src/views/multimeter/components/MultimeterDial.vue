<script setup lang="ts">
import { computed } from "vue";

import type { Gear } from "../types";

const { deflection, gear } = defineProps<{
  deflection: number; // 0 (left, zero deflection / ohm inf) to 1 (right, full deflection / ohm 0)
  gear: Gear;
}>();

// Geometry definition for J0411 dial
const CENTER_X = 350;
const CENTER_Y = 336;
const START_ANGLE = -45;
const END_ANGLE = 45;
const SWEEP = END_ANGLE - START_ANGLE; // 90 degrees total

// Needle angle
const needleAngle = computed(() => {
  const normalizedDeflection = Math.max(0, Math.min(1, deflection));
  return START_ANGLE + normalizedDeflection * SWEEP;
});

// Polar to Cartesian conversion
const polarToCartesian = (radius: number, angleDeg: number): { x: number; y: number } => {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER_X + radius * Math.sin(rad),
    y: CENTER_Y - radius * Math.cos(rad),
  };
};

const describeArc = (radius: number, startAngle: number, endAngle: number): string => {
  const start = polarToCartesian(radius, startAngle);
  const end = polarToCartesian(radius, endAngle);
  const arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${arcSweep} 1 ${end.x} ${end.y}`;
};

// -------------------------------------------------------------
// 1. OHM SCALE (Top, Red, non-linear, left inf, right 0, Rmid=15)
// -------------------------------------------------------------
const OHM_RADIUS = 282;
const ohmMajorTicks = [
  { value: 0, label: "0", position: 1 },
  { value: 5, label: "5", position: 15 / 20 },
  { value: 10, label: "10", position: 15 / 25 },
  { value: 15, label: "15", position: 0.5, isMid: true },
  { value: 20, label: "20", position: 15 / 35 },
  { value: 30, label: "30", position: 15 / 45 },
  { value: 40, label: "40", position: 15 / 55 },
  { value: 50, label: "50", position: 15 / 65 },
  { value: 100, label: "100", position: 15 / 115 },
  { value: 200, label: "200", position: 15 / 215 },
  { value: 500, label: "500", position: 15 / 515 },
  { value: 1000, label: "1k", position: 15 / 1015 },
  { value: Infinity, label: "∞", position: 0 },
];

const ohmSubValues = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19, 25, 35, 45, 60,
  70, 80, 90, 150, 300, 400,
];

const ohmMinorTicks = ohmSubValues.map((resistance) => ({
  value: resistance,
  position: 15 / (15 + resistance),
  isIntegerTick: Number.isInteger(resistance) && resistance >= 1 && resistance <= 4,
}));

// -------------------------------------------------------------
// 2. LINEAR SCALE (mA.V Common, 50 divisions)
// -------------------------------------------------------------
const LINEAR_RADIUS = 234;
const linTicks = Array.from({ length: 51 }, (_, division) => {
  const normalizedPosition = division / 50;
  const angle = START_ANGLE + normalizedPosition * SWEEP;
  const isMajor = division % 10 === 0;
  const isMedium = division % 5 === 0 && !isMajor;
  return {
    index: division,
    position: normalizedPosition,
    angle,
    isMajor,
    isMedium,
    val250: division * 5,
    val50: division,
    val10: division / 5,
  };
});

// -------------------------------------------------------------
// 3. AC 2.5V~ SCALE (Dedicated, Bottom Arc, 0 to 2.5)
// -------------------------------------------------------------
const AC_RADIUS = 188;
const acTicks = Array.from({ length: 26 }, (_, division) => {
  const normalizedPosition = division / 25;
  const angle = START_ANGLE + normalizedPosition * SWEEP;
  const isMajor = division % 5 === 0;
  return {
    index: division,
    position: normalizedPosition,
    angle,
    isMajor,
    value: (division * 0.1).toFixed(1),
  };
});

const acMajorLabels = [
  { value: "0", position: 0 },
  { value: "0.5", position: 0.2 },
  { value: "1", position: 0.4 },
  { value: "1.5", position: 0.6 },
  { value: "2", position: 0.8 },
  { value: "2.5", position: 1 },
];

// Highlight active scale based on current gear
const activeScaleHighlight = computed(() => {
  if (gear.category === "ohm") return "ohm";
  if (gear.id === "acv_10") return "ac2_5";
  if (gear.category === "dcv" || gear.category === "dcma" || gear.category === "acv")
    return "linear";
  return "none";
});
</script>

<template>
  <div class="relative w-full select-none bg-white">
    <!-- Top subtle glass reflection highlight -->
    <div
      class="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-10"
    ></div>

    <!-- Main SVG Vector Dial -->
    <svg
      viewBox="0 0 700 450"
      class="w-full h-auto block drop-shadow-xs"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- Needle shadow filter -->
        <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
          <feOffset dx="1" dy="1.5" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Dial Face Plate Background (Vintage Off-white cream) -->
      <rect
        x="12"
        y="10"
        width="676"
        height="430"
        rx="10"
        fill="#faf9f5"
        stroke="#d5d3cb"
        stroke-width="1.5"
      />

      <!-- ================= DIAL BRANDING & LABELS (Match J0411) ================= -->
      <!-- Top Left: 航舟 Logo & ® -->
      <g transform="translate(48, 40)">
        <!-- Sailboat / Crescent logo -->
        <path
          d="M 0 16 Q 14 -4 28 16 Q 14 10 0 16 Z"
          fill="none"
          stroke="#262626"
          stroke-width="1.8"
        />
        <path d="M 14 0 L 14 16" stroke="#262626" stroke-width="1.5" />
        <text
          x="34"
          y="9"
          class="text-[13px] font-bold font-serif fill-stone-800"
          text-anchor="start"
        >
          航 舟
        </text>
        <text x="34" y="21" class="text-[10px] font-sans fill-stone-600" text-anchor="start">
          ®
        </text>
      </g>

      <!-- Top Right: JY Logo, Magnetoelectric, Accuracy Classes -->
      <g transform="translate(560, 36)">
        <!-- Diamond JY logo -->
        <polygon points="65,10 80,0 95,10 80,20" fill="none" stroke="#262626" stroke-width="1.4" />
        <text
          x="80"
          y="14"
          class="text-[10px] font-bold font-sans fill-stone-800"
          text-anchor="middle"
        >
          JY
        </text>

        <!-- Moving-coil symbol & accuracy class -->
        <path
          d="M 0 14 L 0 4 Q 7 -2 14 4 L 14 14 Z"
          fill="none"
          stroke="#262626"
          stroke-width="1.2"
        />
        <circle cx="7" cy="8" r="3" fill="none" stroke="#262626" stroke-width="1" />
        <text x="26" y="14" class="text-[11px] font-sans fill-stone-700">2.5</text>
        <text x="44" y="14" class="text-[11px] font-sans fill-stone-700">5.0</text>
        <text x="56" y="8" class="text-[12px] font-serif fill-stone-700">☆</text>
      </g>

      <!-- Center Branding: A - V - Ω and 杭州电表厂 -->
      <text
        x="350"
        y="258"
        class="text-[19px] font-black font-serif tracking-[4px] fill-stone-900"
        text-anchor="middle"
      >
        A - V - Ω
      </text>
      <text
        x="350"
        y="278"
        class="text-[12px] font-bold font-serif tracking-[3px] fill-stone-700"
        text-anchor="middle"
      >
        杭州电表厂
      </text>

      <!-- Bottom Left Specs (High contrast with clean frame) -->
      <g transform="translate(38, 332)">
        <text
          x="2"
          y="0"
          class="fill-stone-500 font-mono text-[10px] font-semibold tracking-wider select-none"
        >
          XK32-059 9202
        </text>
        <rect
          x="0"
          y="6"
          width="144"
          height="54"
          rx="6"
          fill="#ffffff"
          stroke="#64748b"
          stroke-width="1.5"
        />
        <text
          x="12"
          y="28"
          class="font-mono text-[14px] font-black fill-stone-950 tracking-wider select-none"
        >
          5000 Ω/V ―
        </text>
        <text
          x="12"
          y="50"
          class="font-mono text-[14px] font-black fill-stone-950 tracking-wider select-none"
        >
          2500 Ω/V ～
        </text>
      </g>

      <!-- Bottom Right Specs (High contrast with clean frame) -->
      <g transform="translate(534, 332)">
        <text
          x="2"
          y="0"
          class="fill-stone-500 font-mono text-[10px] font-semibold tracking-wider select-none"
        >
          JY213-87
        </text>
        <rect
          x="0"
          y="6"
          width="128"
          height="54"
          rx="6"
          fill="#ffffff"
          stroke="#64748b"
          stroke-width="1.5"
        />
        <text
          x="64"
          y="28"
          class="font-sans text-[13.5px] font-black fill-stone-950 tracking-wider select-none"
          text-anchor="middle"
        >
          MODEL J0411
        </text>
        <text
          x="64"
          y="49"
          class="font-mono text-[11px] font-bold fill-stone-600 select-none"
          text-anchor="middle"
        >
          No. 9520162
        </text>
      </g>

      <!-- ================= 1. OHM SCALE (Top, Red) ================= -->
      <g :opacity="activeScaleHighlight === 'ohm' ? 1 : 0.85">
        <!-- Main Arc Line in Red -->
        <path
          :d="describeArc(OHM_RADIUS, START_ANGLE - 1, END_ANGLE + 1)"
          fill="none"
          stroke="#c81e1e"
          :stroke-width="activeScaleHighlight === 'ohm' ? '2.4' : '1.8'"
        />

        <!-- Far Right Ω symbol -->
        <text
          :x="polarToCartesian(OHM_RADIUS - 4, END_ANGLE + 4).x"
          :y="polarToCartesian(OHM_RADIUS - 4, END_ANGLE + 4).y"
          class="text-[15px] font-bold font-serif fill-red-700"
          text-anchor="start"
        >
          Ω
        </text>

        <!-- Ohm Minor Ticks -->
        <template v-for="(tick, idx) in ohmMinorTicks" :key="'ohm-sub-' + idx">
          <line
            :x1="polarToCartesian(OHM_RADIUS, START_ANGLE + tick.position * SWEEP).x"
            :y1="polarToCartesian(OHM_RADIUS, START_ANGLE + tick.position * SWEEP).y"
            stroke="#dc2626"
            :x2="
              polarToCartesian(
                OHM_RADIUS + (tick.isIntegerTick ? 9 : 5),
                START_ANGLE + tick.position * SWEEP,
              ).x
            "
            :y2="
              polarToCartesian(
                OHM_RADIUS + (tick.isIntegerTick ? 9 : 5),
                START_ANGLE + tick.position * SWEEP,
              ).y
            "
            :stroke-width="tick.isIntegerTick ? '1.4' : '1'"
          />
        </template>

        <!-- Ohm Major Ticks and Numbers -->
        <template v-for="tick in ohmMajorTicks" :key="'ohm-maj-' + tick.label">
          <line
            :x1="polarToCartesian(OHM_RADIUS, START_ANGLE + tick.position * SWEEP).x"
            :y1="polarToCartesian(OHM_RADIUS, START_ANGLE + tick.position * SWEEP).y"
            :x2="
              polarToCartesian(
                OHM_RADIUS + (tick.isMid ? 11 : 9),
                START_ANGLE + tick.position * SWEEP,
              ).x
            "
            :y2="
              polarToCartesian(
                OHM_RADIUS + (tick.isMid ? 11 : 9),
                START_ANGLE + tick.position * SWEEP,
              ).y
            "
            stroke="#b91c1c"
            :stroke-width="tick.isMid ? '2' : '1.4'"
          />
          <text
            :x="polarToCartesian(OHM_RADIUS + 19, START_ANGLE + tick.position * SWEEP).x"
            :y="polarToCartesian(OHM_RADIUS + 19, START_ANGLE + tick.position * SWEEP).y"
            :class="[
              'font-sans text-[11px] select-none font-semibold fill-red-700',
              tick.isMid ? 'text-[12px] font-bold fill-red-800' : '',
            ]"
            text-anchor="middle"
            dominant-baseline="central"
          >
            {{ tick.label }}
          </text>
        </template>
      </g>

      <!-- ================= 2. LINEAR SCALE (Middle, mA.V, 50 divisions) ================= -->
      <g :opacity="activeScaleHighlight === 'linear' ? 1 : 0.85">
        <!-- Main Arc Line in Black -->
        <path
          :d="describeArc(LINEAR_RADIUS, START_ANGLE - 1, END_ANGLE + 1)"
          fill="none"
          stroke="#1c1917"
          :stroke-width="activeScaleHighlight === 'linear' ? '2.2' : '1.5'"
        />

        <!-- Right side label: mA.V -->
        <text
          :x="polarToCartesian(LINEAR_RADIUS - 8, END_ANGLE + 4).x"
          :y="polarToCartesian(LINEAR_RADIUS - 8, END_ANGLE + 4).y"
          class="text-[13px] font-bold font-sans fill-stone-900"
          text-anchor="start"
        >
          mA.V
        </text>

        <!-- Left side shared 0 -->
        <text
          :x="polarToCartesian(LINEAR_RADIUS - 18, START_ANGLE).x"
          :y="polarToCartesian(LINEAR_RADIUS - 18, START_ANGLE).y"
          class="text-[11px] font-bold font-sans fill-stone-800"
          text-anchor="middle"
          dominant-baseline="central"
        >
          0
        </text>

        <!-- Ticks -->
        <template v-for="tick in linTicks" :key="'lin-' + tick.index">
          <line
            :x1="polarToCartesian(LINEAR_RADIUS, tick.angle).x"
            :y1="polarToCartesian(LINEAR_RADIUS, tick.angle).y"
            :x2="
              polarToCartesian(
                LINEAR_RADIUS - (tick.isMajor ? 10 : tick.isMedium ? 6 : 4),
                tick.angle,
              ).x
            "
            :y2="
              polarToCartesian(
                LINEAR_RADIUS - (tick.isMajor ? 10 : tick.isMedium ? 6 : 4),
                tick.angle,
              ).y
            "
            stroke="#1c1917"
            :stroke-width="tick.isMajor ? 1.5 : tick.isMedium ? 1.1 : 0.8"
          />

          <!-- 3 Rows of Numbers for Major Ticks (except 0 which is shared on left) -->
          <template v-if="tick.isMajor && tick.index > 0">
            <!-- Row 1: 50, 100, 150, 200, 250 -->
            <text
              :x="polarToCartesian(LINEAR_RADIUS - 17, tick.angle).x"
              :y="polarToCartesian(LINEAR_RADIUS - 17, tick.angle).y"
              :class="[
                'font-sans text-[11px] select-none',
                gear.scaleType === 'linear_250'
                  ? 'fill-sky-700 font-bold'
                  : 'fill-stone-800 font-medium',
              ]"
              text-anchor="middle"
              dominant-baseline="central"
            >
              {{ tick.val250 }}
            </text>
            <!-- Row 2: 10, 20, 30, 40, 50 -->
            <text
              :x="polarToCartesian(LINEAR_RADIUS - 27, tick.angle).x"
              :y="polarToCartesian(LINEAR_RADIUS - 27, tick.angle).y"
              :class="[
                'font-sans text-[10px] select-none',
                gear.scaleType === 'linear_50'
                  ? 'fill-sky-700 font-bold'
                  : 'fill-stone-700 font-medium',
              ]"
              text-anchor="middle"
              dominant-baseline="central"
            >
              {{ tick.val50 }}
            </text>
            <!-- Row 3: 2, 4, 6, 8, 10 -->
            <text
              :x="polarToCartesian(LINEAR_RADIUS - 37, tick.angle).x"
              :y="polarToCartesian(LINEAR_RADIUS - 37, tick.angle).y"
              :class="[
                'font-sans text-[10px] select-none',
                gear.scaleType === 'linear_10'
                  ? 'fill-sky-700 font-bold'
                  : 'fill-stone-700 font-medium',
              ]"
              text-anchor="middle"
              dominant-baseline="central"
            >
              {{ tick.val10 }}
            </text>
          </template>
        </template>
      </g>

      <!-- ================= 3. AC 2.5V~ SCALE (Bottom Arc, Dedicated) ================= -->
      <g :opacity="activeScaleHighlight === 'ac2_5' ? 1 : 0.85">
        <!-- Main Arc Line -->
        <path
          :d="describeArc(AC_RADIUS, START_ANGLE - 1, END_ANGLE + 1)"
          fill="none"
          stroke="#1e293b"
          :stroke-width="activeScaleHighlight === 'ac2_5' ? '2' : '1.3'"
        />

        <!-- Left side label: 2.5V ~ -->
        <g
          :transform="`translate(${polarToCartesian(AC_RADIUS + 4, START_ANGLE - 3).x - 45}, ${polarToCartesian(AC_RADIUS + 4, START_ANGLE - 3).y - 8})`"
        >
          <!-- Curve symbol ~ -->
          <path d="M 0 6 Q 6 0 12 6 T 24 6" fill="none" stroke="#1e293b" stroke-width="1.2" />
          <text x="28" y="9" class="text-[11px] font-bold font-sans fill-stone-800">2.5V ~</text>
        </g>

        <!-- Ticks for AC 2.5V~ -->
        <template v-for="tick in acTicks" :key="'ac-' + tick.index">
          <line
            :x1="polarToCartesian(AC_RADIUS, tick.angle).x"
            :y1="polarToCartesian(AC_RADIUS, tick.angle).y"
            :x2="polarToCartesian(AC_RADIUS - (tick.isMajor ? 7 : 4), tick.angle).x"
            :y2="polarToCartesian(AC_RADIUS - (tick.isMajor ? 7 : 4), tick.angle).y"
            stroke="#334155"
            :stroke-width="tick.isMajor ? 1.4 : 0.8"
          />
        </template>

        <!-- Numbers for AC 2.5V~ -->
        <template v-for="label in acMajorLabels" :key="'ac-maj-' + label.value">
          <text
            :x="polarToCartesian(AC_RADIUS - 15, START_ANGLE + label.position * SWEEP).x"
            :y="polarToCartesian(AC_RADIUS - 15, START_ANGLE + label.position * SWEEP).y"
            :class="[
              'font-sans text-[10px] select-none',
              activeScaleHighlight === 'ac2_5'
                ? 'fill-rose-700 font-bold'
                : 'fill-stone-700 font-semibold',
            ]"
            text-anchor="middle"
            dominant-baseline="central"
          >
            {{ label.value }}
          </text>
        </template>
      </g>

      <!-- ================= MECHANICAL ZERO SCREW (Bottom Window) ================= -->
      <!-- Prominent metallic mechanical zero screw (J0411 calibration screw) -->
      <g id="mechanical-zero-screw">
        <!-- Outer bezel ring -->
        <circle cx="350" cy="386" r="18" fill="#e2e8f0" stroke="#475569" stroke-width="1.8" />
        <circle cx="350" cy="386" r="14" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.2" />
        <!-- Slotted screw groove -->
        <circle cx="350" cy="386" r="10" fill="#e2e8f0" />
        <line
          x1="339"
          y1="386"
          x2="361"
          y2="386"
          stroke="#0f172a"
          stroke-width="3"
          stroke-linecap="round"
        />
      </g>

      <!-- ================= THE NEEDLE (Red Pointer) ================= -->
      <g
        :transform="`rotate(${needleAngle} ${CENTER_X} ${CENTER_Y})`"
        filter="url(#needleGlow)"
        class="transition-transform duration-75 ease-out"
      >
        <!-- Needle counterweight tail (black, compact so it does not overlap screw) -->
        <path d="M 346.5 336 L 347.5 352 Q 350 355 352.5 352 L 353.5 336 Z" fill="#262626" />

        <!-- Long tapered red needle pointer tip -->
        <!-- Base around (348.8, 336) to (351.2, 336), tip at (350, 36) -->
        <polygon points="348.8,336 349.6,56 350,36 350.4,56 351.2,336" fill="#dc2626" />

        <!-- Center Pivot and cap -->
        <circle cx="350" cy="336" r="12" fill="#262626" stroke="#525252" stroke-width="1.5" />
        <circle cx="350" cy="336" r="5" fill="#dc2626" />
        <circle cx="350" cy="336" r="2" fill="#ffffff" />
      </g>
    </svg>
  </div>
</template>
