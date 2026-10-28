import type { ReactNode } from "react";
import type { Char } from "../game/types";
import { country } from "../game/world";
import { proficiencyLabel } from "../game/content";

const PATHS: Record<string, string[]> = {
  feather: ["M20 4c-7 0-13 5-15 14l-1 3 3-1c9-2 13-8 13-16z", "M7 17 17 7"],
  users: ["M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M2 20c0-3.3 2.7-5 6-5s6 1.7 6 5", "M16 11a3 3 0 1 0-1.8-5.4", "M17.5 15.5c2.6.4 4.5 1.9 4.5 4.5"],
  briefcase: ["M4 8h16v12H4z", "M9 8V5h6v3", "M4 13h16"],
  coin: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v10", "M9 9.5c0-1 1.3-1.7 3-1.7s3 .8 3 1.9c0 2.5-6 1.7-6 4.3 0 1.1 1.3 1.9 3 1.9s3-.7 3-1.7"],
  pulse: ["M3 12h4l2-6 4 12 2-6h6"],
  heart: ["M12 20c-5.3-4-8-6.6-8-10a4.6 4.6 0 0 1 8-3.2A4.6 4.6 0 0 1 20 10c0 3.4-2.7 6-8 10z"],
  bulb: ["M9 18h6", "M10 21h4", "M12 3a6 6 0 0 1 4 10.4c-.8.8-1 1.6-1 2.6h-6c0-1-.2-1.8-1-2.6A6 6 0 0 1 12 3z"],
  star: ["m12 3 2.7 5.6 6.3.9-4.6 4.3 1.1 6.2L12 17l-5.5 3 1.1-6.2L3 9.5l6.3-.9z"],
  home: ["M4 11l8-7 8 7", "M6 9.5V20h12V9.5", "M10 20v-6h4v6"],
  globe: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M3 12h18", "M12 3c3 3.6 3 14.4 0 18", "M12 3c-3 3.6-3 14.4 0 18"],
  plane: ["M21 3 3 10.5l7 2.5 2.5 7z", "M10 13 21 3"],
  baby: ["M12 20a8 8 0 1 1 0-16 8 8 0 0 1 0 16z", "M9 11h.01", "M15 11h.01", "M9 14.5c1.7 1.5 4.3 1.5 6 0", "M12 4c-1-1.8 1.2-3 2-2.4"],
  dice: ["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", "M8 8h.01", "M16 8h.01", "M12 12h.01", "M8 16h.01", "M16 16h.01"],
  check: ["m5 13 4 4L19 7"],
  x: ["M6 6l12 12", "M18 6 6 18"],
  plus: ["M12 5v14", "M5 12h14"],
  skull: ["M12 3a8 8 0 0 0-8 8c0 3 1.6 5.2 3 6.3V21h10v-3.7c1.4-1.1 3-3.3 3-6.3a8 8 0 0 0-8-8z", "M9 12h.01", "M15 12h.01", "M10 15.5c1.2 1 2.8 1 4 0"],
  ring: ["M12 21a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z", "M9 5l3-3 3 3-3 3.4z"],
  sun: ["M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z", "M12 2v2.5", "M12 19.5V22", "M2 12h2.5", "M19.5 12H22", "M4.9 4.9l1.8 1.8", "M17.3 17.3l1.8 1.8", "M19.1 4.9l-1.8 1.8", "M6.7 17.3l-1.8 1.8"],
  wallet: ["M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z", "M4 7V6a2 2 0 0 1 2-2h11", "M16.5 13.5h.01"],
  book: ["M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z", "M4 19V5", "M9 7h6"],
  leaf: ["M5 19C5 9.5 11 5 20 4c-.5 9-4.5 15-13 15-1 0-2-.3-2 0z", "M5 19c3-5 7-8.5 11-10.5"],
  spark: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"],
  target: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z", "M12 12h.01"],
  gift: ["M4 10h16v10H4z", "M3 6h18v4H3z", "M12 6v14", "M12 6c-4 0-5.2-4-2.2-4 2 0 2.2 2 2.2 4z", "M12 6c4 0 5.2-4 2.2-4-2 0-2.2 2-2.2 4z"],
  car: ["M4 16v-4l2-5h12l2 5v4", "M4 12h16", "M6.5 16v2.5", "M17.5 16v2.5", "M7.5 14.5h.01", "M16.5 14.5h.01"],
  moon: ["M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  chevr: ["m9 5 7 7-7 7"],
  flag: ["M5 3v18", "M5 4h12l-2.5 3.5L17 11H5"],
};

export function I({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  const paths = PATHS[name] ?? PATHS.spark;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

const GEN_COLORS: [string, string][] = [
  ["#ffb054", "#ff5fa2"],
  ["#a78bfa", "#5ce8a9"],
  ["#ffd166", "#ff8f6b"],
];

export function Portrait({ c, size = 40, className = "" }: { c: Char; size?: number; className?: string }) {
  const [c1, c2] = GEN_COLORS[((c.generation - 1) % 3 + 3) % 3];
  const gid = `pg-${c.id}`;
  const dead = !c.alive;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} style={dead ? { opacity: 0.55, filter: "grayscale(0.9)" } : undefined} aria-hidden>
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill={`url(#${gid})`} />
      <text x="20" y="26" textAnchor="middle" fontFamily="Fraunces, serif" fontWeight="700" fontSize="19" fill="#1c1030">
        {c.firstName.charAt(0).toUpperCase()}
      </text>
    </svg>
  );
}

export function CountryTag({ id, className = "" }: { id: string; className?: string }) {
  const c = country(id);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${className}`} title={c.name}>
      <span className="flex w-4 h-4 rounded-full overflow-hidden ring-1 ring-white/20 shrink-0">
        <span className="w-1/2 h-full" style={{ background: c.colors[0] }} />
        <span className="w-1/2 h-full" style={{ background: c.colors[1] }} />
      </span>
      {c.code}
    </span>
  );
}

export function StatBar({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const v = Math.round(value);
  return (
    <div className="min-w-0 flex-1" title={`${label}: ${v}/100`}>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-dim">
          <span style={{ color }}>
            <I name={icon} className="w-3.5 h-3.5" />
          </span>
          {label}
        </span>
        <span className="text-[11px] font-extrabold tabular-nums" style={{ color }}>
          {v}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-ink overflow-hidden">
        <div className="h-full rounded-full bar-fill" style={{ width: `${Math.max(3, Math.min(100, v))}%`, background: color }} />
      </div>
    </div>
  );
}

export function LangBar({ name, value }: { name: string; value: number }) {
  const v = Math.round(value);
  const color = v >= 80 ? "#5ce8a9" : v >= 50 ? "#a78bfa" : "#ffb054";
  return (
    <div className="flex items-center gap-2" title={`${name}: ${v}/100 — ${proficiencyLabel(v)}`}>
      <span className="w-24 truncate text-sm font-semibold">{name}</span>
      <div className="flex-1 h-1.5 rounded-full bg-ink overflow-hidden">
        <div className="h-full rounded-full bar-fill" style={{ width: `${Math.max(3, v)}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums text-dim w-7 text-right">{v}</span>
      <span className="text-[10px] text-dim w-16">{proficiencyLabel(v)}</span>
    </div>
  );
}

export function Chip({ children, color = "lav", title }: { children: ReactNode; color?: string; title?: string }) {
  const palette: Record<string, string> = {
    lav: "bg-lav/15 text-lav border-lav/30",
    pink: "bg-pink/15 text-pink border-pink/30",
    mint: "bg-mint/15 text-mint border-mint/30",
    peach: "bg-peach/15 text-peach border-peach/30",
    gold: "bg-gold/15 text-gold border-gold/30",
    coral: "bg-coral/15 text-coral border-coral/30",
    dim: "bg-ink3 text-dim border-line",
  };
  return (
    <span title={title} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${palette[color] ?? palette.lav}`}>
      {children}
    </span>
  );
}

export function Modal({ children, onClose, wide = false }: { children: ReactNode; onClose?: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[88vh] overflow-y-auto panel anim-pop p-5 sm:p-6 m-0 sm:m-auto shadow-2xl shadow-black/60`}>
        {children}
      </div>
    </div>
  );
}

export function DiceBtn({ onClick, small = false }: { onClick: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${small ? "p-1" : "p-1.5"} rounded-md bg-ink3 border border-line text-dim hover:text-peach hover:border-peach/50 transition-colors`}
      title="Randomize"
    >
      <I name="dice" className="w-4 h-4" />
    </button>
  );
}

export function SectionTitle({ children, icon }: { children: ReactNode; icon?: string }) {
  return (
    <h3 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-dim mb-2">
      {icon && <I name={icon} className="w-3.5 h-3.5" />}
      {children}
    </h3>
  );
}
