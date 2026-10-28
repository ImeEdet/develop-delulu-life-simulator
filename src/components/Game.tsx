import { useState } from "react";
import { country, fmtMoney } from "../game/world";
import { JOBS, SENIORITY, TRAIT_LIST } from "../game/content";
import { eligibleSuccessors } from "../game/simulate";
import { netWorth } from "../game/economy";
import type { GameApi } from "../game/state";
import { Chip, CountryTag, I, Modal, Portrait, StatBar } from "./ui";
import { Journal } from "./Journal";
import { FamilyScreen, MoneyScreen, WorkScreen } from "./Screens";
import { ActionsScreen, ProfileScreen } from "./Screens2";
import { NpcProfile } from "./NpcProfile";
import { SkillsScreen, SportsScreen, FameScreen } from "./Screens3";
import { isGoldTheme } from "../game/fame";
import { SuperScreen } from "./Screens4";

const TABS = [
  { id: "life", label: "Life", icon: "feather" },
  { id: "family", label: "Family", icon: "users" },
  { id: "work", label: "Work", icon: "briefcase" },
  { id: "money", label: "Money", icon: "coin" },
  { id: "actions", label: "Actions", icon: "spark" },
  { id: "skills", label: "Skills", icon: "bulb" },
  { id: "sports", label: "Sports", icon: "pulse" },
  { id: "fame", label: "Fame", icon: "star" },
  { id: "you", label: "You", icon: "star" },
];

export function Game({ g, onMenu }: { g: GameApi; onMenu: () => void }) {
  const s = g.state!;
  const p = s.chars[s.currentId];
  const [tab, setTab] = useState("life");
  const [npcId, setNpcId] = useState<string | null>(null);
  const c = country(p.countryId);
  const pending = s.pending[0];
  const preference = s.themePreference ?? "auto";
  const superTheme = preference === "super" || (preference === "auto" && s.worldType === "superlife");
  const goldTheme = !superTheme && isGoldTheme(p, preference);
  const tabs = s.worldType === "superlife" ? [...TABS.slice(0, 5), { id: "super", label: "Super", icon: "spark" }, ...TABS.slice(5)] : TABS;

  return (
    <div className={`relative min-h-screen bg-dusk ${superTheme ? "theme-super" : goldTheme ? "theme-gold" : ""}`}>
      <div className="stars" />
      <div className="relative z-10 max-w-2xl mx-auto px-3 sm:px-4 pb-28">
        {/* Header */}
        <header className="pt-4 pb-3 flex items-center gap-3 safe-top">
          <Portrait c={p} size={46} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-lg leading-tight truncate">{p.firstName} {p.lastName}</h1>
              {p.alive && <span className="text-[11px] font-extrabold text-dim shrink-0">age {p.age}</span>}
            </div>
            <p className="text-xs text-dim flex items-center gap-1.5 truncate">
              <CountryTag id={p.countryId} />
              {p.city}, {c.name}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className={`font-display font-bold text-lg tabular-nums ${p.money < 0 ? "text-coral" : "text-gold"}`}>
              {fmtMoney(p.money, p.countryId)}
            </p>
            <Chip color="dim">Gen {s.generation} · {s.worldYear}</Chip>
          </div>
          <button onClick={onMenu} className="btn-ghost rounded-lg p-2 shrink-0" title="Back to menu (progress saved)">
            <I name="menu" className="w-4 h-4" />
          </button>
        </header>

        {/* Stats */}
        <div className="panel px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatBar icon="pulse" label="Health" value={p.health} color="#5ce8a9" />
          <StatBar icon="heart" label="Happiness" value={p.happiness} color="#ff5fa2" />
          <StatBar icon="bulb" label="Smarts" value={p.smarts} color="#ffd166" />
          <StatBar icon="star" label="Looks" value={p.looks} color="#a78bfa" />
        </div>

        {/* Status ribbon */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {p.uni && <Chip color="lav">university · yr {p.uni.year}/4</Chip>}
          {p.job && <Chip color="lav">{SENIORITY[p.job.seniority]}{JOBS[p.job.jobId]?.title}</Chip>}
          {p.retired && <Chip color="peach">retired</Chip>}
          {p.flags.includes("married") && <Chip color="pink">married</Chip>}
          {p.childrenIds.length > 0 && <Chip color="mint">{p.childrenIds.length} {p.childrenIds.length === 1 ? "child" : "children"}</Chip>}
          {p.flags.includes("immigrant") && <Chip color="peach">immigrant</Chip>}
        </div>

        {/* Tabs */}
        <nav className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex min-h-10 items-center gap-1.5 px-3.5 py-2.5 rounded-full text-[13px] font-extrabold border transition-colors shrink-0 ${
                tab === t.id ? "bg-peach text-ink border-peach" : "bg-ink2 text-dim border-line hover:text-txt"
              }`}
            >
              <I name={t.icon} className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="anim-rise" key={tab}>
          {tab === "life" && <Journal entries={s.log} />}
          {tab === "family" && <FamilyScreen s={s} onSelectNpc={setNpcId} />}
          {tab === "work" && <WorkScreen s={s} g={g} />}
          {tab === "money" && <MoneyScreen s={s} g={g} />}
          {tab === "actions" && <ActionsScreen s={s} g={g} />}
          {tab === "super" && <SuperScreen s={s} g={g} />}
          {tab === "skills" && <SkillsScreen s={s} g={g} />}
          {tab === "sports" && <SportsScreen s={s} g={g} />}
          {tab === "fame" && <FameScreen s={s} g={g} />}
          {tab === "you" && <ProfileScreen s={s} g={g} />}
        </main>
      </div>

      {/* Age-up bar */}
      <div className="fixed bottom-0 inset-x-0 z-40">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-6 safe-bottom bg-gradient-to-t from-ink via-ink/95 to-transparent">
          {pending ? (
            <div className="panel px-4 py-3 flex items-center gap-3 border-peach/40">
              <span className="text-peach">
                <I name="spark" className="w-5 h-5" />
              </span>
              <div>
                <p className="font-display font-bold text-sm">{pending.title}</p>
                <p className="text-xs text-dim">Life asked a question. Answer it above before the page turns.</p>
              </div>
            </div>
          ) : (
            <button
              className="btn-primary anim-glow w-full rounded-2xl px-4 py-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 text-lg sm:text-xl font-display font-black tracking-wide"
              disabled={s.over || !p.alive}
              onClick={() => {
                setTab("life");
                g.ageUpAction();
              }}
            >
              <I name="feather" className="w-5 h-5" />
              TURN THE PAGE
              <span className="text-xs sm:text-sm font-body font-bold opacity-70">
                age {p.age} → {p.age + 1} · {s.worldYear + 1}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Choice modal */}
      {pending && !s.over && (
        <Modal>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-peach mb-2">{s.worldYear} · age {p.age}</p>
          <h2 className="font-display font-bold text-2xl mb-3">{pending.title}</h2>
          <p className="text-[15px] leading-relaxed text-txt/90 mb-5">{pending.text}</p>
          <div className="space-y-2">
            {pending.choices.map((ch) => (
              <button
                key={ch.id}
                className="w-full btn-ghost rounded-xl px-4 py-3 text-left flex items-center justify-between gap-3"
                onClick={() => g.resolve(ch.id)}
              >
                <span>
                  <span className="font-bold text-sm">{ch.label}</span>
                  {ch.hint && <span className="block text-xs text-dim mt-0.5">{ch.hint}</span>}
                </span>
                <I name="chevr" className="w-4 h-4 text-peach shrink-0" />
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Toast */}
      {s.toast && !s.over && (
        <div
          key={s.toast.id}
          className="fixed bottom-24 inset-x-0 z-50 flex justify-center pointer-events-none"
          onAnimationEnd={() => g.dismissToast()}
        >
          <div className="anim-toast panel px-4 py-2.5 text-sm font-bold text-mint shadow-xl shadow-black/50">
            {s.toast.text}
          </div>
        </div>
      )}

      {npcId && !s.over && (
        <NpcProfile s={s} g={g} targetId={npcId} onClose={() => setNpcId(null)} />
      )}

      {/* Death overlay */}
      {s.over && <DeathScreen g={g} onMenu={onMenu} />}
    </div>
  );
}

function DeathScreen({ g, onMenu }: { g: GameApi; onMenu: () => void }) {
  const s = g.state!;
  const p = s.chars[s.currentId];
  const kids = eligibleSuccessors(s);
  const net = netWorth(p);
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink">
      <div className="absolute inset-0 bg-dusk" />
      <div className="stars" />
      <div className="relative z-10 max-w-xl mx-auto px-4 py-10 sm:py-16">
        <div className="anim-pop text-center mb-8">
          <span className="inline-block text-coral mb-4">
            <I name="skull" className="w-10 h-10" />
          </span>
          <h2 className="font-display font-black text-4xl sm:text-5xl text-txt">A Life, Fully Lived</h2>
          <p className="font-display text-pink text-lg mt-1">
            {p.firstName} {p.lastName}, {p.birthYear}–{p.deathYear ?? p.age}
          </p>
        </div>
        <div className="panel p-6 anim-rise" style={{ animationDelay: "120ms" }}>
          <p className="text-[15px] leading-relaxed text-txt/90">{s.overText}</p>
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="panel-inset p-2.5 text-center">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-dim">Net worth</p>
              <p className={`text-sm font-extrabold ${net >= 0 ? "text-mint" : "text-coral"}`}>{fmtMoney(net, p.countryId)}</p>
            </div>
            <div className="panel-inset p-2.5 text-center">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-dim">Children</p>
              <p className="text-sm font-extrabold text-pink">{p.childrenIds.length}</p>
            </div>
            <div className="panel-inset p-2.5 text-center">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-dim">Milestones</p>
              <p className="text-sm font-extrabold text-peach">{p.milestones.length}</p>
            </div>
          </div>
          {p.milestones.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-dim mb-2">The highlights</p>
              <div className="space-y-1">
                {[...p.milestones].slice(-5).reverse().map((m, i) => (
                  <p key={i} className="text-sm flex gap-2">
                    <span className="text-peach font-bold shrink-0 tabular-nums">{m.year}</span>
                    <span className="text-txt/85">{m.text}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 space-y-3 anim-rise" style={{ animationDelay: "240ms" }}>
          {kids.length > 0 ? (
            <>
              <p className="text-center text-sm text-dim">
                The story isn't finished. {kids.length} {kids.length === 1 ? "descendant" : "descendants"} still carry the {p.lastName} name —
                the inheritance is already in their pockets.
              </p>
              {kids.slice(0, 6).map((k) => (
                <button
                  key={k.id}
                  className="w-full btn-primary rounded-xl px-5 py-4 flex items-center justify-between"
                  onClick={() => g.cont(k.id)}
                >
                  <span className="flex items-center gap-3">
                    <Portrait c={k} size={38} />
                    <span className="text-left">
                      <span className="font-display font-bold text-lg block leading-tight">Continue as {k.firstName}</span>
                      <span className="text-xs opacity-75">
                        age {k.age} · {TRAIT_LIST.find((t) => t.id === k.traits[0])?.name ?? "a life"} · {fmtMoney(k.money, k.countryId)}
                      </span>
                    </span>
                  </span>
                  <I name="chevr" className="w-5 h-5" />
                </button>
              ))}
            </>
          ) : (
            <p className="text-center text-sm text-dim">No descendants carry the name. This story ends — complete.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-ghost rounded-xl px-4 py-3.5 font-bold" onClick={onMenu}>
              End This Lineage
            </button>
            <button
              className="btn-primary rounded-xl px-4 py-3.5 font-bold"
              onClick={() => {
                g.startRandom();
              }}
            >
              Start a New Life
            </button>
          </div>
          <p className="text-center text-[11px] text-dim/70">A new life gets its own save slot — this one stays exactly as it is.</p>
        </div>
      </div>
    </div>
  );
}
