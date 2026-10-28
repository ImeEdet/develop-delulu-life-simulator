import React from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import App from "../../src/App";
import { Menu } from "../../src/components/Menu";
import { Game } from "../../src/components/Game";
import { UpdateBanner } from "../../src/components/UpdateBanner";
import { setSeed } from "../../src/game/rng";
import { newRandomLife } from "../../src/game/characters";
import { hasWaitingUpdate } from "../../src/game/useAppUpdate";
import type { GameApi } from "../../src/game/state";
import { assert } from "./util";

function stubApi(overrides: Record<string, unknown> = {}): GameApi {
  setSeed(9001);
  const state = newRandomLife(0);
  const noop = () => {};
  return {
    ready: true,
    state,
    saves: [],
    startRandom: noop,
    startCustom: noop,
    ageUpAction: noop,
    resolve: noop,
    act: noop,
    cont: noop,
    dismissToast: noop,
    openSlot: async () => {},
    renameSave: async () => {},
    deleteSave: async () => {},
    exportSave: () => "{}",
    importSave: async () => ({ ok: true }),
    endLineage: noop,
    quickSave: noop,
    autosaveId: "autosave",
    ...overrides,
  } as unknown as GameApi;
}

export const tests = [
  {
    name: "App renders its loading shell without throwing",
    fn: () => {
      const html = renderToString(React.createElement(App));
      assert(html.includes("Delulu Life"), "loading copy missing");
    },
  },
  {
    name: "Menu renders the V1-style title and entry points",
    fn: () => {
      const g = stubApi();
      const html = renderToString(React.createElement(Menu, { g, onPlay: () => {} }));
      assert(html.includes("DELULU"), "brand missing");
      assert(html.includes("New Life — Random"), "random entry missing");
      assert(html.includes("New Life — Custom"), "custom entry missing");
      assert(html.includes("Saved Lives"), "save slots entry missing");
    },
  },
  {
    name: "Game renders header, stats, tabs and TURN THE PAGE",
    fn: () => {
      const g = stubApi();
      const html = renderToString(React.createElement(Game, { g, onMenu: () => {} }));
      assert(html.includes("TURN THE PAGE"), "age-up button missing");
      assert(html.includes("Family") && html.includes("Money") && html.includes("Actions"), "tabs missing");
      const p = g.state!.chars[g.state!.currentId];
      assert(html.includes(p.firstName), "character name missing from header");
    },
  },
  {
    name: "random-life flow starts the exact character shown in its preview",
    fn: () => {
      const menu = readFileSync("src/components/Menu.tsx", "utf8");
      assert(menu.includes("onBegin={(spec) => { g.startCustom(spec); onPlay(); }}"), "random preview spec is not passed into life creation");
      assert(menu.includes("onClick={() => onBegin(spec)}"), "begin button does not submit the currently displayed spec");
    },
  },
  {
    name: "service-worker update prompt shows an accessible restart button only when rendered",
    fn: () => {
      const html = renderToString(React.createElement(UpdateBanner, { updating: false, onUpdate: () => {} }));
      assert(html.includes('role="status"') && html.includes("A new Delulu Life update is ready."), "update notice missing");
      assert(html.includes("Update &amp; restart"), "restart action is not visible");
    },
  },
  {
    name: "a waiting worker is offered even before the current page has a controller",
    fn: () => {
      assert(hasWaitingUpdate({ waiting: {} as ServiceWorker }), "waiting update was hidden without a page controller");
      assert(!hasWaitingUpdate({ waiting: null }), "empty registration incorrectly shows an update");
      const hook = readFileSync("src/game/useAppUpdate.ts", "utf8");
      assert(hook.includes('window.addEventListener("pageshow", checkForUpdate)'), "page restore does not check for updates");
      assert(hook.includes('window.addEventListener("online", checkForUpdate)'), "coming online does not check for updates");
      assert(hook.includes("15 * 60 * 1000"), "update polling interval is missing or too long");
    },
  },
  {
    name: "all app icon variants share the generated mark and a refreshed cache URL",
    fn: () => {
      const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")) as { icons: { src: string }[] };
      const html = readFileSync("index.html", "utf8");
      const worker = readFileSync("public/sw.js", "utf8");
      const generator = readFileSync("scripts/make-icons.mjs", "utf8");
      const svg = readFileSync("public/icons/icon.svg", "utf8");
      assert(manifest.icons.length >= 3 && manifest.icons.every((icon) => icon.src.includes("?v=2")), "manifest icons are not pinned to the refreshed icon set");
      assert(html.includes("apple-touch-icon-180.png?v=2") && html.includes("favicon-32.png?v=2"), "browser/home-screen icon links still reference stale paths");
      assert(worker.includes("/icons/icon.svg?v=2") && worker.includes("/icons/maskable-512.png?v=2"), "service worker does not precache the refreshed icon paths");
      assert(generator.includes("const svgRects = D_GLYPH.flatMap") && generator.includes('writeFileSync(join(OUT, "icon.svg"), svgIcon)'), "icon generator does not keep SVG and PNG artwork in sync");
      assert(svg.includes('<rect x="92" y="92" width="47" height="47"/>'), "SVG app icon does not use the shared bitmap D mark");
    },
  },
  {
    name: "service worker waits for the in-app update command instead of silently replacing the session",
    fn: () => {
      const worker = readFileSync("public/sw.js", "utf8");
      assert(worker.includes('event.data?.type === "SKIP_WAITING"'), "worker does not handle the update button command");
      assert(!worker.includes("then(() => self.skipWaiting())"), "worker still applies updates without user action");
    },
  },
  {
    name: "Death screen renders summary and successor/new-life actions",
    fn: () => {
      const g = stubApi();
      const s = g.state!;
      const p = s.chars[s.currentId];
      p.alive = false;
      p.deathYear = s.worldYear;
      p.causeOfDeath = "old age, peacefully";
      s.over = true;
      s.overText = "A life fully and delusionally lived.";
      const html = renderToString(React.createElement(Game, { g, onMenu: () => {} }));
      assert(html.includes("A Life, Fully Lived"), "death title missing");
      assert(html.includes("Start a New Life"), "new life button missing");
      assert(html.includes("End This Lineage"), "end lineage button missing");
    },
  },
];
