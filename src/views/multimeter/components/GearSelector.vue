<script setup lang="ts">
import { computed } from "vue";

import type { Gear } from "../types";
import { GEARS } from "../utils/multimeter";

const { modelValue } = defineProps<{
  modelValue: Gear;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", gear: Gear): void;
}>();

const selectGear = (gear: Gear): void => {
  emit("update:modelValue", gear);
};

const cycleNextGear = (): void => {
  const currentIndex = GEARS.findIndex((gear) => gear.id === modelValue.id);
  const nextIndex = (currentIndex + 1) % GEARS.length;
  emit("update:modelValue", GEARS[nextIndex]);
};

// Center of rotary switch in SVG coordinates
const CENTER_X = 270;
const CENTER_Y = 200;

// Polar to cartesian helper
const polar = (radius: number, angleDeg: number): { x: number; y: number } => {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER_X + radius * Math.sin(rad),
    y: CENTER_Y - radius * Math.cos(rad),
  };
};

// Arc generator helper
const describeArc = (radius: number, startAngle: number, endAngle: number): string => {
  const start = polar(radius, startAngle);
  const end = polar(radius, endAngle);
  const diff = (endAngle - startAngle + 360) % 360;
  const largeArc = diff > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
};

// Annular sector (band) generator for broken sectors
const describeSectorBand = (
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string => {
  const innerStart = polar(innerRadius, startAngle);
  const outerStart = polar(outerRadius, startAngle);
  const outerEnd = polar(outerRadius, endAngle);
  const innerEnd = polar(innerRadius, endAngle);
  const diff = (endAngle - startAngle + 360) % 360;
  const largeArc = diff > 180 ? 1 : 0;
  return `M ${innerStart.x} ${innerStart.y} L ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
};

// 4 Distinct Sectors (+ OFF) with explicit gaps ("断开一小截")
const INNER_RADIUS = 92;
const OUTER_RADIUS = 148;
const ARC_RADIUS = 152;

// 1. Ohm Sector: 322° to 38° (Red)
const ohmBand = describeSectorBand(INNER_RADIUS, OUTER_RADIUS, 322, 38);
const ohmArc = describeArc(ARC_RADIUS, 322, 38);

// 2. ACV Sector: 42° to 138° (Royal Blue)
const acvBand = describeSectorBand(INNER_RADIUS, OUTER_RADIUS, 42, 138);
const acvArc = describeArc(ARC_RADIUS, 42, 138);

// 3. DCV Sector: 142° to 238° (Emerald Green)
const dcvBand = describeSectorBand(INNER_RADIUS, OUTER_RADIUS, 142, 238);
const dcvArc = describeArc(ARC_RADIUS, 142, 238);

// 4. DCmA Sector: 242° to 298° (Warm Amber)
const dcmaBand = describeSectorBand(INNER_RADIUS, OUTER_RADIUS, 242, 298);
const dcmaArc = describeArc(ARC_RADIUS, 242, 298);

// 5. OFF Sector: 302° to 318° (Dark Slate)
const offBand = describeSectorBand(INNER_RADIUS, OUTER_RADIUS, 302, 318);
const offArc = describeArc(ARC_RADIUS, 302, 318);

// Color resolver for gears
const getGearTheme = (
  category: string,
  isSelected: boolean,
): {
  background: string;
  border: string;
  text: string;
  strokeWidth: number;
  tick: string;
} => {
  if (isSelected) {
    switch (category) {
      case "ohm": {
        return {
          background: "#dc2626",
          border: "#991b1b",
          text: "#ffffff",
          strokeWidth: 2.2,
          tick: "#dc2626",
        };
      }
      case "acv": {
        return {
          background: "#2563eb",
          border: "#1d4ed8",
          text: "#ffffff",
          strokeWidth: 2.2,
          tick: "#2563eb",
        };
      }
      case "dcv": {
        return {
          background: "#059669",
          border: "#047857",
          text: "#ffffff",
          strokeWidth: 2.2,
          tick: "#059669",
        };
      }
      case "dcma": {
        return {
          background: "#d97706",
          border: "#b45309",
          text: "#ffffff",
          strokeWidth: 2.2,
          tick: "#d97706",
        };
      }
      default: {
        return {
          background: "#374151",
          border: "#111827",
          text: "#ffffff",
          strokeWidth: 2.2,
          tick: "#475569",
        };
      }
    }
  }

  // Unselected states
  switch (category) {
    case "ohm": {
      return {
        background: "#ffffff",
        border: "#fca5a5",
        text: "#b91c1c",
        strokeWidth: 1.3,
        tick: "#f87171",
      };
    }
    case "acv": {
      return {
        background: "#ffffff",
        border: "#93c5fd",
        text: "#1d4ed8",
        strokeWidth: 1.3,
        tick: "#60a5fa",
      };
    }
    case "dcv": {
      return {
        background: "#ffffff",
        border: "#86efac",
        text: "#15803d",
        strokeWidth: 1.3,
        tick: "#4ade80",
      };
    }
    case "dcma": {
      return {
        background: "#ffffff",
        border: "#fcd34d",
        text: "#b45309",
        strokeWidth: 1.3,
        tick: "#fbbf24",
      };
    }
    default: {
      return {
        background: "#f3f4f6",
        border: "#cbd5e1",
        text: "#374151",
        strokeWidth: 1.3,
        tick: "#94a3b8",
      };
    }
  }
};

// Tick marks & labels for all 18 gears
const gearItems = computed(() =>
  GEARS.map((gear) => {
    const isSelected = gear.id === modelValue.id;
    const innerPoint = polar(64, gear.angle);
    const outerPoint = polar(78, gear.angle);
    const centerPoint = polar(120, gear.angle);
    const theme = getGearTheme(gear.category, isSelected);

    return {
      gear,
      innerPoint,
      outerPoint,
      centerPoint,
      isSelected,
      theme,
    };
  }),
);

// Knob rotation style
const knobRotationStyle = computed(() => ({
  transform: `rotate(${modelValue.angle}deg)`,
  transformOrigin: `${CENTER_X}px ${CENTER_Y}px`,
  transition: "transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1)",
}));
</script>

<template>
  <div class="relative w-full select-none bg-[#eae5d5] border-t-2 border-stone-700 shrink-0">
    <svg
      viewBox="0 0 700 395"
      class="w-full h-auto block select-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- Knob drop shadow filter -->
        <filter id="knobShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="2" dy="4" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.35" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Metallic knob body gradient -->
        <radialGradient id="knobGrad" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#44403c" />
          <stop offset="60%" stop-color="#292524" />
          <stop offset="100%" stop-color="#1c1917" />
        </radialGradient>

        <!-- Potentiometer knurling -->
        <radialGradient id="potGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#f5f5f4" />
          <stop offset="70%" stop-color="#d6d3d1" />
          <stop offset="100%" stop-color="#a8a29e" />
        </radialGradient>
      </defs>

      <!-- Panel Background with classic retro tone -->
      <rect x="0" y="0" width="700" height="395" fill="#eae5d5" />

      <!-- Inner bezel subtle border line -->
      <rect
        x="12"
        y="8"
        width="676"
        height="379"
        rx="8"
        fill="none"
        stroke="#d6d1be"
        stroke-width="1.5"
      />

      <!-- ================= 1. CIRCULAR ROTARY SWITCH SYSTEM ================= -->

      <!-- Base hub ring -->
      <circle
        :cx="CENTER_X"
        :cy="CENTER_Y"
        r="162"
        fill="#f5f2e9"
        stroke="#d5cfbe"
        stroke-width="1"
      />
      <circle
        :cx="CENTER_X"
        :cy="CENTER_Y"
        r="86"
        fill="#eae5d5"
        stroke="#d5cfbe"
        stroke-width="0.8"
      />

      <!-- ================= 4 DISTINCT SECTOR BANDS (断开的四色环) ================= -->

      <!-- 1. OHM Sector (Red, 322° to 38°) -->
      <path :d="ohmBand" fill="#fee2e2" fill-opacity="0.75" />
      <path :d="ohmArc" fill="none" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round" />
      <g :transform="`translate(${CENTER_X}, ${CENTER_Y - 170})`">
        <rect
          x="-24"
          y="-12"
          width="48"
          height="22"
          rx="5"
          fill="#dc2626"
          stroke="#991b1b"
          stroke-width="1.2"
        />
        <text
          x="0"
          y="2"
          class="text-[12px] font-black font-serif fill-white tracking-wider"
          text-anchor="middle"
          dominant-baseline="central"
        >
          Ω
        </text>
      </g>

      <!-- 2. ACV Sector (Royal Blue, 42° to 138°) -->
      <path :d="acvBand" fill="#dbeafe" fill-opacity="0.75" />
      <path :d="acvArc" fill="none" stroke="#2563eb" stroke-width="3.5" stroke-linecap="round" />
      <g :transform="`translate(${CENTER_X + 172}, ${CENTER_Y})`">
        <rect
          x="-26"
          y="-12"
          width="52"
          height="24"
          rx="5"
          fill="#2563eb"
          stroke="#1d4ed8"
          stroke-width="1.2"
        />
        <text
          x="0"
          y="2"
          class="text-[11.5px] font-black font-sans fill-white tracking-wide"
          text-anchor="middle"
          dominant-baseline="central"
        >
          V~
        </text>
      </g>

      <!-- 3. DCV Sector (Emerald Green, 142° to 238°) -->
      <path :d="dcvBand" fill="#d1fae5" fill-opacity="0.75" />
      <path :d="dcvArc" fill="none" stroke="#059669" stroke-width="3.5" stroke-linecap="round" />
      <g :transform="`translate(${CENTER_X - 15}, ${CENTER_Y + 170})`">
        <rect
          x="-26"
          y="-12"
          width="52"
          height="24"
          rx="5"
          fill="#059669"
          stroke="#047857"
          stroke-width="1.2"
        />
        <text
          x="0"
          y="2"
          class="text-[11.5px] font-black font-sans fill-white tracking-wide"
          text-anchor="middle"
          dominant-baseline="central"
        >
          V−
        </text>
      </g>

      <!-- 4. DCmA Sector (Warm Amber, 242° to 298°) -->
      <path :d="dcmaBand" fill="#fef3c7" fill-opacity="0.8" />
      <path :d="dcmaArc" fill="none" stroke="#d97706" stroke-width="3.5" stroke-linecap="round" />
      <g :transform="`translate(${CENTER_X - 172}, ${CENTER_Y})`">
        <rect
          x="-26"
          y="-12"
          width="52"
          height="24"
          rx="5"
          fill="#d97706"
          stroke="#b45309"
          stroke-width="1.2"
        />
        <text
          x="0"
          y="2"
          class="text-[11.5px] font-black font-sans fill-white tracking-wide"
          text-anchor="middle"
          dominant-baseline="central"
        >
          mA−
        </text>
      </g>

      <!-- 5. OFF Sector (Dark Slate, 302° to 318°) -->
      <path :d="offBand" fill="#e2e8f0" fill-opacity="0.8" />
      <path :d="offArc" fill="none" stroke="#475569" stroke-width="3" stroke-linecap="round" />

      <!-- ================= 18 GEAR TICKS & NON-JITTERING PILLS ================= -->
      <g v-for="item in gearItems" :key="'gear-' + item.gear.id">
        <!-- Radial line from hub to badge -->
        <line
          :x1="item.innerPoint.x"
          :y1="item.innerPoint.y"
          :x2="item.outerPoint.x"
          :y2="item.outerPoint.y"
          :stroke="item.isSelected ? item.theme.border : item.theme.tick"
          :stroke-width="item.isSelected ? 2.5 : 1.5"
          stroke-linecap="round"
        />

        <!-- Stable Gear Pill Button (NO scale transforms, NO hover twitching!) -->
        <g
          :transform="`translate(${item.centerPoint.x}, ${item.centerPoint.y})`"
          @click="selectGear(item.gear)"
          class="cursor-pointer group"
        >
          <!-- Invisible large click pad to prevent boundary loss -->
          <rect x="-25" y="-14" width="50" height="28" fill="transparent" pointer-events="all" />

          <!-- Visible Rounded Pill -->
          <rect
            x="-21"
            y="-11"
            width="42"
            height="22"
            rx="5"
            :fill="item.theme.background"
            :stroke="item.theme.border"
            :stroke-width="item.theme.strokeWidth"
            class="transition-colors group-hover:brightness-95 group-hover:stroke-stone-900"
            filter="url(#knobShadow)"
          />

          <!-- Pill Label Text -->
          <text
            x="0"
            y="1"
            :fill="item.theme.text"
            class="text-[10px] font-black font-sans select-none tracking-tight pointer-events-none"
            text-anchor="middle"
            dominant-baseline="central"
          >
            {{ item.gear.label }}
          </text>
        </g>
      </g>

      <!-- ================= CENTRAL ROTARY KNOB ================= -->
      <g
        :style="knobRotationStyle"
        filter="url(#knobShadow)"
        class="cursor-pointer"
        @click="cycleNextGear"
        role="button"
        aria-label="旋转开关旋钮"
      >
        <!-- Knob Outer Flange with ridged grip marks -->
        <circle
          :cx="CENTER_X"
          :cy="CENTER_Y"
          r="48"
          fill="#1c1917"
          stroke="#44403c"
          stroke-width="2"
        />

        <!-- Radial grip notches on knob perimeter -->
        <template v-for="n in 12" :key="'notch-' + n">
          <line
            :x1="CENTER_X + 44 * Math.sin((n * 30 * Math.PI) / 180)"
            :y1="CENTER_Y - 44 * Math.cos((n * 30 * Math.PI) / 180)"
            :x2="CENTER_X + 48 * Math.sin((n * 30 * Math.PI) / 180)"
            :y2="CENTER_Y - 48 * Math.cos((n * 30 * Math.PI) / 180)"
            stroke="#57534e"
            stroke-width="1.8"
          />
        </template>

        <!-- Main Knob Body Cylinder -->
        <circle
          :cx="CENTER_X"
          :cy="CENTER_Y"
          r="42"
          fill="url(#knobGrad)"
          stroke="#57534e"
          stroke-width="1.5"
        />
        <circle
          :cx="CENTER_X"
          :cy="CENTER_Y"
          r="36"
          fill="#292524"
          stroke="#1c1917"
          stroke-width="1"
        />

        <!-- Pointer Indicator Bar (Pure White Tip Arrow pointing to chosen gear) -->
        <polygon
          :points="`${CENTER_X - 4.5},${CENTER_Y - 16} ${CENTER_X},${CENTER_Y - 38} ${CENTER_X + 4.5},${CENTER_Y - 16}`"
          fill="#ffffff"
        />
        <line
          :x1="CENTER_X"
          :y1="CENTER_Y - 36"
          :x2="CENTER_X"
          :y2="CENTER_Y - 16"
          stroke="#ffffff"
          stroke-width="2.5"
          stroke-linecap="round"
        />

        <!-- Center Knob Cap with metallic rivet -->
        <circle
          :cx="CENTER_X"
          :cy="CENTER_Y"
          r="18"
          fill="#1c1917"
          stroke="#44403c"
          stroke-width="1.5"
        />
        <circle
          :cx="CENTER_X"
          :cy="CENTER_Y"
          r="10"
          fill="#292524"
          stroke="#57534e"
          stroke-width="1"
        />
        <circle :cx="CENTER_X" :cy="CENTER_Y" r="3" fill="#a8a29e" />
      </g>

      <!-- ================= 2. RIGHT-HAND CONTROLS & TERMINALS ================= -->

      <g transform="translate(585, 95)">
        <g transform="translate(0, -48)">
          <text
            x="0"
            y="0"
            class="text-[13px] font-black font-sans fill-stone-900 tracking-wider select-none"
            text-anchor="middle"
          >
            0Ω ADJ
          </text>
        </g>
        <!-- Outer Beveled Rim -->
        <circle
          cx="0"
          cy="0"
          r="26"
          fill="#d6d3d1"
          stroke="#a8a29e"
          stroke-width="1.5"
          filter="url(#knobShadow)"
        />
        <!-- Knurled Wheel -->
        <circle cx="0" cy="0" r="22" fill="url(#potGrad)" stroke="#78716c" stroke-width="1.2" />
        <circle
          cx="0"
          cy="0"
          r="20"
          fill="none"
          stroke="#78716c"
          stroke-width="1"
          stroke-dasharray="2, 3"
        />
        <!-- Center Knob -->
        <circle cx="0" cy="0" r="13" fill="#f5f5f4" stroke="#a8a29e" stroke-width="1" />
        <!-- Adjustment slot line -->
        <line
          x1="-7"
          y1="0"
          x2="7"
          y2="0"
          stroke="#44403c"
          stroke-width="2"
          stroke-linecap="round"
        />
      </g>

      <!-- Bottom Right: J0411 表笔接线端子箱 (Standard Red + and Black - ONLY) -->
      <g transform="translate(488, 175)">
        <!-- Bakelite dark terminal mounting block -->
        <rect
          x="0"
          y="0"
          width="194"
          height="150"
          rx="10"
          fill="#262626"
          stroke="#404040"
          stroke-width="1.8"
          filter="url(#knobShadow)"
        />

        <line x1="20" y1="32" x2="174" y2="32" stroke="#404040" stroke-width="1" />

        <!-- 1. Red Positive Terminal (+) -->
        <g transform="translate(52, 72)">
          <!-- Jack Outer Ring -->
          <circle cx="0" cy="0" r="20" fill="#1c1917" stroke="#dc2626" stroke-width="2.2" />
          <!-- Red Core -->
          <circle cx="0" cy="0" r="14" fill="#ef4444" stroke="#b91c1c" stroke-width="1.2" />
          <!-- Jack Hole -->
          <circle cx="0" cy="0" r="6" fill="#0c0a09" />
          <text
            x="0"
            y="36"
            class="text-[14px] font-black font-sans fill-red-500 select-none"
            text-anchor="middle"
          >
            +
          </text>
        </g>

        <!-- 2. Black Negative Terminal (－) -->
        <g transform="translate(142, 72)">
          <!-- Jack Outer Ring -->
          <circle cx="0" cy="0" r="20" fill="#1c1917" stroke="#78716c" stroke-width="2.2" />
          <!-- Black/Slate Core -->
          <circle cx="0" cy="0" r="14" fill="#44403c" stroke="#292524" stroke-width="1.2" />
          <!-- Jack Hole -->
          <circle cx="0" cy="0" r="6" fill="#0c0a09" />
          <text
            x="0"
            y="36"
            class="text-[14px] font-black font-sans fill-stone-200 select-none"
            text-anchor="middle"
          >
            −
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>
