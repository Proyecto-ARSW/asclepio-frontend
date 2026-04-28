// ============================================
// Dashboard Enfermero
// ============================================
import React, { useState } from "react";
import { Card, Dot, LvlChip, Icon, LevelBar, Stat, WaitTime, Modal, Avatar } from "./common";
import { triageData } from "../data/mock";
import type {
  DashboardProps,
  PendingConfirmation,
  CriticalAlert,
  TriageLevel,
  Vitals,
  TriageDecision,
} from "../types";

// ---------- Vital inline ----------
interface VitalProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
}

const Vital: React.FC<VitalProps> = ({ label, value, unit }) => (
  <span>
    <span style={{ color: "var(--ink-3)" }}>{label}</span>{" "}
    <span className="t-num" style={{ color: "var(--ink)" }}>
      {value}
      {unit || ""}
    </span>
  </span>
);

// ---------- Confidence meter ----------
interface ConfidenceMeterProps {
  pct: number;
}

const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ pct }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
    <span style={{ width: 56, height: 4, background: "var(--bg-3)", borderRadius: 999, overflow: "hidden" }}>
      <span style={{ display: "block", height: "100%", width: `${pct}%`, background: "var(--accent)" }} />
    </span>
    <span className="t-num" style={{ color: "var(--ink-2)" }}>{pct}%</span>
  </span>
);

// ---------- Confirm triage modal ----------
interface ConfirmTriageModalProps {
  patient: PendingConfirmation;
  onClose: () => void;
  onConfirm: (decision: TriageDecision) => void;
}

const ConfirmTriageModal: React.FC<ConfirmTriageModalProps> = ({ patient, onClose, onConfirm }) => {
  const [level, setLevel] = useState<TriageLevel>(patient.suggested);
  const [reason, setReason] = useState<string>("");
  const modified = level !== patient.suggested;
  const canConfirm = !modified || reason.trim().length > 0;

  return (
    <Modal
      title={`Confirmar triage · ${patient.turn}`}
      subtitle={`${patient.patient} · ${patient.age} años · llegada ${patient.arrived}`}
      onClose={onClose}
      width={640}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-accent"
            disabled={!canConfirm}
            onClick={() => onConfirm({ level, reason, accepted: !modified })}
          >
            <Icon name="check" size={14} /> Confirmar triage
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Evaluación IA</div>
          <div style={{ padding: 14, background: "var(--bg-2)", borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <LvlChip level={patient.suggested} />
              <ConfidenceMeter pct={patient.confidence} />
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55 }}>{patient.observation}</div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-3)" }}>
              Síntomas: {patient.symptoms.join(", ")}
            </div>
          </div>
        </div>
        <div>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Signos vitales</div>
          <div style={{ padding: 14, background: "var(--bg-2)", borderRadius: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
            <Vital label="PA" value={patient.vitals.pa} />
            <Vital label="FC" value={patient.vitals.fc} unit=" bpm" />
            <Vital label="T°" value={patient.vitals.temp} unit="°C" />
            <Vital label="SatO₂" value={patient.vitals.spo2} unit="%" />
            <Vital label="FR" value={patient.vitals.fr} unit=" rpm" />
          </div>
        </div>
      </div>

      <div className="t-eyebrow" style={{ marginBottom: 10 }}>Decisión del enfermero</div>
      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        {([1, 2, 3, 4, 5] as TriageLevel[]).map(l => (
          <label key={l} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
            border: `1px solid ${level === l ? "var(--accent)" : "var(--border)"}`,
            borderRadius: 10, cursor: "pointer",
            background: level === l ? "var(--accent-soft)" : "var(--surface)",
          }}>
            <input type="radio" name="lvl" checked={level === l} onChange={() => setLevel(l)} style={{ margin: 0 }} />
            <LvlChip level={l} />
            {l === patient.suggested && (
              <span style={{ fontSize: 11, color: "var(--accent-ink)", marginLeft: "auto" }}>
                sugerido por IA
              </span>
            )}
          </label>
        ))}
      </div>

      {modified && (
        <div>
          <label>Razón de modificación <span style={{ color: "var(--lvl-1-ink)" }}>*</span></label>
          <textarea
            className="textarea"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Describe brevemente por qué modificas el nivel sugerido..."
          />
        </div>
      )}
    </Modal>
  );
};

// ---------- Main dashboard ----------
export const NurseDashboard: React.FC<DashboardProps> = ({ state, actions }) => {
  const D = triageData;
  const [confirmPatient, setConfirmPatient] = useState<PendingConfirmation | null>(null);
  const [criticalDetail, setCriticalDetail] = useState<CriticalAlert | null>(null);

  const alerts = state.criticalAlerts;
  const pending = state.pendingConfirmations;
  const queue = state.queue;
  const counts = ([1, 2, 3, 4, 5] as TriageLevel[]).map(l =>
    queue.filter(q => q.level === l).length
  );

  return (
    <div className="page-grid">
      <div className="col-main">
        <Card
          title="Alertas críticas pendientes"
          count={alerts.length}
          eyebrow="Prioritario"
          pad={false}
        >
          {alerts.length === 0 && (
            <div style={{ padding: 28, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              Sin alertas pendientes
            </div>
          )}
          {alerts.map(a => (
            <div key={a.id} className={`alert-card ${a.level === 2 ? "lvl-2-border" : ""}`}>
              <Dot level={a.level} pulse={a.level === 1} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <LvlChip level={a.level} />
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{a.patient}</span>
                  <span className="t-mono" style={{ color: "var(--ink-3)", fontSize: 12 }}>{a.turn}</span>
                </div>
                <div style={{ color: "var(--ink-2)", fontSize: 13, marginTop: 6 }}>
                  <span style={{ color: "var(--ink-3)" }}>{a.tag}:</span> {a.detail}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "var(--lvl-1-ink)" }}>
                  <Icon name="clock" size={12} /> Sin confirmar hace {a.minutes} min
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn btn-sm" onClick={() => setCriticalDetail(a)}>Ver detalles</button>
                <button
                  className={`btn btn-sm ${a.level === 1 ? "btn-crit" : "btn-accent"}`}
                  onClick={() => actions.confirmAlert(a.id)}
                >
                  {a.level === 1 ? "Confirmar alerta" : "Confirmar triage"}
                </button>
              </div>
            </div>
          ))}
        </Card>

        <Card title="Turnos pendientes de confirmación" count={pending.length} pad={false}>
          {pending.map(p => (
            <div key={p.id} style={{ padding: "16px 18px", borderBottom: "1px solid var(--divider)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="t-mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{p.turn}</span>
                    <span style={{ fontWeight: 500, color: "var(--ink)" }}>{p.patient}</span>
                    <span style={{ color: "var(--ink-3)", fontSize: 12 }}>{p.age} años · {p.arrived}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="bolt" size={12} /> IA sugiere
                    </span>
                    <LvlChip level={p.suggested} />
                    <ConfidenceMeter pct={p.confidence} />
                  </div>
                  <div style={{ display: "flex", gap: 18, marginTop: 10, flexWrap: "wrap", fontSize: 12, color: "var(--ink-2)" }}>
                    <Vital label="PA" value={p.vitals.pa} />
                    <Vital label="FC" value={p.vitals.fc} unit="bpm" />
                    <Vital label="T°" value={p.vitals.temp} unit="°C" />
                    <Vital label="SatO₂" value={p.vitals.spo2} unit="%" />
                    <Vital label="FR" value={p.vitals.fr} unit="rpm" />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-3)" }}>
                    Síntomas: {p.symptoms.map((s, i) => (
                      <span key={i} className="t-mono" style={{ padding: "2px 6px", background: "var(--bg-2)", borderRadius: 4, marginRight: 4 }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-sm" onClick={() => setConfirmPatient(p)}>Evaluación</button>
                  <button className="btn btn-sm btn-accent" onClick={() => setConfirmPatient(p)}>Confirmar triage</button>
                </div>
              </div>
            </div>
          ))}
        </Card>

        <Card title="Mis confirmaciones de hoy" count={D.myHistory.length} pad={false}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 70 }}>Hora</th>
                <th style={{ width: 80 }}>Turno</th>
                <th>Paciente</th>
                <th>Decisión</th>
              </tr>
            </thead>
            <tbody>
              {D.myHistory.map((h, i) => (
                <tr key={i}>
                  <td className="t-mono" style={{ color: "var(--ink-3)" }}>{h.at}</td>
                  <td className="t-mono">{h.turn}</td>
                  <td>{h.patient}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <LvlChip level={h.level} />
                      {h.accepted ? (
                        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                          <Icon name="check" size={11} /> aceptado
                        </span>
                      ) : (
                        <span className="chip chip-warn" style={{ fontSize: 10 }}>
                          modificado {h.delta}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="col-side">
        <Card title="Cola de pacientes en espera" count={queue.length}>
          <div style={{ marginBottom: 14 }}>
            {([1, 2, 3, 4, 5] as TriageLevel[]).map(l => (
              <LevelBar key={l} level={l} count={counts[l - 1]} total={queue.length} />
            ))}
          </div>
          <div className="divider" style={{ marginBottom: 12 }} />
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Ordenados por prioridad</div>
          <div style={{ maxHeight: 360, overflowY: "auto", margin: "0 -18px" }} className="scroll-y">
            {queue.slice(0, 12).map(q => (
              <div key={q.turn} style={{ display: "grid", gridTemplateColumns: "24px 1fr auto", gap: 10, padding: "8px 18px", alignItems: "center", fontSize: 13 }}>
                <span style={{ color: "var(--ink-3)", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{q.pos}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <Dot level={q.level} />
                  <span className="t-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{q.turn}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.patient}</span>
                </div>
                <WaitTime minutes={q.wait} overMax={q.overMax} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Resumen del turno">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Stat label="Atendidos hoy" value="12" />
            <Stat label="Pendientes" value={pending.length} />
            <Stat label="Match IA" value="95%" sub="vs equipo 89%" />
            <Stat label="Tiempo prom." value="4.8" sub="minutos por triage" />
          </div>
        </Card>
      </div>

      {confirmPatient && (
        <ConfirmTriageModal
          patient={confirmPatient}
          onClose={() => setConfirmPatient(null)}
          onConfirm={decision => {
            actions.confirmTriage(confirmPatient.id, decision);
            setConfirmPatient(null);
          }}
        />
      )}

      {criticalDetail && (
        <Modal
          title={`Alerta crítica · ${criticalDetail.turn}`}
          subtitle={criticalDetail.patient}
          onClose={() => setCriticalDetail(null)}
          footer={
            <>
              <button className="btn" onClick={() => setCriticalDetail(null)}>Cerrar</button>
              <button
                className="btn btn-crit"
                onClick={() => {
                  actions.confirmAlert(criticalDetail.id);
                  setCriticalDetail(null);
                }}
              >
                Confirmar alerta
              </button>
            </>
          }
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <LvlChip level={criticalDetail.level} />
            <span style={{ color: "var(--ink-2)" }}>{criticalDetail.tag}</span>
          </div>
          <div style={{ fontSize: 14, color: "var(--ink)" }}>{criticalDetail.detail}</div>
          <div style={{ marginTop: 16, padding: 14, background: "var(--lvl-1-soft)", borderRadius: 10, color: "var(--lvl-1-ink)", fontSize: 13 }}>
            Paciente lleva {criticalDetail.minutes} minutos sin confirmación. Verifica signos vitales in situ y confirma.
          </div>
        </Modal>
      )}
    </div>
  );
};
