import { defineHopeConfig } from "oxc-config-hope/oxlint";

export default defineHopeConfig({
  node: true,
  rules: {
    complexity: "off",
    "max-depth": "off",
    "max-lines-per-function": "off",
    "max-statements": "off",
  },
});
