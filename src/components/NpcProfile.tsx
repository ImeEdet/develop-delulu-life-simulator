import { useEffect, useRef, useState } from "react";
import type { Char, GameState } from "../game/types";
import type { GameApi } from "../game/state";
import { fullName } from "../game/names";
import { country, fmtMoney, LANGS } from "../game/world";
import { JOBS, MAJOR_LIST, SENIORITY, TRAIT_LIST } from "../game/content";
import { netWorth, totalDebt } from "../game/economy";
import { relLabel } from "../game/characters";
import { NAME_GROUPS } from "../game/name-data";
import { SPORT_BY_ID } from "../game/sports";
import { SKILL_BY_ID } from "../game/skills";
import { npcInteractionOptions, npcInteractionLock, npcRelationshipScore } from "../game/social";
import type { NpcInteraction } from "../game/social";
import { Chip, CountryTag, I, Portrait, SectionTitle } from "./ui";

interface NpcProfileProps {
  s: GameState;
  g: GameApi;
  targetId: string;
  onClose: () => void;
}

function connectionLabel(player: Char, target: Char, s: GameState): string {
  const label = relLabel(player, target, s.chars);
  return label === "A relative" ? "Family member" : label;
}

function educationLabel(c: Char): string | null {
  if (c.uni) {
    const major = MAJOR_LIST.find((m) => m.id === c.uni?.major)?.name ?? c.uni.major;
    return `University · year ${c.uni.year} · ${major}`;
  }
  const names: Record<string, string> = {
    none: "No formal education recorded",
    primary: "Primary education",
    secondary: "Secondary education",
    university: "University graduate",
  };
  return names[c.education] ?? null;
}

function occupationLabel(c: Char): string | null {
  if (c.job) {
    const title = JOBS[c.job.jobId]?.title;
    return title ? `${SENIORITY[c.job.seniority] ?? ""}${title}` : null;
  }
  if (c.retired) return "Retired";
  if (c.age < country(c.countryId).schoolStart) return "Not employed";
  if (c.age < 18) return "Student";
  return null;
}

function NpcReference({ c, label, onOpen }: { c: Char; label: string; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(c.id)}
      className="w-full min-h-11 panel-inset rounded-xl px-3 py-2 flex items-center gap-2 text-left hover:border-peach/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach"
      aria-label={`Open ${fullName(c)} profile, ${label}`}
    >
      <Portrait c={c} size={30} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm font-bold">{fullName(c)}</span>
      <span className="shrink-0 text-xs text-dim">{label}</span>
      <I name="chevr" className="w-4 h-4 text-peach shrink-0" />
    </button>
  );
}

export function NpcProfile({ s, g, targetId, onClose }: NpcProfileProps) {
  const [stack, setStack] = useState([targetId]);
  const [confirmBreakup, setConfirmBreakup] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const currentId = stack[stack.length - 1];
  const c = s.chars[currentId];
  const player = s.chars[s.currentId];

  useEffect(() => {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = [...sheetRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      active?.focus();
    };
  }, []);

  if (!c || !player) return null;

  const openRelated = (id: string) => {
    if (s.chars[id]) {
      setConfirmBreakup(false);
      setStack((prev) => [...prev, id]);
    }
  };
  const back = () => {
    setConfirmBreakup(false);
    if (stack.length > 1) setStack((prev) => prev.slice(0, -1));
    else onClose();
  };
  const relationship = connectionLabel(player, c, s);
  const score = npcRelationshipScore(s, c.id);
  const parents = [c.motherId, c.fatherId].map((id) => id ? s.chars[id] : undefined).filter((x): x is Char => !!x);
  const siblings = Object.values(s.chars).filter((other) => other.id !== c.id && other.id !== player.id &&
    ((c.motherId && other.motherId === c.motherId) || (c.fatherId && other.fatherId === c.fatherId)));
  const partner = c.partnerId ? s.chars[c.partnerId] : undefined;
  const children = c.childrenIds.map((id) => s.chars[id]).filter((x): x is Char => !!x && x.id !== s.currentId);
  const traits = c.traits.map((id) => TRAIT_LIST.find((trait) => trait.id === id)).filter((x): x is (typeof TRAIT_LIST)[number] => !!x);
  const education = educationLabel(c);
  const occupation = occupationLabel(c);
  const debt = totalDebt(c);
  const income = (c.job?.salary ?? (c.retired ? c.pension : 0)) + (c.sportsCareer?.level === "professional" ? c.sportsCareer.salary + (c.sportsCareer.sponsorshipIncome ?? 0) : 0) + (c.fameCareer?.annualIncome ?? 0);
  const skills = Object.entries(c.skills).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const showFinances = c.alive && (c.age >= 18 || c.money !== 0 || debt > 0);
  const actions = npcInteractionOptions(s, c.id);

  const doInteraction = (action: NpcInteraction) => {
    if (npcInteractionLock(s, c.id, action)) return;
    if (action === "breakup") {
      setConfirmBreakup(true);
      return;
    }
    g.interactNpc(c.id, action);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center">
      <button type="button" className="absolute inset-0 bg-ink/85 backdrop-blur-sm" aria-label="Close character profile" onClick={onClose} />
      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="npc-profile-title"
        className="npc-profile-sheet relative w-full sm:max-w-xl overflow-y-auto overscroll-contain panel rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl shadow-black/60 safe-bottom"
      >
        <header className="sticky top-0 z-10 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 px-4 sm:px-6 pt-3 sm:pt-4 pb-3 panel border-x-0 border-t-0 rounded-t-2xl sm:rounded-t-2xl flex items-center gap-2">
          <button ref={closeRef} type="button" onClick={back} className="btn-ghost min-h-11 min-w-11 rounded-xl px-3 flex items-center justify-center gap-1 font-bold" aria-label={stack.length > 1 ? "Back to previous character" : "Close character profile"}>
            <I name={stack.length > 1 ? "chevr" : "x"} className="w-4 h-4" />
            <span className="text-sm">{stack.length > 1 ? "Back" : "Close"}</span>
          </button>
          <span className="flex-1" />
          <Chip color={c.alive ? "mint" : "dim"}>{c.alive ? "Living" : "Deceased"}</Chip>
          <button type="button" onClick={onClose} className="btn-ghost min-h-11 min-w-11 rounded-xl p-2 flex items-center justify-center" aria-label="Close character profile">
            <I name="x" className="w-4 h-4" />
          </button>
        </header>

        <div className="pt-4 space-y-5">
          <section className="flex items-center gap-3 min-w-0">
            <Portrait c={c} size={58} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 id="npc-profile-title" className="font-display font-bold text-2xl leading-tight break-words">{fullName(c)}</h2>
              <p className="text-sm text-dim mt-1">{c.alive ? `Age ${c.age}` : `Died aged ${c.age}`} · {c.gender === "female" ? "Female" : "Male"}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <CountryTag id={c.countryId} />
                <span className="text-xs text-dim">{relationship}</span>
              </div>
              {(c.city || c.countryId) && <p className="text-xs text-dim mt-1 break-words">{[c.city, country(c.countryId).name].filter(Boolean).join(", ")}</p>}
            </div>
          </section>

          {!c.alive && (
            <section className="panel-inset p-3">
              <SectionTitle icon="skull">Life ended</SectionTitle>
              <p className="text-sm font-bold">{c.deathYear ? `Died in ${c.deathYear} at age ${c.age}` : `Deceased at age ${c.age}`}</p>
              {c.causeOfDeath && <p className="text-sm text-dim mt-1">Cause: {c.causeOfDeath}</p>}
            </section>
          )}

          {score !== undefined && (
            <section className="panel-inset p-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-bold">Relationship</span>
                <span className={`font-extrabold tabular-nums ${score < 0 ? "text-coral" : "text-mint"}`}>{Math.round(score)}/100</span>
              </div>
              <div className="h-2 rounded-full bg-ink overflow-hidden mt-2" role="meter" aria-label="Relationship score" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={Math.round(score)}>
                <div className="h-full rounded-full bar-fill" style={{ width: `${Math.abs(score)}%`, marginLeft: score < 0 ? `${100 - Math.abs(score)}%` : 0, background: score < 0 ? "#ff6b6b" : "#5ce8a9" }} />
              </div>
            </section>
          )}

          {c.alive && actions.length > 0 && (
            <section className="panel p-3">
              <SectionTitle icon="heart">Interactions</SectionTitle>
              <p className="text-[11px] text-dim mb-2">Social actions are ready here; each has its own availability and yearly limit.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {actions.map((action) => {
                  const cost = action.cost === undefined ? null : fmtMoney(action.cost, player.countryId);
                  const disabled = !!action.disabledReason;
                  return (
                    <button key={action.id} type="button" disabled={disabled} onClick={() => doInteraction(action.id)} className="btn-ghost min-h-14 rounded-xl px-3 py-2.5 text-left disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm">{action.label}</span>
                        {cost && <span className="text-xs text-gold shrink-0">{cost}</span>}
                      </span>
                      <span className="block text-xs text-dim mt-1">{action.disabledReason ?? action.detail}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {traits.length > 0 && (
            <section>
              <SectionTitle icon="spark">Traits</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {traits.map((trait) => <Chip key={trait.id} color="pink" title={trait.desc}>{trait.name}</Chip>)}
              </div>
            </section>
          )}

          {(education || occupation || c.job?.employer) && (
            <section className="grid sm:grid-cols-2 gap-2">
              {education && <div className="panel-inset p-3"><p className="text-xs text-dim font-bold uppercase tracking-wide">Education</p><p className="text-sm font-bold mt-1">{education}</p>{c.examScore !== undefined && <p className="text-xs text-dim mt-1">Exam score: {c.examScore}/100</p>}</div>}
              {(occupation || c.job?.employer) && <div className="panel-inset p-3"><p className="text-xs text-dim font-bold uppercase tracking-wide">Occupation</p><p className="text-sm font-bold mt-1">{occupation ?? "Occupation unavailable"}</p>{c.job?.employer && <p className="text-xs text-dim mt-1 break-words">{c.job.employer}</p>}</div>}
            </section>
          )}

          <section className="panel-inset p-3 space-y-3">
            <div><SectionTitle icon="globe">Background</SectionTitle><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <p><span className="text-dim">Born in </span><b>{c.birthCity ?? c.city}, {country(c.birthCountryId ?? c.countryId).name}</b></p>
              <p><span className="text-dim">Lives in </span><b>{c.city}, {country(c.countryId).name}</b></p>
              <div className="sm:col-span-2"><span className="text-dim">Cultural connections: </span>{(c.culturalHeritage ?? []).map((id) => NAME_GROUPS[id]?.name ?? id).join(", ") || "Not recorded"}</div>
              <div className="sm:col-span-2"><span className="text-dim">Self-described ethnicity: </span>{(c.ethnicities ?? []).join(", ") || "Not specified"}</div>
              <div className="sm:col-span-2"><span className="text-dim">Citizenship: </span>{(c.citizenships ?? [c.citizenOf ?? c.countryId]).map((id) => country(id).name).join(", ")}</div>
              <div className="sm:col-span-2"><span className="text-dim">Languages: </span>{Object.entries(c.languages).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).map(([id, value]) => `${LANGS[id]?.name ?? id} (${Math.round(value)})`).join(", ") || "Not recorded"}</div>
              <div className="sm:col-span-2 text-[10px] text-dim"><span className="font-bold">Family/community exposure: </span>{Object.entries(c.languageExposure ?? {}).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).map(([id, value]) => `${LANGS[id]?.name ?? id} (${Math.round(value)})`).join(", ") || "Not recorded"} · exposure is not fluency.</div>
            </div></div>
            {(c.fame ?? 0) > 0 && <div><div className="flex items-center justify-between text-xs"><span className="font-bold">Fame</span><b>{Math.round(c.fame ?? 0)}/100</b></div><div className="flex items-center justify-between text-xs mt-1"><span className="font-bold">Reputation</span><b>{Math.round(c.reputation ?? 50)}/100</b></div>{c.fameCareer && <p className="text-[11px] text-dim mt-1 capitalize">{c.fameCareer.pathway} · level {c.fameCareer.level}</p>}</div>}
            {c.sportsCareer && <div><p className="text-xs font-bold">{SPORT_BY_ID[c.sportsCareer.sportId]?.name ?? c.sportsCareer.sportId} · {c.sportsCareer.level}</p><p className="text-[11px] text-dim mt-1">{c.sportsCareer.wins} wins · {c.sportsCareer.losses} losses · {c.sportsCareer.awards.length} awards</p>{c.sportsCareer.injury && <p className="text-[11px] text-coral mt-1">{c.sportsCareer.injury}</p>}</div>}
            {skills.length > 0 && <div><p className="text-xs font-bold mb-1">Skills</p><div className="flex flex-wrap gap-1.5">{skills.map(([id, value]) => <Chip key={id} color="dim" title={`${Math.round(value)}/100`}>{SKILL_BY_ID[id]?.name ?? id} · {Math.round(value)}</Chip>)}</div></div>}
          </section>

          {(parents.length > 0 || siblings.length > 0 || partner || children.length > 0) && (
            <section>
              <SectionTitle icon="users">Family &amp; partner</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-2">
                {parents.map((parent) => <NpcReference key={parent.id} c={parent} label={parent.id === c.motherId ? "Mother" : "Father"} onOpen={openRelated} />)}
                {siblings.map((sibling) => <NpcReference key={sibling.id} c={sibling} label="Sibling" onOpen={openRelated} />)}
                {partner && <NpcReference c={partner} label="Partner" onOpen={openRelated} />}
                {children.map((child) => <NpcReference key={child.id} c={child} label="Child" onOpen={openRelated} />)}
              </div>
            </section>
          )}

          {showFinances && (
            <section>
              <SectionTitle icon="coin">Finances</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="panel-inset p-3"><p className="text-xs text-dim">Cash</p><p className="text-sm font-bold tabular-nums break-words">{fmtMoney(c.money, c.countryId)}</p></div>
                <div className="panel-inset p-3"><p className="text-xs text-dim">Net worth</p><p className="text-sm font-bold tabular-nums break-words">{fmtMoney(netWorth(c), c.countryId)}</p></div>
                {income > 0 && <div className="panel-inset p-3"><p className="text-xs text-dim">Income / year</p><p className="text-sm font-bold tabular-nums break-words">{fmtMoney(income, c.countryId)}</p></div>}
                {debt > 0 && <div className="panel-inset p-3"><p className="text-xs text-dim">Debt</p><p className="text-sm font-bold text-coral tabular-nums break-words">{fmtMoney(debt, c.countryId)}</p></div>}
              </div>
            </section>
          )}

          {confirmBreakup && (
            <section className="panel-inset p-3 border-coral/50" role="alertdialog" aria-labelledby="breakup-confirm-title">
              <h3 id="breakup-confirm-title" className="font-bold text-sm">End this relationship?</h3>
              <p className="text-xs text-dim mt-1">You and {c.firstName} will no longer be partners, and this former relationship cannot be restarted.</p>
              <div className="flex gap-2 mt-3">
                <button type="button" className="btn-ghost min-h-11 rounded-lg px-4 font-bold" onClick={() => setConfirmBreakup(false)}>Keep relationship</button>
                <button type="button" className="btn-primary min-h-11 rounded-lg px-4 font-bold" onClick={() => { g.interactNpc(c.id, "breakup"); setConfirmBreakup(false); }}>End relationship</button>
              </div>
            </section>
          )}

          <p className="text-center text-xs text-dim/70 pb-2">{c.alive ? "Changes are saved with this life." : "This profile is read-only."}</p>
        </div>
      </section>
    </div>
  );
}
