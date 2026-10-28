import type { GameState } from "../game/types";
import { SPORT_BY_ID, SPORTS, sportActionLock, type SportAction } from "../game/sports";
import { SKILL_BY_ID, SKILL_CATEGORIES, SKILLS, skillPracticeLock } from "../game/skills";
import { fameActionLock, type FameAction } from "../game/fame";
import type { GameApi } from "../game/state";
import { fmtMoney } from "../game/world";
import { Chip, I, LangBar, SectionTitle } from "./ui";

export function SkillsScreen({ s, g }: { s: GameState; g: GameApi }) {
  const p = s.chars[s.currentId];
  const knownExtra = Object.keys(p.skills).filter((id) => !SKILL_BY_ID[id] && (p.skills[id] ?? 0) > 0);
  return (
    <div className="space-y-5 pb-6">
      <section className="panel p-4">
        <p className="font-display font-bold text-lg">Skills grow through use</p>
        <p className="text-xs text-dim mt-1 leading-relaxed">Study, work, hobbies, sports, and life experiences build different abilities. You can practice one skill each year; skills can stagnate or fade when left unused.</p>
      </section>
      {SKILL_CATEGORIES.map((category) => (
        <section key={category.id}>
          <SectionTitle icon="star">{category.label}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SKILLS.filter((skill) => skill.category === category.id).map((skill) => {
              const value = p.skills[skill.id] ?? 0;
              const lock = skillPracticeLock(s, skill.id);
              return (
                <article key={skill.id} className="panel-inset min-w-0 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm truncate">{skill.name}</p>
                    <Chip color={value >= 70 ? "mint" : value >= 35 ? "peach" : "dim"}>{Math.round(value)}</Chip>
                  </div>
                  <LangBar name="Proficiency" value={value} />
                  <p className="text-[11px] text-dim min-h-8 mt-1 leading-snug">{skill.description}</p>
                  <button className="btn-ghost w-full rounded-lg px-3 py-2 mt-2 text-xs font-extrabold disabled:opacity-40" disabled={!!lock} title={lock ?? undefined} onClick={() => g.practice(skill.id)}>
                    {lock?.includes("already practiced") ? "Practiced this year" : lock ?? "Practice this year"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      {knownExtra.length > 0 && (
        <section>
          <SectionTitle icon="spark">Legacy skills</SectionTitle>
          <div className="panel-inset p-3 space-y-2">
            {knownExtra.map((id) => <LangBar key={id} name={id} value={p.skills[id]} />)}
          </div>
        </section>
      )}
    </div>
  );
}

const SPORT_ACTIONS: { action: SportAction; label: string }[] = [
  { action: "school-team", label: "School team" },
  { action: "amateur", label: "Join amateur club" },
  { action: "tryout", label: "Professional tryout" },
];

export function SportsScreen({ s, g }: { s: GameState; g: GameApi }) {
  const p = s.chars[s.currentId];
  const career = p.sportsCareer;
  const current = career ? SPORT_BY_ID[career.sportId] : undefined;
  return (
    <div className="space-y-5 pb-6">
      <section className="panel p-4">
        <p className="font-display font-bold text-lg">A pathway, not a single job</p>
        <p className="text-xs text-dim mt-1 leading-relaxed">Youth teams and amateur clubs build experience. Pro recruitment, seasonal results, contracts, sponsorship, injury recovery, and retirement vary by sport. Good skills improve your odds; they never guarantee a contract.</p>
      </section>
      {career && current && (
        <section className="panel p-4 border-peach/40">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-dim font-extrabold">Current sports record</p>
              <h2 className="font-display font-bold text-xl mt-1">{current.name}</h2>
              <p className="text-sm text-dim capitalize">{career.level} · {career.years} seasons · {career.experience} experience</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {career.level === "professional" && <Chip color="gold">{fmtMoney(career.salary, p.countryId)}/year</Chip>}
              {(career.sponsorshipIncome ?? 0) > 0 && <Chip color="peach">{fmtMoney(career.sponsorshipIncome ?? 0, p.countryId)} sponsorship/year</Chip>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="panel-inset p-2 text-center"><p className="text-[10px] uppercase text-dim">Record</p><b className="text-sm">{career.wins}–{career.losses}</b></div>
            <div className="panel-inset p-2 text-center"><p className="text-[10px] uppercase text-dim">Events</p><b className="text-sm">{career.competitions}</b></div>
            <div className="panel-inset p-2 text-center"><p className="text-[10px] uppercase text-dim">Awards</p><b className="text-sm">{career.awards.length}</b></div>
          </div>
          {career.injury && <p className="text-xs text-coral mt-3">{career.injury} · recovery year {career.injuryUntil}</p>}
          {career.achievements.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{career.achievements.map((achievement) => <Chip key={achievement} color="mint">{achievement.replace(/-/g, " ")}</Chip>)}</div>}
          {career.awards.length > 0 && <div className="mt-3 text-xs text-gold">{career.awards.slice(-3).join(" · ")}</div>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {[{ action: "train" as const, label: "Train" }, { action: "compete" as const, label: "Compete" }, ...(career.injury ? [{ action: "recover" as const, label: "Recover" }] : []), { action: "retire" as const, label: "Retire" }].map(({ action, label }) => {
              const lock = sportActionLock(s, current.id, action);
              return <button key={action} disabled={!!lock} title={lock ?? undefined} onClick={() => g.sport(current.id, action)} className="btn-ghost rounded-lg px-2.5 py-2 text-xs font-extrabold disabled:opacity-40">{label}</button>;
            })}
          </div>
        </section>
      )}
      <section>
        <SectionTitle icon="pulse">Sports pathways</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SPORTS.map((sport) => {
            const value = p.skills[sport.focusSkill] ?? 0;
            const isCurrent = career?.sportId === sport.id && career.level !== "retired";
            return (
              <article key={sport.id} className="panel-inset min-w-0 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm">{sport.name}</h3>
                  <Chip color={isCurrent ? "mint" : "dim"}>{Math.round(value)} skill</Chip>
                </div>
                <LangBar name="Sport skill" value={value} />
                <p className="text-[11px] text-dim min-h-8 mt-1">{sport.individual ? "Individual competition" : "Team competition"} · professional threshold {sport.proSkill}</p>
                {!isCurrent && (
                  <div className="grid grid-cols-1 gap-1.5 mt-2">
                    {SPORT_ACTIONS.map(({ action, label }) => {
                      const lock = sportActionLock(s, sport.id, action);
                      return <button key={action} disabled={!!lock} title={lock ?? undefined} onClick={() => g.sport(sport.id, action)} className="btn-ghost rounded-md px-2.5 py-2 text-[11px] font-bold text-left disabled:opacity-40">{label}{lock ? ` · ${lock}` : ""}</button>;
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const FAME_ACTIONS: Record<FameAction, string> = {
  audition: "Attend acting audition",
  portfolio: "Build a modelling portfolio",
  casting: "Enter a modelling casting",
  record: "Record and release music",
  perform: "Book a music performance",
  tour: "Plan a music tour",
  brand: "Accept a brand partnership",
};

export function FameScreen({ s, g }: { s: GameState; g: GameApi }) {
  const p = s.chars[s.currentId];
  const career = p.fameCareer;
  const actions: FameAction[] = career?.pathway === "acting"
    ? ["audition", "brand"]
    : career?.pathway === "modelling"
      ? ["portfolio", "casting", "brand"]
      : career?.pathway === "music"
        ? ["record", "perform", "tour", "brand"]
        : ["audition", "portfolio", "record", ...((p.fame ?? 0) >= 25 ? ["brand" as const] : [])];
  return (
    <div className="space-y-5 pb-6">
      <section className="panel p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div><p className="text-[10px] uppercase tracking-widest text-dim font-extrabold">Public life</p><h2 className="font-display font-bold text-2xl mt-1">Fame & reputation</h2></div>
          <Chip color={(p.fame ?? 0) >= 35 ? "gold" : "dim"}>{(p.fame ?? 0) >= 35 ? "In the spotlight" : "Mostly private"}</Chip>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div><div className="flex justify-between text-xs mb-1"><span>Fame</span><b>{Math.round(p.fame ?? 0)}/100</b></div><LangBar name="Fame" value={p.fame ?? 0} /></div>
          <div><div className="flex justify-between text-xs mb-1"><span>Reputation</span><b>{Math.round(p.reputation ?? 50)}/100</b></div><LangBar name="Reputation" value={p.reputation ?? 50} /></div>
        </div>
        <p className="text-[11px] text-dim mt-3 leading-relaxed">Fame measures attention; reputation measures public trust. Neither guarantees work or wealth. Both can change, fade, and return.</p>
      </section>
      {career && (
        <section className="panel p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap"><div><p className="text-[10px] uppercase tracking-widest text-dim font-extrabold">Career pathway</p><h3 className="font-display font-bold text-xl capitalize mt-1">{career.pathway}</h3></div><Chip color="lav">Level {career.level}</Chip></div>
          <p className="text-xs text-dim mt-2">{career.projects} projects · {career.experience} experience{career.agency ? ` · ${career.agency}` : ""}</p>
          {career.pathway === "modelling" && <p className="text-xs text-dim mt-1">Portfolio: {career.portfolio ?? 0} · castings are selective and appearance/photography matter.</p>}
          {career.pathway === "music" && <p className="text-xs text-dim mt-1">Releases: {career.releases ?? 0} · live shows and recorded royalties follow different paths.</p>}
          {career.awards.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{career.awards.map((award) => <Chip key={award} color="gold">{award}</Chip>)}</div>}
          <p className="text-xs text-gold mt-3">Current annual career income: {fmtMoney(career.annualIncome ?? 0, p.countryId)}</p>
        </section>
      )}
      <section>
        <SectionTitle icon="spark">Next opportunity</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {actions.map((action) => {
            const lock = fameActionLock(s, action);
            return <button key={action} disabled={!!lock} title={lock ?? undefined} onClick={() => g.fame(action)} className="panel-inset p-3 text-left hover:border-peach/50 disabled:opacity-45">
              <span className="flex items-center gap-2 font-bold text-sm"><I name="star" className="w-4 h-4 text-peach" />{FAME_ACTIONS[action]}</span>
              <span className="block text-[11px] text-dim mt-1">{lock ?? (action === "audition" ? "Roles depend on acting skill, experience, and fit." : action === "portfolio" ? "An up-front investment; no casting is guaranteed." : action === "record" ? "A release can create modest income and future opportunities." : "Public deals may lift or hurt reputation as well as income.")}</span>
            </button>;
          })}
        </div>
      </section>
      <section className="panel-inset p-3">
        <p className="text-xs font-bold">Pressure is part of public life</p>
        <p className="text-[11px] text-dim mt-1">High attention can bring media scrutiny. Scandals can increase attention while reducing trust and happiness. Athletes, artists, and other public figures may also gain fame through their own careers.</p>
      </section>
    </div>
  );
}
