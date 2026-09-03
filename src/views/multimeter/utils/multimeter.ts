import type { Gear, ReadingDetail } from "../types";

export const GEARS: Gear[] = [
  // OFF
  {
    id: "off",
    category: "off",
    name: "OFF",
    label: "OFF",
    angle: 310,
    unit: "",
    scaleType: "off",
    description: "停用/关机档位（阻尼保护）",
  },

  // 直流电压 DC V
  {
    id: "dcv_2_5",
    category: "dcv",
    name: "DC 2.5V",
    label: "2.5 V",
    angle: 155,
    range: 2.5,
    unit: "V",
    scaleType: "linear_250",
    description: "直流电压 2.5V 档（读 0~250 刻度线）",
  },
  {
    id: "dcv_10",
    category: "dcv",
    name: "DC 10V",
    label: "10 V",
    angle: 180,
    range: 10,
    unit: "V",
    scaleType: "linear_10",
    description: "直流电压 10V 档（读 0~10 刻度线）",
  },
  {
    id: "dcv_50",
    category: "dcv",
    name: "DC 50V",
    label: "50 V",
    angle: 205,
    range: 50,
    unit: "V",
    scaleType: "linear_50",
    description: "直流电压 50V 档（读 0~50 刻度线）",
  },
  {
    id: "dcv_250",
    category: "dcv",
    name: "DC 250V",
    label: "250 V",
    angle: 225,
    range: 250,
    unit: "V",
    scaleType: "linear_250",
    description: "直流电压 250V 档（读 0~250 刻度线）",
  },

  // 直流电流 DC mA
  {
    id: "dcma_2_5",
    category: "dcma",
    name: "DC 2.5mA",
    label: "2.5 mA",
    angle: 252,
    range: 2.5,
    unit: "mA",
    scaleType: "linear_250",
    description: "直流电流 2.5mA 档（读 0~250 刻度线）",
  },
  {
    id: "dcma_25",
    category: "dcma",
    name: "DC 25mA",
    label: "25 mA",
    angle: 270,
    range: 25,
    unit: "mA",
    scaleType: "linear_250",
    description: "直流电流 25mA 档（读 0~250 刻度线）",
  },
  {
    id: "dcma_250",
    category: "dcma",
    name: "DC 250mA",
    label: "250 mA",
    angle: 288,
    range: 250,
    unit: "mA",
    scaleType: "linear_250",
    description: "直流电流 250mA 档（读 0~250 刻度线）",
  },

  // 欧姆档 Ohm
  {
    id: "ohm_1",
    category: "ohm",
    name: "Ω ×1",
    label: "×1",
    angle: 325,
    multiplier: 1,
    unit: "Ω",
    scaleType: "ohm",
    description: "电阻 ×1 档（读最上方欧姆刻度）",
  },
  {
    id: "ohm_10",
    category: "ohm",
    name: "Ω ×10",
    label: "×10",
    angle: 340,
    multiplier: 10,
    unit: "Ω",
    scaleType: "ohm",
    description: "电阻 ×10 档（读最上方欧姆刻度）",
  },
  {
    id: "ohm_100",
    category: "ohm",
    name: "Ω ×100",
    label: "×100",
    angle: 355,
    multiplier: 100,
    unit: "Ω",
    scaleType: "ohm",
    description: "电阻 ×100 档（读最上方欧姆刻度）",
  },
  {
    id: "ohm_1k",
    category: "ohm",
    name: "Ω ×1k",
    label: "×1k",
    angle: 10,
    multiplier: 1000,
    unit: "Ω",
    scaleType: "ohm",
    description: "电阻 ×1k 档（读最上方欧姆刻度）",
  },

  // 交流电压 AC V
  {
    id: "acv_10",
    category: "acv",
    name: "AC 10V",
    label: "10 V~",
    angle: 45,
    range: 10,
    unit: "V",
    scaleType: "ac_10",
    description: "交流电压 10V 档（读红色的专用 10V~ 刻度线）",
  },
  {
    id: "acv_50",
    category: "acv",
    name: "AC 50V",
    label: "50 V~",
    angle: 75,
    range: 50,
    unit: "V",
    scaleType: "linear_50",
    description: "交流电压 50V 档（读 0~50 刻度线）",
  },
  {
    id: "acv_250",
    category: "acv",
    name: "AC 250V",
    label: "250 V~",
    angle: 105,
    range: 250,
    unit: "V",
    scaleType: "linear_250",
    description: "交流电压 250V 档（读 0~250 刻度线）",
  },
];

export const calculateReading = (gear: Gear, deflection: number): ReadingDetail => {
  // Clamp deflection to 0..1
  const clampedU = Math.max(0, Math.min(1, deflection));

  if (gear.category === "off") {
    return {
      rawDeflection: clampedU,
      gear,
      scaleUsed: "无（OFF 档）",
      scaleReading: "—",
      calculationFormula: "表头与电路断开，处于闭路阻尼停用保护状态",
      finalValueString: "关机 (OFF)",
      unit: "",
      accuracyNote: "使用完毕后应将选择开关旋至 OFF 档或交流电压最高档",
    };
  }

  // 1. OHM SCALE
  if (gear.category === "ohm") {
    const mult = gear.multiplier ?? 1;
    if (clampedU <= 0.002) {
      return {
        rawDeflection: clampedU,
        gear,
        scaleUsed: "最上排欧姆刻度线（反向非线性）",
        scaleReading: "∞",
        calculationFormula: "指针未偏转，测量阻值无穷大（开路）",
        finalValueString: "∞",
        unit: "Ω",
        accuracyNote: "指针靠左刻度密集，误差极大；若测量应换用更大倍率档位",
      };
    }
    if (clampedU >= 0.998) {
      return {
        rawDeflection: clampedU,
        gear,
        scaleUsed: "最上排欧姆刻度线（反向非线性）",
        scaleReading: "0",
        calculationFormula: `0 × ${mult} = 0 Ω`,
        finalValueString: "0",
        unit: "Ω",
        accuracyNote: "满偏为零电阻（短接调零点）",
      };
    }

    // Standard high school multimeter Rmid = 15
    const Rmid = 15;
    const rawR = Rmid * (1 / clampedU - 1);

    // Formatting scale reading according to density
    let scaleStr: string;
    if (rawR >= 100) scaleStr = Math.round(rawR).toString();
    else if (rawR >= 20) scaleStr = (Math.round(rawR * 2) / 2).toFixed(1);
    else scaleStr = rawR.toFixed(1);

    const scaleNum = Number(scaleStr);
    const finalVal = scaleNum * mult;
    const finalStr =
      finalVal >= 1000 ? `${(finalVal / 1000).toFixed(2)} k` : `${finalVal.toFixed(1)} `;

    let accuracyNote = "";
    if (clampedU < 0.25) {
      accuracyNote =
        "指针偏转角过小（刻度过密），读数误差大，应换用【更大】倍率档位并重新欧姆调零。";
    } else if (clampedU > 0.75) {
      accuracyNote =
        "指针偏转角过大（靠近 0 刻度），读数误差大，应换用【更小】倍率档位并重新欧姆调零。";
    } else {
      accuracyNote = "指针位于中央刻度（1/3 ~ 2/3 区域）附近，测量读数最准确。";
    }

    return {
      rawDeflection: clampedU,
      gear,
      scaleUsed: "最上排欧姆刻度线（反向、左∞右0、不均匀）",
      scaleReading: scaleStr,
      calculationFormula: `读数 = 刻度指示值 (${scaleStr}) × 倍率 (${mult}) = ${finalVal >= 1000 ? `${(finalVal / 1000).toFixed(2)} kΩ` : `${finalVal.toFixed(1)} Ω`}`,
      finalValueString: finalStr,
      unit: finalVal >= 1000 ? "kΩ" : "Ω",
      accuracyNote,
    };
  }

  // 2. DC VOLTAGE & CURRENT (LINEAR SCALE)
  // Shared uniform scale has 50 small divisions.
  // Full scale is 250, 50, or 10.
  if (gear.category === "dcv" || gear.category === "dcma") {
    const range = gear.range ?? 1;
    const { unit } = gear;

    if (gear.scaleType === "linear_250") {
      // Scale 0~250
      // 50 divisions, min division = 5.
      // Estimation rule:
      // In 250V/250mA range: min division is 5, estimate to 1 (1V / 1mA).
      // In 2.5V/2.5mA range: min division is 0.05, estimate to 0.01 (1/5 division).
      // In 25mA range: min division is 0.5, estimate to 0.1.
      const val250 = clampedU * 250;
      const reading250 = Math.round(val250 * 2) / 2; // e.g. 162.5 or 162
      const reading250Str = reading250.toFixed(1);

      let realVal = 0;
      let finalStr = "";
      let formula = "";

      if (range === 250) {
        realVal = Math.round(val250);
        finalStr = realVal.toString();
        formula = `直读 0~250 刻度线：分度值为 5 ${unit}，估读到 1 ${unit}，读数为 ${finalStr} ${unit}`;
      } else if (range === 25) {
        realVal = Math.round(val250) / 10;
        finalStr = realVal.toFixed(1);
        formula = `看 0~250 刻度线读数 ${Math.round(val250)}，换算：${Math.round(val250)} ÷ 10 = ${finalStr} ${unit}`;
      } else if (range === 2.5) {
        realVal = Math.round(val250) / 100;
        finalStr = realVal.toFixed(2);
        formula = `看 0~250 刻度线读数 ${Math.round(val250)}，换算：${Math.round(val250)} ÷ 100 = ${finalStr} ${unit}（分度值 0.05${unit}，估读到百分位）`;
      }

      return {
        rawDeflection: clampedU,
        gear,
        scaleUsed: "第二排直流 0~250 刻度线（共 50 小格，每小格为 5）",
        scaleReading: reading250Str,
        calculationFormula: formula,
        finalValueString: finalStr,
        unit,
        accuracyNote: `量程为 ${range} ${unit}，视线应垂直表盘并与反光镜中像重合以消除视差。`,
      };
    }

    if (gear.scaleType === "linear_50") {
      // Scale 0~50: 50 divisions, min division = 1.
      // 1/10 estimation: estimate to 0.1
      const val50 = clampedU * 50;
      const reading50 = (Math.round(val50 * 10) / 10).toFixed(1);
      return {
        rawDeflection: clampedU,
        gear,
        scaleUsed: "第二排直流 0~50 刻度线（共 50 小格，分度值为 1）",
        scaleReading: reading50,
        calculationFormula: `直读 0~50 刻度线：每小格 1 ${unit}，按 1/10 估读法估读到 0.1 ${unit}，读数为 ${reading50} ${unit}`,
        finalValueString: reading50,
        unit,
        accuracyNote: `量程为 ${range} ${unit}，准确级通常为 2.5 级。`,
      };
    }

    if (gear.scaleType === "linear_10") {
      // Scale 0~10: 50 divisions, min division = 0.2.
      // Estimation rule: 1/5 or 1/2 estimation -> 2 decimal places (e.g. 6.42 V or 6.40 V)
      const val10 = clampedU * 10;
      const reading10 = (Math.round(val10 * 50) / 50).toFixed(2);
      return {
        rawDeflection: clampedU,
        gear,
        scaleUsed: "第二排直流 0~10 刻度线（共 50 小格，分度值为 0.2）",
        scaleReading: reading10,
        calculationFormula: `直读 0~10 刻度线：每小格 0.2 ${unit}，估读到小数点后两位，读数为 ${reading10} ${unit}`,
        finalValueString: reading10,
        unit,
        accuracyNote: `量程为 10 ${unit}，分度值 0.2 ${unit}。`,
      };
    }
  }

  // 3. AC VOLTAGE
  if (gear.category === "acv") {
    if (gear.id === "acv_10") {
      // Dedicated ~10V scale (accounting for diode non-linearity at low voltages)
      const val10 = clampedU * 10;
      const reading10 = (Math.round(val10 * 20) / 20).toFixed(2);
      return {
        rawDeflection: clampedU,
        gear,
        scaleUsed: "第三排红色专用交流 10V~ 刻度线",
        scaleReading: reading10,
        calculationFormula: `直读专用交流 10V~ 刻度线：读数为 ${reading10} V`,
        finalValueString: reading10,
        unit: "V",
        accuracyNote: "由于整流二极管正向导通特性的非线性，交流 10V 档必须读取专用刻度线。",
      };
    }

    if (gear.scaleType === "linear_50") {
      const val50 = clampedU * 50;
      const reading50 = (Math.round(val50 * 10) / 10).toFixed(1);
      return {
        rawDeflection: clampedU,
        gear,
        scaleUsed: "第二排 0~50 刻度线",
        scaleReading: reading50,
        calculationFormula: `读取 0~50 刻度线：读数为 ${reading50} V`,
        finalValueString: reading50,
        unit: "V",
        accuracyNote: "交流电压测量的是正弦交流电的有效值（RMS）。",
      };
    }

    if (gear.scaleType === "linear_250") {
      const val250 = clampedU * 250;
      const reading250 = Math.round(val250).toString();
      return {
        rawDeflection: clampedU,
        gear,
        scaleUsed: "第二排 0~250 刻度线",
        scaleReading: reading250,
        calculationFormula: `读取 0~250 刻度线：读数为 ${reading250} V`,
        finalValueString: reading250,
        unit: "V",
        accuracyNote: "交流 250V 档常用于市电测量（市电有效值约 220V）。",
      };
    }
  }

  return {
    rawDeflection: clampedU,
    gear,
    scaleUsed: "—",
    scaleReading: "—",
    calculationFormula: "—",
    finalValueString: "—",
    unit: "",
    accuracyNote: "",
  };
};
