import { defineHopeConfig } from "oxc-config-hope/oxlint";

export default defineHopeConfig(
  {
    vue: true,
    node: true,
    rules: {
      complexity: "off",
      "max-depth": "off",
      "max-lines-per-function": "off",
      "max-statements": "off",
      "id-length": [
        "warn",
        {
          min: 3,
          exceptions: [
            // default
            "a",
            "b",
            "i",
            "j",
            "k",
            "x",
            "y",
            "z",
            "T",
            "_",

            // 单词
            "id", // identifier
            "el", // element

            // 尺寸
            "w", // 宽度 width
            "h", // 高度 height
            "sm", // small size
            "md", // medium size
            "lg", // large size

            // 颜色分量
            "r", // 红色 red
            "g", // 绿色 green
            "b", // 蓝色 blue

            // 物理量
            "r", // 半径 radius
            "v", // 速度 velocity
            "vx", // x 方向速度 velocity x
            "vy", // y 方向速度 velocity y
            "vz", // z 方向速度 velocity z
            "nx", // 法线 x normal x
            "ny", // 法线 y normal y
            "nz", // 法线 z normal z
            "k1", // RK4 系数
            "k2",
            "k3",
            "k4",
            "E", // 电场强度 electric field
            "dt", // 时间微元 (delta time)
            "ix", // 网格索引 x
            "iy", // 网格索引 y
            "iz", // 网格索引 z
            "e", // 电子 electron
          ],
          exceptionPatterns: [
            String.raw`^x\d$`, // x0, x1, x2, ...
            String.raw`^y\d$`, // y0, y1, y2, ...
            String.raw`^z\d$`, // z0, z1, z2, ...
            String.raw`^r\d`, // r0, r1, r2, ...
            String.raw`^v\d$`, // v0, v1, v2, ...
          ],
        },
      ],
    },
  },
  {
    files: ["src/router/index.ts"],
    rules: {
      "typescript/explicit-function-return-type": "off",
    },
  },
  {
    files: ["src/views/**/*.vue"],
    rules: {
      // allow long vue components
      "max-lines": "off",
    },
  },
  {
    files: ["**/*.vue"],
    rules: {
      "import/unambiguous": "off",
    },
  },
);
