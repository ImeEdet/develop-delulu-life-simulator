import { useState } from "react";
import type { CustomSpec, Gender } from "../game/types";
import { COUNTRY_LIST, LANGS } from "../game/world";
import { TRAIT_LIST } from "../game/content";
import { buildRandomSpec, genName, ri } from "../game/characters";
import type { GameApi } from "../game/state";
import { Chip, DiceBtn, I, SectionTitle } from "./ui";

const TIER_CARDS = [
  { t: "Modest", d: "Tight budget, loud kitchen, generous table." },
  { t: "Comfortable", d: "The bills are met. Summers are long." },
  { t: "Well-off", d: "Two cars, one lake house, a family crest nobody asks about." },
  { t: "Wealthy", d: "The name is on the bank. The bank is nervous." },
];

export function Menu({ g, onPlay }: { g: GameApi; onPlay: () => void }) {
  const [screen, setScreen] = useState<"menu" | "random" | "custom" | "howto">("menu");
  const s = g.state;

  return (
    <div className="relative min-h-screen bg-dusk flex flex-col">
      <div className="stars" />
      <main className="relative z-10 flex-1 w-full max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {screen === "menu" && (
          <div className="anim-rise">
            <div className="text-center mt-6 sm:mt-14 mb-10">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-peach mb-3">a text life simulator</p>
              <h1 className="font-display font-black text-6xl sm:text-7xl leading-none text-txt">
                DELULU
                <span className="block text-pink">LIFE</span>
              </h1>
              <p className="mt-4 text-dim text-lg font-semibold">Reality is overrated. Live a little.</p>
              <p className="mt-1 text-dim/70 text-sm">Simple controls. Complex lives.</p>
            </div>
            <div className="grid gap-3 max-w-md mx-auto">
              {s && (
                <button className="btn-primary rounded-xl px-5 py-4 flex items-center justify-between" onClick={onPlay}>
                  <span className="flex items-center gap-2">
                    <I name="feather" className="w-5 h-5" />
                    Continue — {s.chars[s.currentId].firstName}, age {s.chars[s.currentId].age}
                  </span>
                  <I name="chevr" className="w-4 h-4" />
                </button>
              )}
              <button className="btn-ghost rounded-xl px-5 py-4 flex items-center justify-between" onClick={() => setScreen("random")}>
                <span className="flex items-center gap-2 font-bold">
                  <I name="dice" className="w-5 h-5 text-peach" />
                  New Life — Random
                </span>
                <I name="chevr" className="w-4 h-4" />
              </button>
              <button className="btn-ghost rounded-xl px-5 py-4 flex items-center justify-between" onClick={() => setScreen("custom")}>
                <span className="flex items-center gap-2 font-bold">
                  <I name="users" className="w-5 h-5 text-pink" />
                  New Life — Custom
                </span>
                <I name="chevr" className="w-4 h-4" />
              </button>
              <button className="btn-ghost rounded-xl px-5 py-3 flex items-center justify-between" onClick={() => setScreen("howto")}>
                <span className="flex items-center gap-2 font-bold">
                  <I name="book" className="w-5 h-5 text-mint" />
                  How to Play
                </span>
                <I name="chevr" className="w-4 h-4" />
              </button>
              {s && (
                <button
                  className="text-dim/70 hover:text-coral text-xs font-bold py-2 transition-colors"
                  onClick={() => {
                    g.startRandom();
                    onPlay();
                  }}
                >
                  Abandon this life &amp; roll a new one
                </button>
              )}
            </div>
            <p className="text-center text-dim/60 text-xs mt-10">
              {s ? `Generation ${s.generation} · ${s.worldYear}` : ""} {s ? "· " : ""}Lives lived: {s?.livesLived ?? 0}
            </p>
          </div>
        )}

        {screen === "random" && <RandomFlow g={g} onBack={() => setScreen("menu")} onBegin={() => { g.startRandom(); onPlay(); }} />}

        {screen === "custom" && (
          <CustomFlow
            g={g}
            onBack={() => setScreen("menu")}
            onBegin={(spec) => {
              g.startCustom(spec);
              onPlay();
            }}
          />
        )}

        {screen === "howto" && (
          <div className="anim-rise panel p-6 max-w-xl mx-auto">
            <h2 className="font-display font-bold text-2xl mb-4 text-peach">How to Play</h2>
            <ul className="space-y-3 text-[15px] text-txt/90 leading-relaxed">
              <li className="flex gap-3"><I name="pulse" className="w-5 h-5 text-mint shrink-0 mt-0.5" /> You live one year at a time. Press <b>Turn the Page</b> to age up; the world ages with you — parents, siblings, friends, all of it.</li>
              <li className="flex gap-3"><I name="spark" className="w-5 h-5 text-pink shrink-0 mt-0.5" /> When life asks a question, answer it before the next year. Choices change your stats, your money, and your people.</li>
              <li className="flex gap-3"><I name="briefcase" className="w-5 h-5 text-lav shrink-0 mt-0.5" /> School at 6, exams at 17, the crossroads at 18. Education and skills shape which jobs can hire you.</li>
              <li className="flex gap-3"><I name="globe" className="w-5 h-5 text-peach shrink-0 mt-0.5" /> Languages are real. Move abroad, and you'll need the local tongue for work and friends — or learn it first.</li>
              <li className="flex gap-3"><I name="skull" className="w-5 h-5 text-coral shrink-0 mt-0.5" /> Lives end. If children survive, you can pick one up and play the next generation, with the whole family and its money intact.</li>
            </ul>
            <button className="btn-ghost rounded-xl px-5 py-3 w-full mt-6 font-bold" onClick={() => setScreen("menu")}>
              Back
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function RandomFlow({ g, onBack, onBegin }: { g: GameApi; onBack: () => void; onBegin: () => void }) {
  void g;
  const [spec, setSpec] = useState<CustomSpec>(() => buildRandomSpec());
  const c = COUNTRY_LIST.find((x) => x.id === spec.countryId)!;
  return (
    <div className="anim-rise max-w-xl mx-auto">
      <h2 className="font-display font-bold text-3xl mb-1">The Dice Have Spoken</h2>
      <p className="text-dim text-sm mb-5">A whole life, pre-rolled. Roll again if fate disappoints you.</p>
      <div className="panel p-5 space-y-4">
        <div>
          <p className="font-display font-bold text-2xl text-peach">{spec.firstName}</p>
          <p className="text-dim text-sm">
            {spec.gender === "male" ? "Boy" : "Girl"} · {c.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {spec.traits.map((t) => (
            <Chip key={t}>{TRAIT_LIST.find((x) => x.id === t)?.name}</Chip>
          ))}
          <Chip color="gold">{TIER_CARDS[spec.wealthTier].t} household</Chip>
        </div>
        <div className="text-sm text-txt/85 space-y-1">
          {spec.mother && (
            <p>
              Mother: <b>{spec.mother.firstName}</b>, {spec.mother.alive ? `${spec.mother.age}` : "not in the picture"}
              {spec.father && spec.parentStatus === "together" ? ` · with ${spec.father.firstName}, ${spec.father.age}` : ""}
            </p>
          )}
          {spec.siblings.length > 0 ? (
            <p>
              Siblings: {spec.siblings.map((x) => `${x.firstName} (${x.age})`).join(", ")}
            </p>
          ) : (
            <p>An only child. The fridge is entirely theirs.</p>
          )}
          <p className="text-dim italic">{c.blurb}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button className="btn-ghost rounded-xl px-5 py-3.5 font-bold" onClick={onBack}>
          Back
        </button>
        <button className="btn-ghost rounded-xl px-5 py-3.5 font-bold" onClick={() => setSpec(buildRandomSpec())}>
          Roll Again
        </button>
      </div>
      <button className="btn-primary rounded-xl px-5 py-4 w-full mt-3 font-bold text-lg" onClick={onBegin}>
        Begin This Life
      </button>
    </div>
  );
}

function CustomFlow({ g, onBack, onBegin }: { g: GameApi; onBack: () => void; onBegin: (spec: CustomSpec) => void }) {
  void g;
  const [step, setStep] = useState(0);
  const [spec, setSpec] = useState<CustomSpec>(() => buildRandomSpec());
  const [customizeFamily, setCustomizeFamily] = useState(false);
  const set = (patch: Partial<CustomSpec>) => setSpec((s) => ({ ...s, ...patch }));
  const c = COUNTRY_LIST.find((x) => x.id === spec.countryId)!;

  const randomizeAll = () => setSpec((s) => ({ ...buildRandomSpec(), firstName: s.firstName || undefined, gender: s.gender, countryId: s.countryId, traits: s.traits, wealthTier: s.wealthTier } as CustomSpec));

  return (
    <div className="anim-rise max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-3xl">Design a Life</h2>
        <button className="text-dim text-xs font-bold hover:text-txt" onClick={onBack}>
          Cancel
        </button>
      </div>
      <div className="flex gap-1.5 mb-5">
        {["Basics", "Country", "Family", "Household", "Review"].map((t, i) => (
          <button
            key={t}
            onClick={() => setStep(i)}
            className={`flex-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide py-1.5 rounded-full border transition-colors ${
              i === step ? "bg-peach text-ink border-peach" : i < step ? "bg-ink3 text-peach border-line" : "bg-ink text-dim/60 border-line"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="panel p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-dim">Name</label>
              <DiceBtn onClick={() => set({ firstName: genName(c.culture, spec.gender) })} />
            </div>
            <input
              type="text"
              value={spec.firstName}
              maxLength={20}
              onChange={(e) => set({ firstName: e.target.value })}
              className="w-full bg-ink border border-line rounded-lg px-3 py-2.5 text-lg font-bold focus:border-peach"
              placeholder="A name the world will learn"
            />
          </div>
          <div>
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-dim block mb-1">Gender</label>
            <div className="grid grid-cols-2 gap-2">
              {(["female", "male"] as Gender[]).map((gd) => (
                <button
                  key={gd}
                  onClick={() => set({ gender: gd })}
                  className={`rounded-lg px-4 py-2.5 font-bold border transition-colors ${
                    spec.gender === gd ? "bg-pink text-ink border-pink" : "bg-ink border-line text-dim hover:border-pink/50"
                  }`}
                >
                  {gd === "female" ? "Female" : "Male"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="panel p-5">
          <SectionTitle icon="globe">Birthplace</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {COUNTRY_LIST.map((ct) => (
              <button
                key={ct.id}
                onClick={() => set({ countryId: ct.id })}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  spec.countryId === ct.id ? "border-peach bg-peach/10" : "border-line bg-ink hover:border-peach/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex w-3.5 h-3.5 rounded-full overflow-hidden ring-1 ring-white/20 shrink-0">
                    <span className="w-1/2 h-full" style={{ background: ct.colors[0] }} />
                    <span className="w-1/2 h-full" style={{ background: ct.colors[1] }} />
                  </span>
                  <span className="font-bold text-sm truncate">{ct.name}</span>
                </div>
                <p className="text-[11px] text-dim mt-1">{ct.languages.map((l) => LANGS[l].name).join(" · ")}</p>
                <p className="text-[10px] text-dim/70 mt-0.5">
                  Wages ×{ct.wageIndex} · Costs ×{ct.costIndex}
                </p>
              </button>
            ))}
          </div>
          <p className="text-dim text-xs italic mt-3">{c.blurb}</p>
        </div>
      )}

      {step === 2 && (
        <div className="panel p-5 space-y-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={customizeFamily} onChange={(e) => setCustomizeFamily(e.target.checked)} className="w-4 h-4 accent-[#ff5fa2]" />
            <span className="font-bold text-sm">Design the family (otherwise: surprise me)</span>
          </label>
          {customizeFamily && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: "mother" as const, label: "Mother" },
                  { key: "father" as const, label: "Father" },
                ].map(({ key, label }) => {
                  const par = spec[key] ?? { firstName: "", age: 30, alive: true };
                  const upd = (patch: Partial<typeof par>) =>
                    set({ [key]: { ...(spec[key] ?? par), ...patch } } as Partial<CustomSpec>);
                  return (
                    <div key={key} className="panel-inset p-3 space-y-2">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-dim flex items-center justify-between">
                        {label}
                        <DiceBtn small onClick={() => upd({ firstName: genName(c.culture, key === "mother" ? "female" : "male"), age: key === "mother" ? ri(24, 45) : ri(26, 48) })} />
                      </p>
                      <input
                        type="text"
                        value={par.firstName}
                        maxLength={20}
                        onChange={(e) => upd({ firstName: e.target.value })}
                        className="w-full bg-ink border border-line rounded-md px-2.5 py-1.5 text-sm font-bold focus:border-peach"
                        placeholder={label}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={par.age}
                          min={18}
                          max={80}
                          onChange={(e) => upd({ age: Math.max(18, Math.min(80, Number(e.target.value) || 18)) })}
                          className="w-20 bg-ink border border-line rounded-md px-2.5 py-1.5 text-sm font-bold focus:border-peach"
                        />
                        <span className="text-dim text-xs">years old</span>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-bold text-dim cursor-pointer">
                        <input type="checkbox" checked={par.alive} onChange={(e) => upd({ alive: e.target.checked })} className="accent-[#5ce8a9]" />
                        Alive at your birth
                      </label>
                    </div>
                  );
                })}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-dim">Siblings</p>
                  <DiceBtn
                    small
                    onClick={() =>
                      set({
                        siblings: Array.from({ length: ri(0, 3) }, () => ({
                          firstName: genName(c.culture, Math.random() < 0.5 ? "male" : "female"),
                          gender: (Math.random() < 0.5 ? "male" : "female") as Gender,
                          age: ri(1, 18),
                        })),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  {spec.siblings.map((sib, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={sib.firstName}
                        maxLength={18}
                        onChange={(e) => {
                          const arr = [...spec.siblings];
                          arr[i] = { ...sib, firstName: e.target.value };
                          set({ siblings: arr });
                        }}
                        className="flex-1 bg-ink border border-line rounded-md px-2.5 py-1.5 text-sm font-bold focus:border-peach"
                        placeholder="Name"
                      />
                      <input
                        type="number"
                        value={sib.age}
                        min={0}
                        max={45}
                        onChange={(e) => {
                          const arr = [...spec.siblings];
                          arr[i] = { ...sib, age: Math.max(0, Math.min(45, Number(e.target.value) || 0)) };
                          set({ siblings: arr });
                        }}
                        className="w-16 bg-ink border border-line rounded-md px-2.5 py-1.5 text-sm font-bold focus:border-peach"
                      />
                      <button
                        className="text-dim hover:text-pink text-xs font-bold px-1"
                        onClick={() => {
                          const arr = [...spec.siblings];
                          arr[i] = { ...sib, gender: sib.gender === "male" ? "female" : "male", firstName: genName(c.culture, sib.gender === "male" ? "female" : "male") };
                          set({ siblings: arr });
                        }}
                        title="Flip gender"
                      >
                        {sib.gender === "male" ? "M" : "F"}
                      </button>
                      <button
                        className="text-dim hover:text-coral"
                        onClick={() => set({ siblings: spec.siblings.filter((_, j) => j !== i) })}
                        title="Remove"
                      >
                        <I name="x" className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {spec.siblings.length < 4 && (
                    <button
                      className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                      onClick={() =>
                        set({ siblings: [...spec.siblings, { firstName: genName(c.culture, "female"), gender: "female", age: ri(1, 14) }] })
                      }
                    >
                      <I name="plus" className="w-3.5 h-3.5" /> Add sibling
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="panel p-5 space-y-5">
          <div>
            <SectionTitle icon="wallet">Household Wealth</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {TIER_CARDS.map((t, i) => (
                <button
                  key={t.t}
                  onClick={() => set({ wealthTier: i })}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    spec.wealthTier === i ? "border-gold bg-gold/10" : "border-line bg-ink hover:border-gold/40"
                  }`}
                >
                  <p className="font-bold text-sm text-gold">{t.t}</p>
                  <p className="text-[11px] text-dim mt-0.5">{t.d}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <SectionTitle icon="spark">Personality (pick two)</SectionTitle>
              <DiceBtn
                small
                onClick={() => {
                  const a = TRAIT_LIST[ri(0, TRAIT_LIST.length - 1)].id;
                  let b = TRAIT_LIST[ri(0, TRAIT_LIST.length - 1)].id;
                  while (b === a) b = TRAIT_LIST[ri(0, TRAIT_LIST.length - 1)].id;
                  set({ traits: [a, b] });
                }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TRAIT_LIST.map((t) => {
                const on = spec.traits.includes(t.id);
                return (
                  <button
                    key={t.id}
                    title={t.desc}
                    onClick={() => {
                      const has = spec.traits.includes(t.id);
                      if (has) set({ traits: spec.traits.filter((x) => x !== t.id) });
                      else if (spec.traits.length < 2) set({ traits: [...spec.traits, t.id] });
                      else set({ traits: [spec.traits[1], t.id] });
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                      on ? "border-pink bg-pink/20 text-pink" : "border-line bg-ink text-dim hover:border-pink/40"
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
          <button className="text-dim text-xs font-bold hover:text-peach" onClick={randomizeAll}>
            Randomize everything (except name, gender, country, traits, wealth)
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="panel p-5">
          <SectionTitle icon="feather">The Whole Story So Far</SectionTitle>
          <p className="font-display font-bold text-3xl text-peach">{spec.firstName || "…"}</p>
          <p className="text-dim text-sm mb-3">
            {spec.gender === "female" ? "Girl" : "Boy"} · {c.name}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {spec.traits.map((t) => (
              <Chip key={t}>{TRAIT_LIST.find((x) => x.id === t)?.name}</Chip>
            ))}
            <Chip color="gold">{TIER_CARDS[spec.wealthTier].t} household</Chip>
            <Chip color="mint">{c.languages.map((l) => LANGS[l].name).join(" + ")}</Chip>
          </div>
          <div className="text-sm text-txt/85 space-y-1">
            {customizeFamily ? (
              <>
                {spec.mother && (
                  <p>
                    Mother: <b>{spec.mother.firstName || "…"}</b>, {spec.mother.alive ? spec.mother.age : "absent"}
                  </p>
                )}
                {spec.father && (
                  <p>
                    Father: <b>{spec.father.firstName || "…"}</b>, {spec.father.alive ? spec.father.age : "absent"}
                  </p>
                )}
                <p>{spec.siblings.length > 0 ? `Siblings: ${spec.siblings.map((x) => x.firstName || "…").join(", ")}` : "Only child."}</p>
              </>
            ) : (
              <p className="text-dim italic">Family: the dice decide. You'll meet them at birth.</p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button className="btn-ghost rounded-xl px-5 py-3 font-bold" disabled={step === 0} onClick={() => setStep((x) => x - 1)}>
          Back
        </button>
        {step < 4 ? (
          <button className="btn-primary rounded-xl px-6 py-3 font-bold flex-1" onClick={() => setStep((x) => x + 1)}>
            Next
          </button>
        ) : (
          <button
            className="btn-primary rounded-xl px-6 py-3 font-bold flex-1 text-lg"
            onClick={() => {
              let finalSpec: CustomSpec = spec;
              if (!customizeFamily) {
                const r = buildRandomSpec();
                finalSpec = { ...spec, mother: r.mother, father: r.father, siblings: r.siblings, parentStatus: r.parentStatus };
              }
              onBegin(finalSpec);
            }}
          >
            Begin This Life
          </button>
        )}
      </div>
    </div>
  );
}
