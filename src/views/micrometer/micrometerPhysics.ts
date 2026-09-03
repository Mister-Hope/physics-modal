export interface MicrometerReading {
  rawMm: number;
  sleeveTotalMm: number;
  thimbleGrids: number;
  thimbleMm: number;
  formatted: string;
}

export function calculateMicrometerReading(value: number): MicrometerReading {
  const rawMm = Math.max(0, Math.min(25, value));
  const sleeveMainMm = Math.floor(rawMm);
  const remainder = rawMm - sleeveMainMm;
  const half = remainder >= 0.5 ? 0.5 : 0;
  const sleeveTotalMm = sleeveMainMm + half;
  const thimbleMm = remainder - half;
  const thimbleGrids = Number((thimbleMm / 0.01).toFixed(1));
  return {
    rawMm,
    sleeveTotalMm,
    thimbleGrids,
    thimbleMm,
    formatted: rawMm.toFixed(3),
  };
}

export interface MicrometerSample {
  id: string;
  name: string;
  sizeMm: number;
  color: string;
  type: "wire" | "box" | "sphere";
}

export type ViewPreset = "overview" | "closeup" | "anvil" | "top";

export interface SampleObject extends MicrometerSample {
  nameEn?: string;
  description?: string;
}

export const micrometerSamples: MicrometerSample[] = [
  { id: "wire", name: "漆包铜导线", sizeMm: 0.65, color: "#d97706", type: "wire" },
  { id: "slide", name: "载玻片厚度", sizeMm: 1.28, color: "#38bdf8", type: "box" },
  { id: "ball", name: "轴承小钢球", sizeMm: 5.245, color: "#94a3b8", type: "sphere" },
  { id: "hair", name: "头发丝直径", sizeMm: 0.075, color: "#475569", type: "wire" },
  { id: "block", name: "10 mm 量块", sizeMm: 10, color: "#e2e8f0", type: "box" },
];

class SoundEffects {
  private context: AudioContext | null = null;
  private lastClick = 0;

  playRatchetClick() {
    if (performance.now() - this.lastClick < 35) return;
    this.lastClick = performance.now();
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    this.context ??= new AudioContextClass();
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(2600, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, this.context.currentTime + 0.015);
    gain.gain.setValueAtTime(0.06, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 0.015);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.015);
  }
}

export const soundManager = new SoundEffects();
