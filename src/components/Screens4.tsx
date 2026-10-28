import type { GameState, SuperAlignment } from "../game/types";
import { POWER_BY_ID, SUPER_ORGANIZATIONS, powerTier, superActionLock, type SuperAction } from "../game/super";
import type { GameApi } from "../game/state";
import { Chip, LangBar, SectionTitle } from "./ui";

const ALIGNMENTS: SuperAlignment[] = ["hero", "villain", "neutral"];

export function SuperScreen({ s, g }: { s: GameState; g: GameApi }) {
  const p = s.chars[s.currentId];
  const profile = p.superProfile;
  if (s.worldType !== "superlife") return <section className="panel p-4"><p className="text-sm text-dim">Super Life details are not available in this ordinary-world save.</p></section>;
  if (!profile) return <section className="panel p-4 border-sky-400/30"><p className="text-[10px] uppercase tracking-widest text-sky-300 font-extrabold">Super Life · civilian</p><h2 className="font-display font-bold text-xl mt-2">No power has manifested</h2><p className="text-sm text-dim mt-2">You are living an ordinary life in a world where powered people exist. A rare awakening can still change your story; otherwise, use the familiar life systems and turn the page.</p></section>;
  const potentialRivals = Object.values(s.chars).filter((c) => c.id !== p.id && c.alive && c.superProfile?.powers.some((ability) => ability.active));
  const act = (action: SuperAction) => g.superAction(action);
  const activeOrgIds = new Set(profile.organizationIds);

  return (
    <div className="space-y-5 pb-6">
      <section className="panel p-4 border-sky-400/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-sky-300 font-extrabold">Super Life dashboard</p>
            <h2 className="font-display font-bold text-2xl mt-1 break-words">{p.firstName} {p.lastName}</h2>
            <p className="text-xs text-dim mt-1">Civilian identity · {profile.identityExposed ? "publicly exposed" : profile.identityPublic ? "public" : "secret"}</p>
          </div>
          {profile.alias && <Chip color="peach">{profile.alias}</Chip>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <div className="panel-inset p-3"><p className="text-[10px] uppercase text-dim">Alignment</p><b className="capitalize">{profile.alignment}</b></div>
          <div className="panel-inset p-3"><p className="text-[10px] uppercase text-dim">Super reputation</p><b>{profile.publicReputation}</b></div>
          <div className="panel-inset p-3"><p className="text-[10px] uppercase text-dim">Fame</p><b>{p.fame ?? 0}</b></div>
          <div className="panel-inset p-3"><p className="text-[10px] uppercase text-dim">Legal status</p><b className={profile.legalStatus === "wanted" ? "text-coral" : "text-mint"}>{profile.legalStatus}</b></div>
          <div className="panel-inset p-3"><p className="text-[10px] uppercase text-dim">Family</p><b className="capitalize">{profile.familyBackground.replace(/-/g, " ")}</b></div>
        </div>
        <p className="text-[11px] text-dim mt-3">Origin: {profile.origin} · manifestation age {profile.manifestationAge} · fame remains a separate system.</p>
      </section>

      <section>
        <SectionTitle icon="spark">Powers &amp; development</SectionTitle>
        {profile.powers.length === 0 && !profile.plannedPowerId ? <p className="panel-inset p-3 text-sm text-dim">No power has manifested. Super Life events may offer a discovery later.</p> : null}
        <div className="space-y-2">
          {profile.powers.map((ability) => {
            const def = POWER_BY_ID[ability.powerId];
            if (!def) return null;
            const lock = superActionLock(s, { type: "train", powerId: ability.powerId });
            return <article className="panel-inset p-3" key={ability.powerId}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h3 className="font-bold text-sm">{def.name}</h3><p className="text-[10px] text-dim">{def.category} · {powerTier(def)} potential · {ability.origin}</p></div>
                <Chip color={ability.active ? "mint" : "dim"}>{ability.active ? "Active" : `Manifests at ${profile.manifestationAge}`}</Chip>
              </div>
              <p className="text-xs text-dim mt-2">{def.description}</p>
              <p className="text-[10px] text-dim mt-1">Limits: {def.limitations.join("; ")}</p>
              {ability.active && <>
                <div className="grid grid-cols-2 gap-2 mt-3"><LangBar name="Mastery" value={ability.mastery} /><LangBar name="Control" value={ability.control} /></div>
                <div className="flex items-center justify-between gap-2 mt-2 text-[10px] text-dim"><span>Experience {Math.floor(ability.experience)}</span><span>Energy {Math.round(ability.energy)}%</span></div>
                <button type="button" disabled={!!lock} title={lock ?? undefined} onClick={() => act({ type: "train", powerId: ability.powerId })} className="btn-ghost min-h-11 w-full rounded-lg px-3 py-2 mt-3 text-xs font-extrabold disabled:opacity-40">{lock ?? `Train · ${def.energyCost} energy · once per year`}</button>
              </>}
            </article>;
          })}
          {profile.plannedPowerId && !profile.powers.some((ability) => ability.powerId === profile.plannedPowerId) && (() => {
            const def = POWER_BY_ID[profile.plannedPowerId!];
            return def ? <div className="panel-inset p-3"><p className="font-bold text-sm">Planned: {def.name}</p><p className="text-xs text-dim mt-1">Not active yet. A manifestation or acquisition event will ask how you respond.</p></div> : null;
          })()}
        </div>
      </section>

      <section className="panel p-4">
        <SectionTitle icon="users">Alignment &amp; identity</SectionTitle>
        <p className="text-xs text-dim mb-2">Alignment can change; actions—not the label—shape reputation and legal consequences.</p>
        <div className="grid grid-cols-3 gap-2">
          {ALIGNMENTS.map((alignment) => <button key={alignment} type="button" aria-pressed={profile.alignment === alignment} onClick={() => act({ type: "alignment", alignment })} className={`min-h-11 rounded-lg border px-2 py-2 text-xs font-bold capitalize ${profile.alignment === alignment ? "border-sky-300 bg-sky-400/15 text-sky-200" : "border-line bg-ink3 text-dim"}`}>{alignment}</button>)}
        </div>
        <label className="block text-xs font-bold text-dim mt-4">Super identity
          <input type="text" key={profile.alias ?? "no-alias"} maxLength={32} defaultValue={profile.alias ?? ""} placeholder="Choose an alias or leave blank" className="mt-1 w-full bg-ink border border-line rounded-lg px-3 py-2.5 text-txt" onBlur={(e) => act({ type: "alias", alias: e.currentTarget.value })} />
        </label>
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" className="btn-ghost min-h-11 rounded-lg px-3 py-2 text-xs font-bold" onClick={() => act({ type: "retire-alias" })}>Retire current alias</button>
          <button type="button" aria-pressed={profile.identityPublic} className="btn-ghost min-h-11 rounded-lg px-3 py-2 text-xs font-bold" onClick={() => act({ type: "identity", isPublic: !profile.identityPublic })}>{profile.identityPublic ? "Identity public" : "Keep identity secret"}</button>
        </div>
        {profile.aliasHistory.length > 0 && <p className="text-[11px] text-dim mt-3">Former identities: {profile.aliasHistory.join(" · ")}</p>}
        {profile.identityExposed && <p className="text-[11px] text-coral mt-2">Your civilian identity has been exposed; hiding it later cannot undo what the public knows.</p>}
      </section>

      <section>
        <SectionTitle icon="briefcase">Choose how to use your abilities</SectionTitle>
        <p className="text-[11px] text-dim mb-2">Each public/private operation uses half the active power’s listed energy cost and can be taken once per year.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {ALIGNMENTS.map((path) => {
            const action: SuperAction = { type: "activity", path };
            const lock = superActionLock(s, action);
            return <button key={path} type="button" disabled={!!lock} title={lock ?? undefined} onClick={() => act(action)} className="btn-ghost min-h-12 rounded-lg px-3 py-2 text-xs font-bold capitalize disabled:opacity-40">{lock ?? (path === "hero" ? "Rescue / public service" : path === "villain" ? "Villain operation" : "Neutral independent work")}</button>;
          })}
        </div>
        {potentialRivals.length > 0 && <div className="panel-inset p-3 mt-3">
          <p className="font-bold text-sm">Conflict simulation</p>
          <p className="text-[11px] text-dim mt-1">Outcomes use mastery, control, energy, health, and preparation—not tier alone.</p>
          <div className="mt-2 space-y-2">{potentialRivals.slice(0, 3).map((rival) => {
            const lock = superActionLock(s, { type: "conflict", targetId: rival.id });
            return <button key={rival.id} type="button" disabled={!!lock} onClick={() => act({ type: "conflict", targetId: rival.id })} className="btn-ghost min-h-11 w-full rounded-lg px-3 py-2 text-left text-xs font-bold disabled:opacity-40">Challenge {rival.firstName}{lock ? ` · ${lock}` : ""}</button>;
          })}</div>
        </div>}
      </section>

      <section>
        <SectionTitle icon="users">Organizations</SectionTitle>
        <p className="text-[11px] text-dim mb-2">Memberships provide ongoing recovery and control mentorship; goals and recruitment rules differ by organization.</p>
        <div className="space-y-2">
          {SUPER_ORGANIZATIONS.map((org) => {
            const member = activeOrgIds.has(org.id);
            const action: SuperAction = member ? { type: "leave", organizationId: org.id } : { type: "join", organizationId: org.id };
            const lock = superActionLock(s, action);
            return <article key={org.id} className="panel-inset p-3 flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="font-bold text-sm">{org.name}</p><p className="text-[10px] uppercase text-sky-300">{org.type.replace(/-/g, " ")}</p><p className="text-xs text-dim mt-1">{org.description} Goal: {org.goal}.</p></div>
              <button type="button" disabled={!!lock} title={lock ?? undefined} onClick={() => act(action)} className="btn-ghost min-h-11 shrink-0 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40">{member ? "Leave" : lock ? "Locked" : "Join"}</button>
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}
