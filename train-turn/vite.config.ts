/* eslint-disable @typescript-eslint/naming-convention */
import { createRequire } from "node:module";
import path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, normalizePath } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const require = createRequire(import.meta.url);
const mathjaxDir = path.dirname(require.resolve("mathjax/package.json"));

export default defineConfig({
  base: "",
  server: {
    host: "0.0.0.0",
    open: true,
  },
  preview: {
    open: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(path.join(mathjaxDir, "*")),
          dest: "lib/mathjax",
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      "/lib/mathjax": mathjaxDir,
    },
  },
});
