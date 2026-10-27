import type { LogEntry, LogKind } from "../game/types";
import { I } from "./ui";

const KIND_STYLE: Record<LogKind, { color: string; icon: string }> = {
  birth: { color: "#ff5fa2", icon: "heart" },
  good: { color: "#5ce8a9", icon: "check" },
  bad: { color: "#ff6b6b", icon: "x" },
  neutral: { color: "#a395cc", icon: "moon" },
  event: { color: "#ff5fa2", icon: "spark" },
  money: { color: "#ffd166", icon: "coin" },
  family: { color: "#ff8fbf", icon: "users" },
  career: { color: "#a78bfa", icon: "briefcase" },
  world: { color: "#8d7fb8", icon: "globe" },
  milestone: { color: "#ffb054", icon: "flag" },
  choice: { color: "#ffd166", icon: "spark" },
};

export function Journal({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-dim text-sm p-6 text-center">The story starts the moment you turn the first page.</p>;
  }
  const list = [...entries].reverse(); // newest first
  const out: React.ReactNode[] = [];
  let lastYear: number | null = null;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.year !== lastYear) {
      out.push(
        <div key={`y${e.id}`} className="flex items-center gap-3 pt-4 pb-1 first:pt-0">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-dim">
            {e.year} · age {e.age}
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>
      );
      lastYear = e.year;
    }
    const st = KIND_STYLE[e.kind] ?? KIND_STYLE.neutral;
    out.push(
      <div key={e.id} className="anim-rise flex gap-3 py-1.5" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
        <span className="mt-1.5 shrink-0">
          <I name={st.icon} className="w-3.5 h-3.5" />
          <span className="sr-only">{e.kind}</span>
        </span>
        <p className="text-[15px] leading-relaxed" style={{ color: e.kind === "neutral" || e.kind === "world" ? "#cfc6e8" : st.color }}>
          {e.text}
        </p>
      </div>
    );
  }
  return <div className="px-1 pb-4">{out}</div>;
}
