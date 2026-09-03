<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

import Copyright from "@/components/Copyright.vue";
import NavBar from "@/components/NavBar.vue";

import MicrometerMagnifier from "./components/MicrometerMagnifier.vue";
import { Micrometer3D } from "./Micrometer3D";
import {
  calculateMicrometerReading,
  micrometerSamples,
  type MicrometerSample,
} from "./micrometerPhysics";

const canvas = ref<HTMLElement>();
const reading = ref(6.842);
const locked = ref(false);
const zeroError = ref(0);
const preset = ref<"overview" | "closeup" | "anvil" | "top">("closeup");
const sampleId = ref("");
const hidden = ref(false);
const showMagnifier = ref(false);
const showTheory = ref(false);
let model: Micrometer3D | undefined;

const breakdown = computed(() => calculateMicrometerReading(reading.value));
const corrected = computed(() => (reading.value - zeroError.value).toFixed(3));

function setReading(value: number) {
  if (locked.value) return;
  reading.value = Math.max(0, Math.min(25, Number(value.toFixed(3))));
  model?.setReading(reading.value, false);
}

function adjust(delta: number) {
  setReading(reading.value + delta);
}

function selectSample(sample: MicrometerSample | undefined) {
  sampleId.value = sample?.id ?? "";
  model?.setSampleObject(sample ? { ...sample } : null);
  if (sample) {
    setReading(sample.sizeMm);
    preset.value = "anvil";
    model?.setViewPreset("anvil");
  }
}

function selectPreset(value: typeof preset.value) {
  preset.value = value;
  model?.setViewPreset(value);
}

function toggleLock() {
  locked.value = !locked.value;
  model?.setLocked(locked.value);
}

onMounted(async () => {
  await nextTick();
  if (!canvas.value) return;
  model = new Micrometer3D(canvas.value, (value) => {
    reading.value = Number(value.toFixed(3));
  });
  model.setReading(reading.value, false);
  model.setViewPreset(preset.value);
});

onBeforeUnmount(() => {
  model?.destroy();
  model = undefined;
});
</script>

<template>
  <div class="micrometer-page">
    <NavBar title="螺旋测微器" gradient />
    <main class="micrometer-main">
      <section class="viewport-panel">
        <div ref="canvas" class="three-canvas" />
        <div class="viewport-tools">
          <button class="tool-button" @click="hidden = !hidden">
            <Icon :icon="hidden ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" />
            {{ hidden ? "显示读数" : "隐藏读数" }}
          </button>
          <button
            class="tool-button"
            :class="{ active: showMagnifier }"
            @click="showMagnifier = !showMagnifier"
          >
            <Icon
              :icon="showMagnifier ? 'mdi:magnify-minus-outline' : 'mdi:magnify-plus-outline'"
            />
            {{ showMagnifier ? "收起放大镜" : "展开放大镜" }}
          </button>
          <button class="tool-button" @click="showTheory = true">
            <Icon icon="mdi:book-open-outline" /> 原理
          </button>
        </div>
        <MicrometerMagnifier
          v-if="showMagnifier"
          class="magnifier"
          :reading="breakdown"
          :zero-error="zeroError"
          :hidden="hidden"
        />
      </section>

      <aside class="control-panel">
        <section class="reading-card">
          <div class="eyebrow">当前测量读数</div>
          <div :class="['reading-value', { masked: hidden }]">
            {{ hidden ? "?.???" : breakdown.formatted }} <small>mm</small>
          </div>
          <div class="formula">
            L = {{ breakdown.sleeveTotalMm.toFixed(1) }} + {{ breakdown.thimbleMm.toFixed(3) }} mm
          </div>
          <div class="corrected" v-if="zeroError">零误差修正：{{ corrected }} mm</div>
        </section>

        <section class="panel-section">
          <label class="section-label">调节读数 <span>0–25 mm</span></label>
          <input
            :value="reading"
            type="range"
            min="0"
            max="25"
            step="0.001"
            :disabled="locked"
            @input="setReading(Number(($event.target as HTMLInputElement).value))"
          />
          <div class="step-grid">
            <button @click="adjust(-1)" :disabled="locked">−1</button
            ><button @click="adjust(1)" :disabled="locked">+1</button>
            <button @click="adjust(-0.01)" :disabled="locked">−0.01</button
            ><button @click="adjust(0.01)" :disabled="locked">+0.01</button>
            <button @click="adjust(-0.001)" :disabled="locked">−0.001</button
            ><button @click="adjust(0.001)" :disabled="locked">+0.001</button>
          </div>
        </section>

        <section class="panel-section two-columns">
          <div>
            <label class="section-label">视角</label
            ><select
              :value="preset"
              @change="selectPreset(($event.target as HTMLSelectElement).value as typeof preset)"
            >
              <option value="overview">全貌</option>
              <option value="closeup">读数特写</option>
              <option value="anvil">测砧间隙</option>
              <option value="top">俯视</option>
            </select>
          </div>
          <div>
            <label class="section-label">零误差</label
            ><select v-model.number="zeroError">
              <option :value="0">0.000 mm</option>
              <option :value="0.015">+0.015 mm</option>
              <option :value="-0.018">−0.018 mm</option>
            </select>
          </div>
        </section>

        <section class="panel-section">
          <label class="section-label">被测物体</label
          ><select
            :value="sampleId"
            @change="
              selectSample(
                micrometerSamples.find(
                  (item) => item.id === ($event.target as HTMLSelectElement).value,
                ),
              )
            "
          >
            <option value="">无</option>
            <option v-for="item in micrometerSamples" :key="item.id" :value="item.id">
              {{ item.name }} · {{ item.sizeMm.toFixed(3) }} mm
            </option>
          </select>
        </section>
        <button :class="['lock-button', { active: locked }]" @click="toggleLock">
          <Icon :icon="locked ? 'mdi:lock' : 'mdi:lock-open-outline'" />{{
            locked ? "解锁测微螺杆" : "锁紧测微螺杆"
          }}
        </button>
      </aside>
    </main>
    <Copyright />

    <div v-if="showTheory" class="modal-backdrop" @click.self="showTheory = false">
      <section class="theory-modal">
        <button class="close-button" @click="showTheory = false">×</button>
        <h2>螺旋测微器读数原理</h2>
        <div class="theory-grid">
          <strong>螺距</strong><span>0.5 mm</span><strong>微分筒</strong><span>50 等分</span
          ><strong>分度值</strong><span>0.01 mm</span>
        </div>
        <p>
          读数由固定套管上露出的整毫米、半毫米刻度与微分筒读数相加得到，并按要求估读到 0.001 mm。
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.micrometer-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #020617;
  color: #e2e8f0;
}
.micrometer-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.viewport-panel {
  position: relative;
  flex: 1;
  min-height: 360px;
  overflow: hidden;
  background: radial-gradient(circle at 50% 45%, #172033, #050811 72%);
}
.three-canvas {
  position: absolute;
  inset: 0;
}
.viewport-tools {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
}
.tool-button,
.step-grid button,
select {
  border: 1px solid #334155;
  border-radius: 8px;
  background: #0f172acc;
  color: #cbd5e1;
  padding: 8px 10px;
  cursor: pointer;
}
.tool-button {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tool-button.active {
  border-color: #0891b2;
  color: #a5f3fc;
  background: #083344dd;
}
.scale-card,
.reading-card,
.panel-section {
  border: 1px solid #1e293b;
  border-radius: 12px;
  background: #0f172af0;
}
.magnifier {
  position: absolute;
  bottom: 16px;
  left: 16px;
  width: min(430px, calc(100% - 32px));
}
.eyebrow,
.section-label {
  color: #94a3b8;
  font-size: 12px;
}
.control-panel {
  width: 100%;
  padding: 14px;
  overflow-y: auto;
  background: #020617;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.reading-card,
.panel-section {
  padding: 14px;
}
.reading-value {
  margin: 5px 0;
  color: #f8fafc;
  font:
    700 38px/1.1 ui-monospace,
    monospace;
}
.reading-value small {
  color: #94a3b8;
  font-size: 16px;
}
.masked {
  filter: blur(7px);
}
.formula,
.corrected {
  color: #67e8f9;
  font-size: 12px;
}
.corrected {
  margin-top: 6px;
  color: #fbbf24;
}
.section-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
input[type="range"] {
  width: 100%;
  accent-color: #22d3ee;
}
.step-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-top: 10px;
}
.step-grid button:disabled,
.lock-button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
select {
  width: 100%;
}
.lock-button {
  border: 1px solid #be123c;
  border-radius: 8px;
  padding: 10px;
  color: #fda4af;
  background: #4c0519;
  cursor: pointer;
  display: flex;
  justify-content: center;
  gap: 8px;
}
.lock-button.active {
  background: #881337;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #0009;
}
.theory-modal {
  position: relative;
  width: min(520px, 100%);
  padding: 24px;
  border: 1px solid #334155;
  border-radius: 16px;
  background: #0f172a;
  box-shadow: 0 20px 70px #0008;
}
.theory-modal h2 {
  margin: 0 0 18px;
  color: #67e8f9;
}
.theory-modal p {
  color: #cbd5e1;
  line-height: 1.8;
}
.theory-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  background: #020617;
}
.theory-grid span {
  color: #67e8f9;
}
.close-button {
  position: absolute;
  top: 8px;
  right: 12px;
  border: 0;
  background: transparent;
  color: #94a3b8;
  font-size: 28px;
  cursor: pointer;
}
@media (min-width: 1024px) {
  .micrometer-main {
    flex-direction: row;
  }
  .control-panel {
    width: 400px;
  }
  .viewport-panel {
    min-height: 0;
  }
}
</style>
