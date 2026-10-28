/**
 * Delulu Life V2 — dependency-free test runner.
 * Bundles each TypeScript/TSX test module with esbuild (handles TSX,
 * path aliases and ESM) into a temp ESM file, then executes it.
 */
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const modules = [
  "./tests/naming.test.ts",
  "./tests/util.ts",
  "./tests/lifecycle.test.ts",
  "./tests/economy.test.ts",
  "./tests/npc.test.ts",
  "./tests/persistence.test.ts",
  "./tests/generations.test.ts",
  "./tests/longlife.test.ts",
  "./tests/render.test.ts",
  "./tests/social.test.ts",
];

// Keep bundles inside the project so externally-resolved node_modules work.
const dir = mkdtempSync(join(root, ".test-tmp-"));
let passed = 0;
let failed = 0;
const failures = [];

for (const m of modules.filter((x) => x.endsWith(".test.ts"))) {
  const entry = join(here, m);
  const outfile = join(dir, m.replace(/[\\/]/g, "__") + ".mjs");
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile,
    logLevel: "silent",
    packages: "external", // let Node resolve react/react-dom natively
    alias: { "@": join(root, "src") },
  });
  const mod = await import(pathToFileURL(outfile).href);
  const cases = mod.tests ?? [];
  console.log(`\n${m}`);
  for (const t of cases) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✔ ${t.name}`);
    } catch (e) {
      failed++;
      failures.push({ name: `${m} :: ${t.name}`, error: e });
      console.log(`  ✘ ${t.name}\n      ${e.message}`);
    }
  }
}

rmSync(dir, { recursive: true, force: true });

console.log(`\n${"=".repeat(60)}`);
console.log(`${passed} passed, ${failed} failed`);
if (failures.length) {
  for (const f of failures) console.log(`FAILED: ${f.name}\n  ${f.error.stack ?? f.error.message}`);
  process.exit(1);
}
