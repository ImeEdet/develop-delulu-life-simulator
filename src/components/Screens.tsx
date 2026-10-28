import { useState } from "react";
import type { Char, GameState } from "../game/types";
import { country, fmtMoney, LANGS } from "../game/world";
import { JOBS, MAJOR_LIST, SENIORITY, TRAIT_LIST, eligibleJobs, isImmigrant, jobSalary } from "../game/content";
import { livingCost, netWorth, totalDebt, financialStatus } from "../game/economy";
import { nominal } from "../game/era";
import { actionLock } from "../game/actions";
import type { GameApi } from "../game/state";
import { Chip, CountryTag, I, Portrait, SectionTitle } from "./ui";

export const majorName = (id: string) => MAJOR_LIST.find((m) => m.id === id)?.name ?? id;

function statusOf(c: Char): string {
  if (!c.alive) return `died aged ${c.age}${c.deathYear ? ` · ${c.deathYear}` : ""}`;
  if (c.age < 3) return "still discovering gravity";
  if (c.age < 6) return "preschool and small tyrannies";
  if (c.age < 12) return "primary school";
  if (c.age < 18) return "secondary school";
  if (c.uni) return `university, year ${c.uni.year}/4`;
  if (c.job) return `${SENIORITY[c.job.seniority]}${JOBS[c.job.jobId]?.title ?? "worker"}`;
  if (c.retired) return "retired, happily or not";
  if (c.education === "university") return "between chapters";
  return "figuring it out";
}

function CharCard({ c, label, showMoney = false, onSelect }: { c: Char; label: string; showMoney?: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(c.id)}
      aria-label={`View ${c.firstName} ${c.lastName}, ${label}, profile`}
      className={`panel-inset w-full min-h-[68px] p-3 flex gap-3 text-left transition-colors hover:border-peach/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach ${c.alive ? "" : "opacity-70"}`}
    >
      <Portrait c={c} size={40} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-sm truncate">
            {c.firstName} {c.lastName} <span className="text-dim font-semibold">{c.age}</span>
          </p>
          <CountryTag id={c.countryId} />
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-dim/80">{label}</span>
        </div>
        <p className="text-xs text-dim truncate">{statusOf(c)}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {c.traits.slice(0, 2).map((t) => (
            <Chip key={t} color="dim">
              {TRAIT_LIST.find((x) => x.id === t)?.name}
            </Chip>
          ))}
          {showMoney && c.alive && (
            <Chip color="gold">{fmtMoney(c.money, c.countryId)}</Chip>
          )}
        </div>
      </div>
      <span className="shrink-0 self-center inline-flex flex-col items-center gap-0.5 text-[9px] font-extrabold text-peach" aria-hidden="true">
        <I name="chevr" className="w-4 h-4" />
        <span>Profile</span>
      </span>
    </button>
  );
}

export function FamilyScreen({ s, onSelectNpc = () => {} }: { s: GameState; onSelectNpc?: (id: string) => void }) {
  const p = s.chars[s.currentId];
  const get = (id?: string) => (id ? s.chars[id] : undefined);
  const mother = get(p.motherId);
  const father = get(p.fatherId);
  const siblings = Object.values(s.chars).filter(
    (c) =>
      c.id !== p.id &&
      ((p.motherId && c.motherId === p.motherId) || (p.fatherId && c.fatherId === p.fatherId))
  );
  const grandmas = [get(mother?.motherId ?? undefined), get(mother?.fatherId ?? undefined), get(father?.motherId ?? undefined), get(father?.fatherId ?? undefined)].filter(
    (g): g is Char => !!g
  );
  const partner = get(p.partnerId);
  const stepkids = (partner?.childrenIds ?? []).filter((id) => !p.childrenIds.includes(id)).map((id) => s.chars[id]).filter(Boolean);
  const kids = p.childrenIds.map((id) => s.chars[id]).filter(Boolean);
  const grandkids = kids.flatMap((k) => (k.childrenIds ?? []).map((id) => s.chars[id])).filter(Boolean);
  const friends = p.friends.map((f) => ({ c: s.chars[f.id], value: f.value })).filter((f) => f.c);

  return (
    <div className="space-y-6 pb-6">
      <div className="panel-inset p-3 flex items-start gap-2 text-xs text-dim" role="note">
        <I name="users" className="w-4 h-4 text-peach shrink-0 mt-0.5" />
        <p><b className="text-txt">NPC profiles &amp; social actions:</b> tap any family card to open that character's profile, then scroll to Interactions for talk, gifts, dates, and other available actions.</p>
      </div>
      <section>
        <SectionTitle icon="heart">Parents</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-2">
          {mother && <CharCard c={mother} label="mother" showMoney onSelect={onSelectNpc} />}
          {father && <CharCard c={father} label="father" showMoney onSelect={onSelectNpc} />}
          {!mother && !father && <p className="text-dim text-sm">You grew up with the whole street as family.</p>}
        </div>
      </section>
      {grandmas.length > 0 && (
        <section>
          <SectionTitle icon="sun">Grandparents</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-2">
            {grandmas.map((g) => (
              <CharCard key={g.id} c={g} label={g.gender === "female" ? "grandmother" : "grandfather"} showMoney onSelect={onSelectNpc} />
            ))}
          </div>
        </section>
      )}
      <section>
        <SectionTitle icon="users">Siblings &amp; Their Worlds</SectionTitle>
        <div className="space-y-2">
          {siblings.length === 0 && <p className="text-dim text-sm">An only child. The whole story is yours.</p>}
          {siblings.map((c) => (
            <div key={c.id} className="space-y-1.5">
              <CharCard c={c} label={c.gender === "female" ? "sister" : "brother"} showMoney onSelect={onSelectNpc} />
              {(() => {
                const par = get(c.partnerId);
                const kids2 = c.childrenIds.map((id) => s.chars[id]).filter(Boolean);
                if (!par && kids2.length === 0) return null;
                return (
                  <div className="ml-8 flex flex-wrap gap-1.5">
                    {par && (
                      <button type="button" onClick={() => onSelectNpc(par.id)} className="min-h-11 inline-flex items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach" aria-label={`View ${par.firstName} ${par.lastName}, sibling's partner`}>
                        <Chip color="pink">
                          <I name="ring" className="w-3 h-3" /> {c.age > 26 ? "married" : "with"} {par.firstName} ({par.age})
                        </Chip>
                      </button>
                    )}
                    {kids2.map((k) => (
                      <button key={k.id} type="button" onClick={() => onSelectNpc(k.id)} className="min-h-11 inline-flex items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach" aria-label={`View ${k.firstName} ${k.lastName}, niece or nephew`}>
                        <Chip color="mint">
                          <I name="baby" className="w-3 h-3" /> {k.firstName}, {k.age}
                        </Chip>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </section>
      {partner && (
        <section>
          <SectionTitle icon="ring">{p.flags.includes("married") ? "Spouse" : "Partner"}</SectionTitle>
          <CharCard c={partner} label={p.flags.includes("married") ? "spouse" : "partner"} showMoney onSelect={onSelectNpc} />
          {stepkids.length > 0 && (
            <>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-dim mt-3 mb-1.5">Their children</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {stepkids.map((c) => (
                  <CharCard key={c.id} c={c} label="stepchild" onSelect={onSelectNpc} />
                ))}
              </div>
            </>
          )}
        </section>
      )}
      <section>
        <SectionTitle icon="baby">Your Children</SectionTitle>
        {kids.length === 0 ? (
          <p className="text-dim text-sm">No children yet. The future is wide open.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {kids.map((c) => (
              <div key={c.id} className="space-y-1.5">
                <CharCard c={c} label={c.gender === "female" ? "daughter" : "son"} onSelect={onSelectNpc} />
                {c.childrenIds.length > 0 && (
                  <div className="ml-8 flex flex-wrap gap-1.5">
                    {c.childrenIds.map((id) => {
                      const grandchild = s.chars[id];
                      return grandchild ? (
                        <button key={id} type="button" onClick={() => onSelectNpc(grandchild.id)} className="min-h-11 inline-flex items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach" aria-label={`View ${grandchild.firstName} ${grandchild.lastName}, grandchild`}>
                          <Chip color="mint">
                            <I name="baby" className="w-3 h-3" /> grandkid {grandchild.firstName}
                          </Chip>
                        </button>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {grandkids.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            {grandkids.map((c) => (
              <CharCard key={c.id} c={c} label="grandchild" onSelect={onSelectNpc} />
            ))}
          </div>
        )}
      </section>
      <section>
        <SectionTitle icon="spark">Friends &amp; Rivals</SectionTitle>
        {friends.length === 0 ? (
          <p className="text-dim text-sm">Nobody yet. The playground is patient.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {friends.map(({ c, value }) => (
              <button key={c.id} type="button" onClick={() => onSelectNpc(c.id)} aria-label={`View ${c.firstName} ${c.lastName}, ${value >= 0 ? "friend" : "rival"}, profile`} className="panel-inset w-full p-3 text-left hover:border-peach/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-peach">
                <div className="flex gap-3 items-center">
                  <Portrait c={c} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">
                      {c.firstName} <span className="text-dim font-semibold">{c.age}</span>
                      <span className="text-[10px] text-dim font-extrabold ml-1.5 uppercase">{value >= 0 ? "friend" : "rival"}</span>
                    </p>
                    <p className="text-xs text-dim truncate">{statusOf(c)}</p>
                  </div>
                </div>
                <div className="mt-2 h-1 rounded-full bg-ink overflow-hidden" title={`closeness ${value}`}>
                  <div
                    className="h-full rounded-full bar-fill"
                    style={{ width: `${Math.abs(value)}%`, background: value >= 0 ? "#5ce8a9" : "#ff6b6b" }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function WorkScreen({ s, g }: { s: GameState; g: GameApi }) {
  const p = s.chars[s.currentId];
  const [applied, setApplied] = useState<string | null>(null);
  const job = p.job ? JOBS[p.job.jobId] : null;
  const appliedThisYear = p.usedActions.includes("jobhunt");
  const cty = country(p.countryId);
  const schoolLine =
    p.age < cty.schoolStart
      ? "Before school. Full-time exploring."
      : p.age < cty.secondaryStart
        ? `Primary school · year ${p.age - cty.schoolStart + 1}`
        : p.age <= cty.examAge
          ? `Secondary school · year ${p.age - cty.secondaryStart + 1}`
          : "Secondary complete";

  return (
    <div className="space-y-6 pb-6">
      <section className="panel p-4">
        <SectionTitle icon="book">Education</SectionTitle>
        {p.uni ? (
          <div>
            <p className="font-bold">University · year {p.uni.year} of 4</p>
            <p className="text-sm text-dim">Major: {majorName(p.uni.major)}</p>
            <div className="flex gap-1.5 mt-2">
              {[1, 2, 3, 4].map((y) => (
                <span key={y} className={`h-1.5 flex-1 rounded-full ${y <= p.uni!.year ? "bg-lav" : "bg-ink"}`} />
              ))}
            </div>
            <p className="text-xs text-dim mt-2">Tuition is paid yearly from your account — or your debt.</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-bold">{p.uni === null && p.education === "university" ? "University graduate" : schoolLine}</p>
            {p.examScore !== undefined && (
              <p className="text-sm text-dim">
                Final exam: <b className="text-peach">{p.examScore}/100</b>
              </p>
            )}
            {p.education === "university" && <Chip color="lav">degree in hand</Chip>}
          </div>
        )}
      </section>

      <section className="panel p-4">
        <SectionTitle icon="briefcase">Work</SectionTitle>
        {p.job && job ? (
          <div>
            <p className="font-display font-bold text-xl text-lav">
              {SENIORITY[p.job.seniority]}
              {job.title}
            </p>
            <p className="text-sm text-dim">{p.job.employer}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Chip color="gold">{fmtMoney(p.job.salary, p.countryId)}/yr</Chip>
              <Chip color="dim">{p.job.years} yr in post</Chip>
              <Chip color="dim">{p.job.seniority}/3 promotions</Chip>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
              <button className="btn-ghost rounded-lg px-3 py-2 text-xs font-bold" disabled={!!actionLock(s, "promote")} onClick={() => g.act("promote")}>
                Ask for promotion
              </button>
              <button className="btn-ghost rounded-lg px-3 py-2 text-xs font-bold" disabled={!!actionLock(s, "resign")} onClick={() => g.act("resign")}>
                Quit
              </button>
              <button className="btn-ghost rounded-lg px-3 py-2 text-xs font-bold" disabled={!!actionLock(s, "retire")} onClick={() => g.act("retire")}>
                Retire
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-dim">
            {p.retired
              ? `Retired. Pension: ${fmtMoney(p.pension, p.countryId)}/yr. The garden is your office.`
              : p.uni
                ? "University has you on pause. Job hunting resumes at graduation."
                : p.age < 16
                  ? "Legally a child. The work market stays a mystery."
                  : "Currently unemployed. The job board below is your friend."}
          </p>
        )}
      </section>

      {p.age >= 16 && !p.uni && !p.retired && (
        <section>
          <SectionTitle icon="target">Job Board</SectionTitle>
          {isImmigrant(p) && (
            <p className="text-xs text-peach mb-2 flex items-center gap-1.5">
              <I name="globe" className="w-3.5 h-3.5" /> Language barrier: fewer doors open until you learn {LANGS[country(p.countryId).languages[0]].name}.
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-2">
            {eligibleJobs(p).map((j) => {
              const locked = !!actionLock(s, "jobhunt");
              const done = applied === j.id;
              return (
                <div key={j.id} className={`panel-inset p-3 ${p.job?.jobId === j.id ? "border-lav/50" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm">{j.title}</p>
                    <Chip color="gold">{fmtMoney(nominal(jobSalary(j, p, 0), s.worldYear), p.countryId)}/yr</Chip>
                  </div>
                  <p className="text-xs text-dim mt-1">{j.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {j.edu === "university" && <Chip color="lav">degree</Chip>}
                    {j.smartsReq > 40 && <Chip color="dim">sharp ({j.smartsReq}+)</Chip>}
                    {j.unstable && <Chip color="coral">unstable</Chip>}
                  </div>
                  <button
                    className="btn-primary rounded-lg px-3 py-1.5 text-xs font-bold mt-2.5"
                    disabled={locked || done}
                    onClick={() => {
                      g.act("apply", j.id);
                      setApplied(j.id);
                      setTimeout(() => setApplied(null), 1200);
                    }}
                  >
                    {done ? "Applied…" : p.job ? "Apply & switch" : "Apply"}
                  </button>
                  {locked && <p className="text-[10px] text-dim mt-1">Job hunting: once per year.</p>}
                </div>
              );
            })}
            {eligibleJobs(p).length === 0 && (
              <p className="text-dim text-sm">No openings match you yet. Education, age, or smarts could open doors.</p>
            )}
          </div>
          {appliedThisYear && !p.job && <p className="text-xs text-dim mt-2">You've already hunted this year. The cover letters need a rest.</p>}
        </section>
      )}
    </div>
  );
}

export function MoneyScreen({ s, g }: { s: GameState; g: GameApi }) {
  const p = s.chars[s.currentId];
  const kid = p.age < 18 && !p.job && !p.uni;
  const income = p.retired ? p.pension : p.job ? p.job.salary : 0;
  const net = netWorth(p);
  const debt = totalDebt(p);
  const purchases: { id: string; name: string; icon: string; note: string }[] = [
    { id: "house", name: "Buy a house", icon: "home", note: `≈ ${fmtMoney(nominal(Math.round(160000 * country(p.countryId).costIndex), s.worldYear), p.countryId)}, 30% down` },
    { id: "car", name: "Buy a car", icon: "car", note: `≈ ${fmtMoney(nominal(28000, s.worldYear), p.countryId)}, four wheels` },
    { id: "vacation", name: "Vacation", icon: "plane", note: `≈ ${fmtMoney(nominal(3000, s.worldYear), p.countryId)}, you, a plane, a beach` },
    { id: "invest", name: "Invest $10K", icon: "wallet", note: `≈ ${fmtMoney(nominal(10000, s.worldYear), p.countryId)} at work` },
    { id: "lottery", name: "Lottery ticket", icon: "dice", note: "a realistic dream" },
    { id: "gift", name: "Gift for a child", icon: "gift", note: "one more toy" },
  ];
  return (
    <div className="space-y-6 pb-6">
      <section className="panel p-5">
        {kid ? (
          <div>
            <SectionTitle icon="coin">Pocket Money</SectionTitle>
            <p className="font-display font-black text-4xl text-gold">{fmtMoney(p.money, p.countryId)}</p>
            <p className="text-sm text-dim mt-1">
              The household bills are your parents' problem — rent, food and school fees come out of their accounts.
              Your problem is this small, mighty fortune.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-end justify-between flex-wrap gap-2">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-dim">Account</p>
                <p className={`font-display font-black text-4xl ${p.money < 0 ? "text-coral" : "text-gold"}`}>{fmtMoney(p.money, p.countryId)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-dim">Net worth</p>
                <p className={`font-display font-bold text-xl ${net < 0 ? "text-coral" : "text-mint"}`}>{fmtMoney(net, p.countryId)}</p>
                <p className="text-[10px] font-bold text-peach capitalize">{financialStatus(p, s.worldYear)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              {[
                { l: "Income / yr", v: income > 0 ? fmtMoney(income, p.countryId) : "—", c: "text-mint" },
                { l: "Living / yr", v: fmtMoney(livingCost(p, p.birthYear + p.age), p.countryId), c: "text-coral" },
                { l: "Debts", v: debt > 0 ? fmtMoney(debt, p.countryId) : "none", c: debt > 0 ? "text-coral" : "text-dim" },
                { l: "Status", v: p.retired ? "retired" : p.job ? "employed" : "seeking", c: "text-lav" },
              ].map((x) => (
                <div key={x.l} className="panel-inset p-2.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-dim">{x.l}</p>
                  <p className={`text-sm font-extrabold ${x.c}`}>{x.v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <SectionTitle icon="home">Assets</SectionTitle>
        {p.house || p.car ? (
          <div className="grid sm:grid-cols-2 gap-2">
            {p.house && (
              <div className="panel-inset p-3">
                <p className="font-bold text-sm flex items-center gap-2"><I name="home" className="w-4 h-4 text-peach" /> House in {p.house.city}</p>
                <Chip color="gold" >{fmtMoney(p.house.value, p.countryId)}</Chip>
              </div>
            )}
            {p.car && (
              <div className="panel-inset p-3">
                <p className="font-bold text-sm flex items-center gap-2"><I name="car" className="w-4 h-4 text-lav" /> {p.car.name}</p>
                <Chip color="gold">{fmtMoney(p.car.value, p.countryId)}</Chip>
              </div>
            )}
          </div>
        ) : (
          <p className="text-dim text-sm">No assets yet. Everything is currently rented, borrowed, or imaginary.</p>
        )}
      </section>

      {p.loans.length > 0 && (
        <section>
          <SectionTitle icon="wallet">Loans</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-2">
            {p.loans.map((ln) => (
              <div key={ln.id} className="panel-inset p-3">
                <p className="font-bold text-sm capitalize flex items-center gap-2">
                  <I name="wallet" className="w-4 h-4 text-coral" />
                  {ln.kind} loan
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <Chip color="coral">{fmtMoney(ln.balance, p.countryId)} left</Chip>
                  <Chip color="dim">{Math.round(ln.rate * 100)}% / yr</Chip>
                  <Chip color="dim">since {ln.yearTaken}</Chip>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-dim mt-2">Interest compounds every year; up to 30% of spare cash automatically goes toward repayment.</p>
        </section>
      )}

      {!kid && (
        <section>
          <SectionTitle icon="spark">Lifestyle Moves</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {purchases.map((x) => {
              const lock = actionLock(s, x.id);
              return (
                <button
                  key={x.id}
                  className="panel-inset p-3 text-left hover:border-peach/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!!lock}
                  onClick={() => g.act(x.id)}
                  title={lock ?? x.note}
                >
                  <I name={x.icon} className="w-4 h-4 text-peach" />
                  <p className="font-bold text-xs mt-1.5">{x.name}</p>
                  <p className="text-[10px] text-dim leading-tight mt-0.5">{lock ?? x.note}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
