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
    },
  },
  {
    files: ["src/router/index.ts"],
    rules: {
      "typescript/explicit-function-return-type": "off",
    },
  },
);
