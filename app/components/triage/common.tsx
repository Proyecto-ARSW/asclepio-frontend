// ============================================
// Componentes comunes: iconos, chips, cards…
// ============================================
import React, { type CSSProperties, type ReactNode } from "react";
import type { IconName, TriageLevel, LevelDistribution, HourlyIntake } from "../types";

// ---------- Icon ----------
interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export const Icon: React.FC<IconProps> = ({ name, size = 16, ...rest }) => {
  const paths: Partial<Record<IconName, ReactNode>> = {
    bell: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9zm3 13a3 3 0 0 0 6 0" />,
    check: <path d="M20 6 9 17l-5-5" />,
    x: <path d="M18 6 6 18M6 6l12 12" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    alert: (<><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></>),
    activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
    user: (<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>),
    users: (<><circle cx="9" cy="8" r="4"/><path d="M3 21a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="3"/><path d="M17 15a5 5 0 0 1 5 6"/></>),
    clock: (<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
    heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
    hospital: (<><path d="M12 6v4M14 8h-4M18 21V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16M6 21h12M10 21v-5h4v5"/></>),
    list: (<><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>),
    search: (<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>),
    plus: <path d="M12 5v14M5 12h14" />,
    eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>),
    sun: (<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>),
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
    bolt: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
    settings: (<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>),
    chart: (<><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></>),
    file: (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>),
    edit: <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />,
    play: <path d="m6 3 14 9-14 9V3z" />,
    print: (<><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></>),
    download: (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></>),
    arrowUp: <path d="M12 19V5M5 12l7-7 7 7" />,
    arrowDown: <path d="M12 5v14M5 12l7 7 7-7" />,
    qr: (<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"/></>),
    shield: <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z" />,
    database: (<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v7c0 1.66 4 3 9 3s9-1.34 9-3V5M3 12v7c0 1.66 4 3 9 3s9-1.34 9-3v-7"/></>),
    radio: (<><path d="M4.93 19.07a10 10 0 0 1 0-14.14M19.07 4.93a10 10 0 0 1 0 14.14M7.76 16.24a6 6 0 0 1 0-8.49M16.24 7.76a6 6 0 0 1 0 8.49"/><circle cx="12" cy="12" r="2"/></>),
    "chev-down": <path d="m6 9 6 6 6-6" />,
    "chev-right": <path d="m9 18 6-6-6-6" />,
    "chev-left": <path d="m15 18-6-6 6-6" />,
    logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></>),
  };
  const p = paths[name];
  if (!p) return null;
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {p}
    </svg>
  );
};

// ---------- LvlChip ----------
interface LvlChipProps {
  level: TriageLevel;
  text?: string;
}

export const LvlChip: React.FC<LvlChipProps> = ({ level, text }) => {
  const levels: Record<TriageLevel, string> = {
    1: "Resucitación", 2: "Emergencia", 3: "Urgente", 4: "Estándar", 5: "No urgente",
  };
  return (
    <span className={`lvl-chip lvl-${level}`}>
      <span className="dot" />
      <span>Nivel {level}</span>
      {text && <span style={{ opacity: 0.7, marginLeft: 2 }}>· {text ?? levels[level]}</span>}
    </span>
  );
};

// ---------- Dot ----------
interface DotProps {
  level: TriageLevel;
  pulse?: boolean;
}

export const Dot: React.FC<DotProps> = ({ level, pulse }) => (
  <span
    className={`dot lvl-${level} ${pulse ? "dot-pulse" : ""}`}
    style={{ color: `var(--lvl-${level})` }}
  />
);

// ---------- Avatar ----------
interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
}

export const Avatar: React.FC<AvatarProps> = ({ name, size }) => {
  const initials = (name || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className={`avatar ${size === "sm" ? "avatar-sm" : size === "lg" ? "avatar-lg" : ""}`}>
      {initials}
    </div>
  );
};

// ---------- Modal ----------
interface ModalProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export const Modal: React.FC<ModalProps> = ({ title, subtitle, onClose, children, footer, width }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()} style={width ? { width } : undefined}>
      <div className="modal-header">
        <div>
          <div className="card-title" style={{ fontSize: 15 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{subtitle}</div>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" /></button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </div>
  </div>
);

// ---------- Card ----------
interface CardProps {
  title?: ReactNode;
  count?: number | string | null;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
  eyebrow?: ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, count, action, children, className = "", pad = true, eyebrow }) => (
  <div className={`card ${className}`}>
    {title && (
      <div className="card-header">
        <div className="card-title">
          {eyebrow && <span className="t-eyebrow" style={{ marginRight: 4 }}>{eyebrow}</span>}
          {title}
          {count != null && <span className="count-pill">{count}</span>}
        </div>
        {action}
      </div>
    )}
    <div style={pad ? { padding: 18 } : undefined}>{children}</div>
  </div>
);

// ---------- Stat ----------
interface StatProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  mono?: boolean;
}

export const Stat: React.FC<StatProps> = ({ label, value, sub, mono }) => (
  <div className="stat">
    <div className="stat-label">{label}</div>
    <div className={`stat-value ${mono ? "t-mono" : ""}`}>{value}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
);

// ---------- LevelBar ----------
interface LevelBarProps {
  level: TriageLevel;
  count: number;
  total: number;
}

export const LevelBar: React.FC<LevelBarProps> = ({ level, count, total }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="lvl-bar-row">
      <div className="label"><span className={`dot lvl-${level}`} /> Nivel {level}</div>
      <div className="lvl-bar-track">
        <div className="lvl-bar-fill" style={{ width: `${pct}%`, background: `var(--lvl-${level})` }} />
      </div>
      <div className="count">{count}</div>
    </div>
  );
};

// ---------- WaitTime ----------
interface WaitTimeProps {
  minutes: number;
  overMax?: boolean;
}

export const WaitTime: React.FC<WaitTimeProps> = ({ minutes, overMax }) => {
  const style: CSSProperties = {
    color: overMax ? "var(--lvl-1-ink)" : "var(--ink-2)",
    fontWeight: overMax ? 600 : 400,
  };
  return (
    <span className="t-num" style={style}>
      {minutes} min{overMax && " ⚠"}
    </span>
  );
};

// ---------- BarChart ----------
interface BarChartProps {
  data: HourlyIntake[];
  max?: number;
  accent?: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, max, accent = "var(--accent)" }) => {
  const m = max || Math.max(...data.map(d => d.c));
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 120 }}>
      {data.map(d => (
        <div key={d.h} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 10, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{d.c}</div>
          <div style={{ width: "100%", height: `${(d.c / m) * 90}px`, background: accent, borderRadius: "4px 4px 0 0", opacity: 0.85 }} />
          <div style={{ fontSize: 10, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{d.h}</div>
        </div>
      ))}
    </div>
  );
};

// ---------- Donut ----------
interface DonutProps {
  data: LevelDistribution[];
  size?: number;
}

export const Donut: React.FC<DonutProps> = ({ data, size = 140 }) => {
  const total = data.reduce((s, d) => s + d.pct, 0);
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={12} />
      {data.map((d, i) => {
        const len = (d.pct / total) * c;
        const circle = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={`var(--lvl-${d.level})`} strokeWidth={12}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        );
        offset += len;
        return circle;
      })}
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontFamily="var(--font-display)" fontSize={20} fill="var(--ink)">
        {total}%
      </text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize={10} fill="var(--ink-3)" letterSpacing="0.06em">
        TOTAL
      </text>
    </svg>
  );
};
