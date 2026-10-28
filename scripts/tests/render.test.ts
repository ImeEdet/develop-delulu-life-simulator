import React from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import App from "../../src/App";
import { Menu } from "../../src/components/Menu";
import { Game } from "../../src/components/Game";
import { UpdateBanner } from "../../src/components/UpdateBanner";
import { setSeed } from "../../src/game/rng";
import { newRandomLife } from "../../src/game/characters";
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
