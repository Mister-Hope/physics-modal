export type GearCategory = "ohm" | "dcv" | "dcma" | "acv" | "off";

export interface Gear {
  id: string;
  category: GearCategory;
  name: string;
  label: string;
  angle: number;
  multiplier?: number; // For ohm (e.g. 1, 10, 100, 1000)
  range?: number; // For V and mA (e.g. 2.5, 10, 50, 250)
  unit: string;
  scaleType: "ohm" | "linear_250" | "linear_50" | "linear_10" | "ac_10" | "off";
  description: string;
}

export interface ReadingDetail {
  rawDeflection: number; // 0 to 1
  gear: Gear;
  scaleUsed: string;
  scaleReading: string;
  calculationFormula: string;
  finalValueString: string;
  unit: string;
  accuracyNote: string;
}
