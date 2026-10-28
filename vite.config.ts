import path from "path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "url";
import type { Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Stamp the service worker cache name with a build id so deploys invalidate it. */
function serviceWorkerBuildStamp(): Plugin {
  return {
    name: "delulu-sw-stamp",
    apply: "build",
    generateBundle() {
      const id = path.resolve(__dirname, "public/sw.js");
      const source = readFileSync(id, "utf-8");
      const stamped = source.replace("{{BUILD}}", String(Date.now()));
      this.emitFile({ type: "asset", fileName: "sw.js", source: stamped });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), serviceWorkerBuildStamp()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
