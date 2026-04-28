// ============================================
// Tipos compartidos · Sistema de Triage
// ============================================
import type { ReactNode, CSSProperties } from "react";

// ---------- Niveles ----------
export type TriageLevel = 1 | 2 | 3 | 4 | 5;

export interface LevelConfig {
  label: string;
  max: number; // minutos
  color: string;
}

// ---------- Roles ----------
export type RoleKey =
  | "nurse"
  | "doctor"
  | "chief"
  | "waiting"
  | "patient"
  | "receptionist"
  | "admin";

export interface RoleInfo {
  label: string;
  person: string;
  detail: string;
  email: string;
  loginDesc: string;
}

export interface RoleConfig {
  key: RoleKey;
  label: string;
  icon: IconName;
}

// ---------- Iconos ----------
export type IconName =
  | "bell" | "check" | "x" | "chevronRight" | "chevronDown"
  | "alert" | "activity" | "user" | "users" | "clock"
  | "phone" | "heart" | "hospital" | "list" | "search"
  | "plus" | "eye" | "sun" | "moon" | "bolt"
  | "settings" | "chart" | "file" | "edit" | "play"
  | "print" | "download" | "arrowUp" | "arrowDown" | "qr"
  | "shield" | "database" | "radio"
  | "chev-down" | "chev-right" | "chev-left" | "logout";

// ---------- Signos vitales ----------
export interface Vitals {
  pa: string;  // presión arterial
  fc: number;  // frecuencia cardiaca
  temp: number;
  spo2: number;
  fr: number;  // frecuencia respiratoria
}

// ---------- Alertas ----------
export interface CriticalAlert {
  id: string;
  level: TriageLevel;
  turn: string;
  patient: string;
  age: number;
  tag: string;
  detail: string;
  minutes: number;
}

export type AlertSeverity = "critical" | "urgent";

export interface EscalatedAlert {
  id: string;
  severity: AlertSeverity;
  turn: string;
  patient: string;
  level: TriageLevel;
  escalatedAt: number;
  reason: string;
  by: string;
  responsible: string;
  vital?: string;
}

// ---------- Confirmaciones pendientes (triage IA) ----------
export interface PendingConfirmation {
  id: string;
  turn: string;
  patient: string;
  age: number;
  arrived: string;
  suggested: TriageLevel;
  confidence: number;
  vitals: Vitals;
  symptoms: string[];
  observation: string;
}

// ---------- Cola ----------
export interface QueueItem {
  pos: number;
  turn: string;
  patient: string;
  age: number;
  level: TriageLevel;
  wait: number;
  room: number | null;
  vital: string;
  overMax?: boolean;
}

// ---------- Historial del enfermero ----------
export interface NurseHistoryItem {
  at: string;
  turn: string;
  patient: string;
  level: TriageLevel;
  accepted: boolean;
  delta: string | null;
}

// ---------- Siguiente paciente (vista médico) ----------
export interface NextPatient {
  turn: string;
  patient: string;
  age: number;
  doc: string;
  wait: number;
  level: TriageLevel;
  confirmedBy: string;
  at: string;
  iaSuggested: TriageLevel;
  iaConfidence: number;
  symptoms: string[];
  vitals: Vitals;
  vitalAlerts: (keyof Vitals)[];
}

// ---------- Atenciones en curso (médico) ----------
export interface DoctorAttention {
  room: number;
  turn: string;
  patient: string;
  status: string;
  since: number;
}

// ---------- Staff (jefe de guardia) ----------
export interface StaffNurse {
  name: string;
  confirms: number;
  match: number;
}

export interface StaffDoctor {
  name: string;
  attended: number;
  avg: number;
}

// ---------- Gráficas ----------
export interface HourlyIntake {
  h: string;
  c: number;
}

export interface LevelDistribution {
  level: TriageLevel;
  pct: number;
}

export interface IAEffectiveness {
  accepted: number;
  up: number;
  down: number;
}

// ---------- Paciente ----------
export interface PatientTurn {
  turn: string;
  level: TriageLevel;
  status: string;
  arrived: string;
  waitMin: number;
  position: number;
  total: number;
  etaMin: [number, number];
  confirmedBy: string;
  confirmedAt: string;
}

export interface PatientProfile {
  name: string;
  doc: string;
  dob: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  blood: string;
  eps: string;
  allergies: string;
  chronic: string;
  lastVisit: string;
  currentTurn: PatientTurn;
}

export interface VisitHistoryItem {
  date: string;
  time: string;
  reason: string;
  doctor: string;
  dx: string;
}

export type NotificationKind = "ok" | "info" | "warn" | "crit";

export interface PatientNotification {
  t: string;
  kind: NotificationKind;
  title: string;
  msg: string;
}

// ---------- Recepcionista ----------
export type TurnStatus =
  | "waiting" | "triage" | "triage-done"
  | "in-care" | "attended" | "cancelled";

export interface TodayTurn {
  turn: string;
  time: string;
  patient: string;
  doc: string;
  eps: string;
  status: TurnStatus;
}

export interface StatusLabel {
  label: string;
  cls: string;
}

export interface SearchablePatient {
  name: string;
  doc: string;
  blood: string;
  age: number;
  eps: string;
  phone: string;
}

export interface ScheduledAppointment {
  time: string;
  patient: string;
  doctor: string;
  room: number;
}

// ---------- Admin ----------
export interface Hospital {
  id: number;
  name: string;
  turns: number;
  staff: number;
  active: boolean;
}

export interface SystemUser {
  name: string;
  email: string;
  role: string;
  hospital: string;
  active: boolean;
}

export type HealthStatus = "ok" | "warn" | "crit";

export interface SystemHealthItem {
  service: string;
  status: HealthStatus;
  detail: string;
}

export interface LiveEvent {
  t: string;
  kind: NotificationKind;
  msg: string;
  where: string;
}

export interface AuditLogEntry {
  t: string;
  user: string;
  action: string;
}

// ---------- Último llamado ----------
export interface LastCalled {
  turn: string;
  room: number;
  at: string;
}

// ---------- Estado global ----------
export interface AppState {
  criticalAlerts: CriticalAlert[];
  pendingConfirmations: PendingConfirmation[];
  queue: QueueItem[];
  nextPatient: NextPatient;
  escalatedAlerts: EscalatedAlert[];
  lastCalled: LastCalled;
  patientCalled: boolean;
}

export interface TriageDecision {
  level: TriageLevel;
  reason: string;
  accepted: boolean;
}

export interface AppActions {
  confirmTriage: (id: string, decision: TriageDecision) => void;
  confirmAlert: (id: string) => void;
  callNext: () => void;
  resolveEscalation: (id: string) => void;
  createTurn: (
    patient: SearchablePatient,
    type: AttentionType,
    notes: string
  ) => void;
  acknowledgeCall: () => void;
}

export type AttentionType = "urgencias" | "consulta" | "procedimiento";

// ---------- Props de dashboards ----------
export interface DashboardProps {
  state: AppState;
  actions: AppActions;
}

// ---------- Toasts ----------
export interface Toast {
  id: string;
  title: string;
  msg: string;
  kind: NotificationKind;
}

// ---------- Tweaks ----------
export type ThemeMode = "light" | "dark";
export type AccentKey = "teal" | "coral" | "sage" | "indigo";

export interface Tweaks {
  theme: ThemeMode;
  accent: AccentKey;
  simulateIncoming: boolean;
  simulateCritical: boolean;
}

// ---------- TriageData (mock) ----------
export interface TriageData {
  hospital: { name: string; shortName: string; logoMark: string };
  currentTime: string;
  levels: Record<TriageLevel, LevelConfig>;
  roles: Record<RoleKey, RoleInfo>;
  criticalAlerts: CriticalAlert[];
  pendingConfirmations: PendingConfirmation[];
  queue: QueueItem[];
  lastCalled: LastCalled;
  myHistory: NurseHistoryItem[];
  nextPatient: NextPatient;
  doctorInAttention: DoctorAttention[];
  escalatedAlerts: EscalatedAlert[];
  staffNurses: StaffNurse[];
  staffDoctors: StaffDoctor[];
  hourlyIntake: HourlyIntake[];
  levelDist: LevelDistribution[];
  iaEffectiveness: IAEffectiveness;
  me: PatientProfile;
  myVisitHistory: VisitHistoryItem[];
  myNotifications: PatientNotification[];
  todayTurns: TodayTurn[];
  statusLabels: Record<TurnStatus, StatusLabel>;
  patientSearch: SearchablePatient[];
  scheduledToday: ScheduledAppointment[];
  scheduledTomorrow: ScheduledAppointment[];
  hospitals: Hospital[];
  systemUsers: SystemUser[];
  systemHealth: SystemHealthItem[];
  liveEvents: LiveEvent[];
  auditLog: AuditLogEntry[];
}

// ---------- Props utilitarios ----------
export interface WithChildren {
  children?: ReactNode;
}

export type Style = CSSProperties;
