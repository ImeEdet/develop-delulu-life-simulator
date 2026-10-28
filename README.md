# Delulu Life — V2

**Reality is overrated. Live a little.**

Delulu Life is a text-based, generational life simulator. Simple controls,
complex lives: you live one year at a time, make choices when life asks, and
watch an entire world — family, friends, careers, economies — keep turning.

This repository is the **V2 upgrade** of the original V1 game: the same dark
dusk theme, serif typography, orange-to-pink buttons, witty microcopy and
**TURN THE PAGE** rhythm, with the simulation underneath rebuilt for
consistency, depth and reliable saving.

---

## What changed in V2

### Stability first
- **Reliable life-cycle state machine.** A dead character can never be aged
  again; death fires exactly once, records cause + year, and locks ordinary
  actions. "Start a New Life" really starts a brand-new life in its own save.
- **Save system rebuilt.** IndexedDB-backed slots (localStorage/in-memory
  fallbacks), autosave after every meaningful change, multiple independent
  lives, rename, delete with confirmation, JSON export, validated import,
  versioned schema (`schema: 2`) and automatic migration of V1 saves.
- **Gender-safe naming engine.** A dedicated, data-driven module
  (`src/game/names.ts` + `src/game/name-data.ts`) organizes names by country,
  cultural group and conventional gender, with genuinely unisex pools,
  surname inheritance, anti-repetition weighting, gendered surname traditions
  (e.g. Singh/Kaur-style pools) and East-Asian family-name-first conventions.
  Nigeria covers Yoruba, Igbo, Hausa/Fulani, Edo, Ibibio/Efik and
  English-Nigerian traditions — no single surname can dominate.

### Simulation depth
- **Coherent economy.** Personal cash is separated from household wealth.
  Children receive age/tier-scaled allowances while parents cover household
  costs; adults have income, living costs, scholarships, family tuition
  support, and real **loans** (student/mortgage/personal) that track
  principal, compound interest and repayments. All figures run on a
  documented modern-USD scale with **era scaling** back to 1940.
- **Era-sensitive world.** Births from 1940–2010 see period-correct salaries,
  prices and technology (smartphones, social media and crypto events only
  fire in their real eras).
- **Country-specific education pathways.** School start, secondary start,
  exam age, degree length and retirement age all vary by country, and NPCs
  progress through them autonomously.
- **Real NPC autonomy.** Every NPC ages, attends school, sits exams, goes to
  university, takes jobs, wins promotions, faces unemployment, dates, marries,
  divorces, has children, relocates, emigrates (rarely, for distant NPCs),
  retires and dies — with incest/ex/under-age guards and permanent deaths.
- **Expanded careers.** Trades, public-sector and freelance roles join the
  original professional ladder, with country/seniority/era-adjusted pay.
- **Richer life stages.** New baby and toddler events (first steps, first
  words, crawling, the "no" phase, preschool art) alongside the preserved V1
  childhood, teen, adult and senior libraries.
- **Migration & languages.** In-country moves, emigration, an 8-year
  naturalization clock, heritage-language exposure at home, and one shared
  proficiency scale (beginner → basic → conversant → fluent → fully fluent)
  used identically by milestones and the profile screen.
- **Bigger Custom Life.** Name + optional surname, gender, country, cultural
  group, city, birth year (1940–2010), five household tiers from
  disadvantaged to elite, optional traits, and optional validated
  parent/sibling details — with per-field dice and full randomization always
  available.

### Polish & deployment
- Installable **PWA**: web manifest, service worker with offline app-shell
  caching (build-stamped cache versions), PNG + SVG icons, apple-touch icon,
  safe-area insets for notched phones, mobile-first responsive layout.
- Dependency-free automated tests (47 cases) including seeded 100-year
  simulations across every country, a four-generation save/reload family-saga
  test (family tree, deceased relatives, surnames, finances and relationships
  verified across persistence), React SSR render checks, and the original
  headless smoke test.
- Repository cleaned: `node_modules/` untracked, proper `.gitignore`.

---

## Tech stack

React 19 · TypeScript (strict) · Vite 7 · Tailwind CSS 4 · no runtime
dependencies beyond React. All game logic lives in framework-free TypeScript
modules under `src/game`, so the entire simulation runs in Node tests.

## Getting started

```bash
npm install
npm run dev        # local dev server (http://localhost:5173)
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check then produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run the full engine + persistence + render test suite |
| `npm run typecheck` | Strict TypeScript check only |
| `npm run icons` | Regenerate PWA PNG icons from the zero-dependency generator |

The production build inlines the JS/CSS into a single `index.html`
(`vite-plugin-singlefile`) while `manifest.webmanifest`, `sw.js` and icons
remain separate static assets so the PWA can install and work offline.

## Save-system behavior

- Every age-up, choice and action autosaves into the life's own slot.
- Lives never overwrite each other; creating a life always allocates a new
  slot. Closing/refreshing the browser and reopening restores the latest
  slot automatically, and all slots are listed under **Saved Lives**.
- Exports are versioned JSON envelopes
  (`{ app: "delulu-life", schema: 2, state, exportedAt }`). Imports are
  validated and migrated; corrupt data is rejected rather than loaded, and a
  single corrupt slot can never break the slot list.
- V1 localStorage saves (`delulu-life-save-v1`) are migrated into a slot the
  first time V2 loads.

## PWA / offline notes

- The service worker (`public/sw.js`) precaches the app shell and uses
  stale-while-revalidate for navigations. Its cache name is stamped with a
  build id, so every deploy activates a fresh cache automatically.
- iPhone: open in Safari → **Share → Add to Home Screen**.
- Android: install prompt appears in supporting browsers once the app has
  been visited over HTTPS.
- Game saves live in IndexedDB, which remains available offline.

## Project map

```
src/
  game/
    name-data.ts      cultural name datasets (countries -> groups)
    names.ts          naming engine: gender rules, inheritance, de-dup
    rng.ts            seeded, repeatable randomness
    era.ts            era inflation factors + technology timeline
    economy.ts        allowances, living costs, loans, tuition, net worth
    world.ts          countries, languages, currencies, education pathways
    content.ts        traits, jobs, majors, actions, proficiency scale
    characters.ts     life creation, NPC factories, family relationships
    simulate.ts       age-up engine, NPC autonomy, life-cycle state machine
    events.ts         the choice-event library (era-gated)
    actions.ts        player actions
    persistence/      IndexedDB driver + save slots, validation, migration
  components/         UI (visual identity preserved from V1)
scripts/
  smoke.ts            original headless long-life smoke test
  tests/              V2 test suite (run via npm test)
  make-icons.mjs      PNG icon generator (Node built-ins only)
```

## Known limitations

- Immigration is deliberately abstract (simplified residency/citizenship
  clocks), not a model of any real country's law.
- Gender is binary in the character model; unisex names and custom typed
  names are supported, but a non-binary identity option is not yet modeled.
- Same-sex couples can date and marry but biological conception requires a
  female partner; adoption remains available to everyone.
- The event library is era-gated for the clearest anachronisms (phones,
  social media, crypto) rather than exhaustively period-specific.
- Tests run in Node with server-rendered component smoke checks; there is no
  browser-automation suite in this repository.

## Deploying to Vercel

1. Import the GitHub repository in Vercel.
2. Framework preset: **Vite**. Build command `npm run build`, output
   directory `dist` (these are the defaults).
3. No environment variables are required — core gameplay uses no API and no
   paid service.
4. Deploy. The single-file app, service worker and icons are all static
   assets; ensure the project is served over HTTPS (Vercel default) so the
   PWA can install.
