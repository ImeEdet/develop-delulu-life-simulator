import path from "path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "url";
import type { Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// A new build identifier makes the menu's full version string change on each deployment.
const BUILD_ID = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").replace(/\.(\d{3})Z$/, ".$1Z");

/** Stamp the service worker cache name with the same build id shown in the menu. */
function serviceWorkerBuildStamp(): Plugin {
  return {
    name: "delulu-sw-stamp",
    apply: "build",
    generateBundle() {
      const id = path.resolve(__dirname, "public/sw.js");
      const source = readFileSync(id, "utf-8");
      const stamped = source.replace("{{BUILD}}", BUILD_ID);
      this.emitFile({ type: "asset", fileName: "sw.js", source: stamped });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), serviceWorkerBuildStamp()],
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
  },
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
