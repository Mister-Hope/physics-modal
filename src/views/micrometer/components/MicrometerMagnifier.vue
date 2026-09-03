<script setup lang="ts">
import { computed } from "vue";

import type { MicrometerReading } from "../micrometerPhysics";

const { reading, hidden = false } = defineProps<{
  reading: MicrometerReading;
  hidden?: boolean;
}>();
const width = 320;
const height = 160;
const datumY = height / 2;
const edgeX = 180;
const pxPerMm = 38;
const pxPerGrid = 7;
const startMm = computed(() => Math.max(0, Math.floor(reading.rawMm) - 2));
const endMm = computed(() => Math.min(25, startMm.value + 6));
const visibleGridStart = computed(() => Math.floor(reading.thimbleGrids - 8));
const visibleGridEnd = computed(() => Math.ceil(reading.thimbleGrids + 8));
const getX = (millimeters: number): number => edgeX - (reading.rawMm - millimeters) * pxPerMm;
const gridMarks = computed(() =>
  Array.from(
    { length: visibleGridEnd.value - visibleGridStart.value + 1 },
    (_, i) => visibleGridStart.value + i,
  ),
);
const sleeveMarks = computed(() =>
  Array.from({ length: endMm.value - startMm.value + 1 }, (_, i) => startMm.value + i),
);
</script>

<template>
  <div class="magnifier-panel">
    <div class="magnifier-heading">
      <span class="live-dot" /> <strong>微距刻度投影放大镜</strong
      ><span class="zoom-badge">基准对准线 ×10 放大</span>
    </div>
    <div class="magnifier-stage">
      <svg :viewBox="`0 0 ${width} ${height}`" aria-label="千分尺刻度放大图">
        <defs>
          <linearGradient id="micrometer-sleeve-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#cbd5e1" />
            <stop offset=".5" stop-color="#fff" />
            <stop offset="1" stop-color="#94a3b8" />
          </linearGradient>
          <linearGradient id="micrometer-thimble-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#e2e8f0" />
            <stop offset=".5" stop-color="#fff" />
            <stop offset="1" stop-color="#64748b" />
          </linearGradient>
          <pattern id="micrometer-knurl-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 6L6 0M0 0L6 6" stroke="#64748b" stroke-width=".8" opacity=".45" />
          </pattern>
        </defs>
        <rect x="0" y="20" :width="edgeX" height="120" fill="url(#micrometer-sleeve-gradient)" />
        <line
          x1="0"
          :y1="datumY"
          :x2="edgeX"
          :y2="datumY"
          stroke="#090d16"
          stroke-width="3"
          stroke-linecap="round"
        />
        <g v-for="mm in sleeveMarks" :key="`sleeve-${mm}`">
          <line
            v-if="getX(mm) >= -10 && getX(mm) <= edgeX + 2"
            :x1="getX(mm)"
            :y1="datumY"
            :x2="getX(mm)"
            :y2="datumY - (mm % 5 === 0 ? 28 : 18)"
            stroke="#090d16"
            :stroke-width="mm % 5 === 0 ? 2.5 : 1.8"
          />
          <text
            v-if="getX(mm) >= -10 && getX(mm) <= edgeX + 2"
            :x="getX(mm)"
            :y="datumY - (mm % 5 === 0 ? 32 : 22)"
            text-anchor="middle"
            fill="#090d16"
            :font-size="mm % 5 === 0 ? 12 : 10"
            font-weight="600"
          >
            {{ mm }}
          </text>
          <line
            v-if="getX(mm + 0.5) > 0 && getX(mm + 0.5) <= edgeX"
            :x1="getX(mm + 0.5)"
            :y1="datumY"
            :x2="getX(mm + 0.5)"
            :y2="datumY + 18"
            stroke="#090d16"
            stroke-width="1.8"
          />
        </g>
        <path
          :d="`M ${edgeX} 20 L ${edgeX + 16} 12 L ${width} 12 L ${width} 148 L ${edgeX + 16} 148 L ${edgeX} 140 Z`"
          fill="url(#micrometer-thimble-gradient)"
          stroke="#475569"
        />
        <rect
          :x="edgeX + 75"
          y="12"
          :width="width - edgeX - 75"
          height="136"
          fill="url(#micrometer-knurl-pattern)"
        />
        <g v-for="rawGrid in gridMarks" :key="`grid-${rawGrid}`">
          <line
            v-if="
              datumY + (reading.thimbleGrids - rawGrid) * pxPerGrid >= 16 &&
              datumY + (reading.thimbleGrids - rawGrid) * pxPerGrid <= 144
            "
            :x1="edgeX"
            :y1="datumY + (reading.thimbleGrids - rawGrid) * pxPerGrid"
            :x2="edgeX + (rawGrid % 5 === 0 ? 32 : 18)"
            :y2="datumY + (reading.thimbleGrids - rawGrid) * pxPerGrid"
            stroke="#090d16"
            :stroke-width="rawGrid % 5 === 0 ? 2.2 : 1.5"
          />
          <text
            v-if="
              rawGrid % 5 === 0 &&
              datumY + (reading.thimbleGrids - rawGrid) * pxPerGrid >= 16 &&
              datumY + (reading.thimbleGrids - rawGrid) * pxPerGrid <= 144
            "
            :x="edgeX + 38"
            :y="datumY + (reading.thimbleGrids - rawGrid) * pxPerGrid + 4"
            fill="#090d16"
            font-size="11"
            font-weight="bold"
          >
            {{ ((rawGrid % 50) + 50) % 50 }}
          </text>
        </g>
        <line
          :x1="edgeX - 25"
          :y1="datumY"
          :x2="edgeX + 45"
          :y2="datumY"
          stroke="#ef4444"
          stroke-width="1.5"
          stroke-dasharray="3 2"
        />
        <circle :cx="edgeX" :cy="datumY" r="2.5" fill="#ef4444" />
        <text x="12" y="36" fill="#334155" font-size="9" font-weight="bold">整毫米 (上)</text>
        <text x="12" y="132" fill="#334155" font-size="9" font-weight="bold">半毫米 (下)</text>
      </svg>
      <span class="alignment">对准基准线：{{ reading.thimbleGrids.toFixed(1) }} 格</span>
    </div>
    <div class="breakdown-grid">
      <div>
        <small>固定刻度</small><b v-if="!hidden">{{ reading.sleeveTotalMm.toFixed(1) }} mm</b
        ><span v-else>第 {{ Math.floor(reading.rawMm) }} 个固定刻度后</span
        ><em>{{ reading.sleeveTotalMm % 1 ? "半刻度露出" : "半刻度未露" }}</em>
      </div>
      <div>
        <small>可动刻度（微分筒）</small><b>{{ reading.thimbleGrids.toFixed(1) }} 格</b
        ><span v-if="!hidden">× 0.01 = {{ reading.thimbleMm.toFixed(3) }} mm</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.magnifier-panel {
  padding: 28px;
  border: 1px solid #334155cc;
  border-radius: 12px;
  color: #e2e8f0;
  background: #0f172ae8;
  backdrop-filter: blur(10px);
  box-shadow: 0 15px 35px #0008;
}
.magnifier-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  font-size: 22px;
}
.live-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #22d3ee;
  box-shadow: 0 0 10px #22d3ee;
}
.zoom-badge {
  margin-left: auto;
  padding: 6px 12px;
  border: 1px solid #155e75;
  border-radius: 5px;
  color: #67e8f9;
  background: #08334499;
  font:
    20px ui-monospace,
    monospace;
}
.magnifier-stage {
  position: relative;
  overflow: hidden;
  border: 1px solid #1e293b;
  border-radius: 16px;
  background: #020617;
}
.magnifier-stage svg {
  display: block;
  width: 100%;
  height: 352px;
}
.alignment {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 12px;
  border: 1px solid #854d0e;
  border-radius: 4px;
  color: #fbbf24;
  background: #451a03dd;
  font:
    20px ui-monospace,
    monospace;
}
.breakdown-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 20px;
}
.breakdown-grid > div {
  min-height: 108px;
  padding: 18px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #1e293dcc;
  font-size: 22px;
}
.breakdown-grid small {
  display: block;
  margin-bottom: 8px;
  color: #94a3b8;
}
.breakdown-grid b {
  display: block;
  color: #f8fafc;
  font:
    600 26px ui-monospace,
    monospace;
}
.breakdown-grid span,
.breakdown-grid em {
  color: #67e8f9;
  font-style: normal;
}
.breakdown-grid em {
  display: block;
  color: #34d399;
  font-size: 20px;
}
.zero-note {
  margin-top: 8px;
  padding: 5px 8px;
  color: #fcd34d;
  background: #451a0366;
  border: 1px solid #854d0e;
  border-radius: 5px;
  font-size: 10px;
}
.zero-note span {
  float: right;
  color: #6ee7b7;
}
</style>
