import { useState } from "react";
import type { GameState } from "../game/types";
import { COUNTRY_LIST, LANGS, LANG_LIST, country, fmtMoney } from "../game/world";
import { ACTIONS, TRAIT_LIST } from "../game/content";
import { actionLock } from "../game/actions";
import type { GameApi } from "../game/state";
import { Chip, CountryTag, I, LangBar, Modal, Portrait, SectionTitle } from "./ui";

export function ActionsScreen({ s, g }: { s: GameState; g: GameApi }) {
  const p = s.chars[s.currentId];
  const [picker, setPicker] = useState<null | "lang" | "country">(null);
  const groups = ["Everyday", "Money", "Relationships", "Bigger Moves"];

  return (
    <div className="space-y-6 pb-6">
      <p className="text-xs text-dim -mt-2">
        Each move can be used once per year. Then the page turns.
      </p>
      {groups.map((grp) => {
        const acts = ACTIONS.filter((a) => a.group === grp);
        if (acts.length === 0) return null;
        return (
          <section key={grp}>
            <SectionTitle icon="spark">{grp}</SectionTitle>
            <div className="grid sm:grid-cols-2 gap-2">
              {acts.map((a) => {
                const lock = actionLock(s, a.id);
                const used = p.usedActions.includes(a.id);
                const openPicker = a.opt ? a.opt.kind : null;
                return (
                  <button
                    key={a.id}
                    className="panel-inset p-3 text-left hover:border-peach/50 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
                    disabled={!!lock}
                    onClick={() => (openPicker ? setPicker(openPicker as "lang" | "country") : g.act(a.id))}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-bold text-sm">
                        <span className="text-peach">
                          <I name={a.icon} className="w-4 h-4" />
                        </span>
                        {a.name}
                      </span>
                      {a.opt && (
                        <Chip color="peach">{a.opt.label}</Chip>
                      )}
                    </div>
                    <p className="text-[11px] text-dim mt-1 leading-snug">
                      {used ? "Done this year." : lock ?? a.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {picker === "lang" && (
        <Modal onClose={() => setPicker(null)}>
          <h3 className="font-display font-bold text-xl mb-1">Learn a Language</h3>
          <p className="text-xs text-dim mb-4">One course per year. 50+ makes you conversant — doors open at that line.</p>
          <div className="space-y-1.5">
            {LANG_LIST.map((l) => {
              const v = p.languages[l.id] ?? 0;
              const here = v >= 95;
              return (
                <button
                  key={l.id}
                  className="w-full panel-inset p-2.5 flex items-center justify-between hover:border-peach/50 transition-colors disabled:opacity-40"
                  disabled={here || !!actionLock(s, "learn")}
                  onClick={() => {
                    g.act("learn", l.id);
                    setPicker(null);
                  }}
                >
                  <span className="font-bold text-sm">{l.name}</span>
                  <span className="text-xs text-dim tabular-nums">
                    {here ? "fully yours" : `${Math.round(v)}/100`}
                  </span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {picker === "country" && (
        <Modal onClose={() => setPicker(null)} wide>
          <h3 className="font-display font-bold text-xl mb-1">Move Abroad</h3>
          <p className="text-xs text-dim mb-4">
            Costs $12K. Your partner and children move with you. If you don't speak the local language, life gets a season harder.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {COUNTRY_LIST.filter((c) => c.id !== p.countryId).map((c) => {
              const fluent = (p.languages[c.languages[0]] ?? 0) >= 50;
              return (
                <button
                  key={c.id}
                  className="panel-inset p-3 text-left hover:border-peach/50 transition-colors"
                  onClick={() => {
                    g.act("emigrate", c.id);
                    setPicker(null);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex w-3.5 h-3.5 rounded-full overflow-hidden ring-1 ring-white/20 shrink-0">
                      <span className="w-1/2 h-full" style={{ background: c.colors[0] }} />
                      <span className="w-1/2 h-full" style={{ background: c.colors[1] }} />
                    </span>
                    <span className="font-bold text-sm">{c.name}</span>
                  </div>
                  <p className="text-[11px] text-dim mt-1">
                    {c.languages.map((l) => LANGS[l].name).join(" · ")} · wages ×{c.wageIndex}
                  </p>
                  <Chip color={fluent ? "mint" : "coral"}>{fluent ? "you speak the language" : "language barrier"}</Chip>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  married: { label: "Married", color: "pink" },
  divorced: { label: "Divorced", color: "coral" },
  immigrant: { label: "Immigrant", color: "peach" },
  "old-money": { label: "Old Money", color: "gold" },
  pet: { label: "Pet Parent", color: "mint" },
  band: { label: "Band Member", color: "lav" },
  adopted: { label: "Adopted", color: "mint" },
  "first-job": { label: "Working Adult", color: "lav" },
  sixfig: { label: "Six Figures", color: "gold" },
  "half-retire": { label: "Half-Time", color: "dim" },
};

export function ProfileScreen({ s }: { s: GameState }) {
  const p = s.chars[s.currentId];
  const net = p.money - p.debts + (p.house?.value ?? 0) + (p.car?.value ?? 0);
  const flags = p.flags.filter((f) => FLAG_LABELS[f]);
  const skills = Object.entries(p.skills).filter(([, v]) => v > 0);
  return (
    <div className="space-y-6 pb-6">
      <section className="panel p-5 flex gap-4 items-center">
        <Portrait c={p} size={72} />
        <div className="min-w-0">
          <p className="font-display font-bold text-2xl truncate">{p.firstName} {p.lastName}</p>
          <p className="text-sm text-dim flex items-center gap-2 flex-wrap">
            Age {p.age} · {p.city}, {country(p.countryId).name}
          </p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <CountryTag id={p.countryId} />
            <Chip color="dim">Generation {s.generation}</Chip>
            <Chip color="dim">{p.gender === "female" ? "she/her" : "he/him"}</Chip>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { l: "Age", v: String(p.age), c: "text-txt" },
          { l: "Net worth", v: fmtMoney(net, p.countryId), c: net >= 0 ? "text-mint" : "text-coral" },
          { l: "Children", v: String(p.childrenIds.length), c: "text-pink" },
          { l: "Friends", v: String(p.friends.length), c: "text-lav" },
        ].map((x) => (
          <div key={x.l} className="panel-inset p-2.5 text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-dim">{x.l}</p>
            <p className={`text-lg font-extrabold ${x.c}`}>{x.v}</p>
          </div>
        ))}
      </section>

      <section>
        <SectionTitle icon="spark">Personality</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {p.traits.map((t) => {
            const d = TRAIT_LIST.find((x) => x.id === t);
            return d ? (
              <Chip key={t} color="pink" title={d.desc}>
                {d.name}
              </Chip>
            ) : null;
          })}
          {flags.map((f) => (
            <Chip key={f} color={FLAG_LABELS[f].color}>
              {FLAG_LABELS[f].label}
            </Chip>
          ))}
        </div>
        {p.traits.map((t) => {
          const d = TRAIT_LIST.find((x) => x.id === t);
          return d ? (
            <p key={t} className="text-xs text-dim mt-1.5">
              <b className="text-pink">{d.name}:</b> {d.desc}
            </p>
          ) : null;
        })}
      </section>

      <section>
        <SectionTitle icon="globe">Languages</SectionTitle>
        <div className="panel-inset p-3 space-y-2">
          {Object.entries(p.languages).length === 0 && <p className="text-dim text-sm">Silent so far.</p>}
          {Object.entries(p.languages)
            .sort((a, b) => b[1] - a[1])
            .map(([id, v]) => (
              <LangBar key={id} name={LANGS[id]?.name ?? id} value={v} />
            ))}
        </div>
      </section>

      {skills.length > 0 && (
        <section>
          <SectionTitle icon="star">Skills</SectionTitle>
          <div className="panel-inset p-3 space-y-2">
            {skills.map(([k, v]) => (
              <LangBar key={k} name={k === "music" ? "Music" : k === "sports" ? "Sports" : k} value={v} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle icon="flag">Milestones</SectionTitle>
        {p.milestones.length === 0 ? (
          <p className="text-dim text-sm">The big moments haven't happened yet. Keep turning pages.</p>
        ) : (
          <div className="space-y-1.5">
            {[...p.milestones].reverse().map((m, i) => (
              <div key={i} className="panel-inset px-3 py-2 flex items-center gap-3">
                <span className="text-[11px] font-extrabold text-peach tabular-nums shrink-0">
                  {m.year}
                </span>
                <span className="text-sm">{m.text}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
