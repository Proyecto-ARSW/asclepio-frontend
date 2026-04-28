// ============================================
// App shell: topbar, sidebar, estado global
// ============================================
import React, { useEffect, useState, type ReactNode } from "react";
import { Icon, Avatar } from "./common";
import { LoginScreen, ROLES } from "./Login";
import { NurseDashboard } from "./Nurse";
import { DoctorDashboard } from "./Doctor";
import { ChiefDashboard } from "./Chief";
import { WaitingRoomScreen } from "./WaitingRoom";
import { PatientDashboard } from "./Patient";
import { ReceptionistDashboard } from "./Receptionist";
import { AdminDashboard } from "./Admin";
import { triageData } from "../data/mock";
import type {
  AppActions,
  AppState,
  RoleKey,
  Toast,
  Tweaks,
  AccentKey,
  ThemeMode,
  TriageDecision,
  SearchablePatient,
  AttentionType,
} from "../types";

// ---------- Dark mode toggle ----------
interface ThemeSetters {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}

// ---------- TopBar ----------
interface TopBarProps extends ThemeSetters {
  role: RoleKey;
  onLogout: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ role, onLogout, theme, setTheme }) => {
  const R = triageData.roles[role];
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand-mark">HGP</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{triageData.hospital.shortName}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Triage inteligente</div>
        </div>
      </div>
      <div className="topbar-right">
        <button
          className="btn btn-sm btn-ghost"
          title="Tema"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
        </button>
        <div className="topbar-me">
          <Avatar name={R.person} size="sm" />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{R.person}</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{R.label} · {R.detail}</div>
          </div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={onLogout} title="Cerrar sesión">
          <Icon name="logout" size={14} />
        </button>
      </div>
    </header>
  );
};

// ---------- Sidebar ----------
interface SidebarProps {
  role: RoleKey;
  setRole: (r: RoleKey) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, setRole }) => (
  <aside className="sidebar">
    <div className="t-eyebrow" style={{ padding: "0 12px 8px" }}>Cambiar vista</div>
    {ROLES.map(r => (
      <button
        key={r.key}
        className={`nav-item ${role === r.key ? "active" : ""}`}
        onClick={() => setRole(r.key)}
      >
        <Icon name={r.icon} size={14} />
        <span>{r.label}</span>
      </button>
    ))}
    <div style={{ flex: 1 }} />
    <div style={{ padding: "10px 12px", fontSize: 11, color: "var(--ink-3)", borderTop: "1px solid var(--divider)" }}>
      <div>Conectado · WS en vivo</div>
      <div style={{ marginTop: 2 }}>Versión 2.4.1</div>
    </div>
  </aside>
);

// ---------- Toasts ----------
interface ToastsProps {
  toasts: Toast[];
}

const Toasts: React.FC<ToastsProps> = ({ toasts }) => (
  <div className="toast-stack">
    {toasts.map(t => (
      <div key={t.id} className={`toast toast-${t.kind}`}>
        <Icon name={t.kind === "crit" ? "alert" : t.kind === "warn" ? "bell" : "check"} size={14} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>{t.msg}</div>
        </div>
      </div>
    ))}
  </div>
);

// ---------- App ----------
const TWEAK_DEFAULTS: Tweaks = /*EDITMODE-BEGIN*/ {
  theme: "light",
  accent: "teal",
  simulateIncoming: false,
  simulateCritical: false,
} /*EDITMODE-END*/;

export const App: React.FC = () => {
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [role, setRole] = useState<RoleKey>("nurse");
  const [tweaks, setTweaks] = useState<Tweaks>(TWEAK_DEFAULTS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [state, setState] = useState<AppState>({
    criticalAlerts: triageData.criticalAlerts,
    pendingConfirmations: triageData.pendingConfirmations,
    queue: triageData.queue,
    nextPatient: triageData.nextPatient,
    escalatedAlerts: triageData.escalatedAlerts,
    lastCalled: triageData.lastCalled,
    patientCalled: false,
  });

  // Apply theme/accent
  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.accent = tweaks.accent;
  }, [tweaks.theme, tweaks.accent]);

  const pushToast = (t: Omit<Toast, "id">) => {
    const id = `t${Date.now()}${Math.random()}`;
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000);
  };

  const actions: AppActions = {
    confirmTriage: (id, decision: TriageDecision) => {
      setState(s => ({
        ...s,
        pendingConfirmations: s.pendingConfirmations.filter(p => p.id !== id),
      }));
      pushToast({
        kind: "ok",
        title: "Triage confirmado",
        msg: decision.accepted
          ? `Nivel ${decision.level} aceptado tal como sugirió la IA`
          : `Nivel modificado a ${decision.level}`,
      });
    },
    confirmAlert: id => {
      setState(s => ({ ...s, criticalAlerts: s.criticalAlerts.filter(a => a.id !== id) }));
      pushToast({ kind: "ok", title: "Alerta confirmada", msg: "La alerta crítica ha sido atendida" });
    },
    callNext: () => {
      const next = state.nextPatient;
      setState(s => ({
        ...s,
        lastCalled: { turn: next.turn, room: 3, at: triageData.currentTime },
        patientCalled: true,
      }));
      pushToast({
        kind: "info",
        title: `Llamando a ${next.patient}`,
        msg: `Turno ${next.turn} · Consultorio 3`,
      });
    },
    resolveEscalation: id => {
      setState(s => ({ ...s, escalatedAlerts: s.escalatedAlerts.filter(a => a.id !== id) }));
      pushToast({ kind: "ok", title: "Alerta resuelta", msg: "La escalada ha sido cerrada" });
    },
    createTurn: (patient: SearchablePatient, type: AttentionType) => {
      pushToast({
        kind: "ok",
        title: "Turno creado",
        msg: `${patient.name} · ${type}`,
      });
    },
    acknowledgeCall: () => {
      setState(s => ({ ...s, patientCalled: false }));
      pushToast({ kind: "info", title: "Dirígete al consultorio", msg: "Recepción ha sido notificada" });
    },
  };

  const handleLogin = (r: RoleKey) => {
    setRole(r);
    setLoggedIn(true);
  };

  const handleLogout = () => setLoggedIn(false);

  const setTheme = (t: ThemeMode) => setTweaks(prev => ({ ...prev, theme: t }));
  const setAccent = (a: AccentKey) => setTweaks(prev => ({ ...prev, accent: a }));

  if (!loggedIn) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <Toasts toasts={toasts} />
      </>
    );
  }

  const dashboards: Record<RoleKey, ReactNode> = {
    nurse:        <NurseDashboard state={state} actions={actions} />,
    doctor:       <DoctorDashboard state={state} actions={actions} />,
    chief:        <ChiefDashboard state={state} actions={actions} />,
    waiting:      <WaitingRoomScreen state={state} actions={actions} />,
    patient:      <PatientDashboard state={state} actions={actions} />,
    receptionist: <ReceptionistDashboard state={state} actions={actions} />,
    admin:        <AdminDashboard state={state} actions={actions} />,
  };

  const isPublicScreen = role === "waiting";

  return (
    <>
      {!isPublicScreen && <TopBar role={role} onLogout={handleLogout} theme={tweaks.theme} setTheme={setTheme} />}
      <div className={`app-body ${isPublicScreen ? "app-body-public" : ""}`}>
        {!isPublicScreen && <Sidebar role={role} setRole={setRole} />}
        <main className="main">{dashboards[role]}</main>
      </div>
      <Toasts toasts={toasts} />
    </>
  );
};
