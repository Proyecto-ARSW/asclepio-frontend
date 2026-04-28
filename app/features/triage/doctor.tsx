// ============================================
// Dashboard Médico
// ============================================
import React, { useState } from "react";
import { Card, Dot, LvlChip, Icon, Stat, WaitTime, Modal } from "./common";
import { triageData } from "../data/mock";
import type { DashboardProps, QueueItem } from "../types";

// ---------- VitalBig ----------
interface VitalBigProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  alert?: boolean;
}

const VitalBig: React.FC<VitalBigProps> = ({ label, value, unit, alert }) => (
  <div>
    <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
      <span className="t-mono" style={{ fontSize: 18, fontWeight: 600, color: alert ? "var(--lvl-1-ink)" : "var(--ink)" }}>
        {value}
      </span>
      {unit && <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{unit}</span>}
      {alert && <span style={{ fontSize: 11, color: "var(--lvl-1-ink)" }}>⚠</span>}
    </div>
  </div>
);

// ---------- PatientDetailModal ----------
interface PatientDetailModalProps {
  patient: QueueItem;
  onClose: () => void;
  onCall: () => void;
}

const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ patient, onClose, onCall }) => (
  <Modal
    title={`Detalle de triage · ${patient.turn}`}
    subtitle={`${patient.patient} · ${patient.age} años`}
    onClose={onClose}
    width={640}
    footer={
      <>
        <button className="btn" onClick={onClose}>Cerrar</button>
        <button className="btn btn-accent" onClick={onCall}>
          <Icon name="bell" size={14} /> Llamar paciente
        </button>
      </>
    }
  >
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <section>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>Datos del paciente</div>
        <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
          <div className="kv"><span className="k">Documento</span><span className="v t-mono">9876543210</span></div>
          <div className="kv"><span className="k">Edad</span><span className="v">{patient.age} años</span></div>
          <div className="kv"><span className="k">EPS</span><span className="v">Sura</span></div>
          <div className="kv"><span className="k">Grupo sanguíneo</span><span className="v">O+</span></div>
          <div className="kv"><span className="k">Teléfono</span><span className="v t-mono">300 222 3344</span></div>
        </div>
      </section>
      <section>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>Triage</div>
        <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
          <div className="kv"><span className="k">Nivel</span><span className="v"><LvlChip level={patient.level} /></span></div>
          <div className="kv"><span className="k">Confirmado</span><span className="v">Enf. María G. · 10:25</span></div>
          <div className="kv"><span className="k">IA sugirió</span><span className="v">Nivel {patient.level} (85%) ✓</span></div>
          <div className="kv"><span className="k">En espera</span><span className="v">{patient.wait} minutos</span></div>
          <div className="kv"><span className="k">Posición</span><span className="v">{patient.pos} de 15</span></div>
        </div>
      </section>
    </div>

    <div className="divider" style={{ margin: "18px 0" }} />

    <div className="t-eyebrow" style={{ marginBottom: 10 }}>Signos vitales</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, padding: 14, background: "var(--bg-2)", borderRadius: 10 }}>
      <VitalBig label="PA" value="140/90" />
      <VitalBig label="FC" value="88" unit="bpm" />
      <VitalBig label="T°" value="37.8" unit="°C" alert />
      <VitalBig label="SatO₂" value="96" unit="%" />
      <VitalBig label="FR" value="18" unit="rpm" />
    </div>

    <div style={{ marginTop: 16, padding: 14, background: "var(--accent-soft)", borderRadius: 10, color: "var(--accent-ink)", fontSize: 13 }}>
      <strong>Observación IA:</strong> Posible cuadro gastrointestinal agudo, requiere atención en próxima hora.
    </div>
  </Modal>
);

// ---------- Main dashboard ----------
export const DoctorDashboard: React.FC<DashboardProps> = ({ state, actions }) => {
  const D = triageData;
  const [detailPatient, setDetailPatient] = useState<QueueItem | null>(null);
  const next = state.nextPatient;

  return (
    <div className="page-grid">
      <div className="col-main">
        <Card pad={false} className="next-patient-card">
          <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-2)" }}>
            <div className="card-title" style={{ fontSize: 13 }}>
              <span className="t-eyebrow" style={{ marginRight: 4 }}>Siguiente en cola</span>
            </div>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              <Icon name="clock" size={12} /> Espera {next.wait} min
            </span>
          </div>
          <div style={{ padding: "22px 24px", display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <LvlChip level={next.level} />
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  Confirmado por {next.confirmedBy} a las {next.at}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
                <span className="t-mono" style={{ fontSize: 18, fontWeight: 600 }}>{next.turn}</span>
                <span className="t-display" style={{ fontSize: 28, letterSpacing: "-0.02em", color: "var(--ink)" }}>
                  {next.patient}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 18 }}>
                {next.age} años · CC {next.doc}
              </div>

              <div className="t-eyebrow" style={{ marginBottom: 8 }}>Síntomas principales</div>
              <ul style={{ margin: 0, padding: "0 0 0 20px", fontSize: 14, color: "var(--ink)", lineHeight: 1.7 }}>
                {next.symptoms.map((s, i) => <li key={i}>{s}</li>)}
              </ul>

              <div className="t-eyebrow" style={{ marginTop: 18, marginBottom: 10 }}>Signos vitales</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, padding: 14, background: "var(--bg-2)", borderRadius: 10 }}>
                <VitalBig label="PA" value={next.vitals.pa} />
                <VitalBig label="FC" value={next.vitals.fc} unit="bpm" />
                <VitalBig label="T°" value={next.vitals.temp} unit="°C" />
                <VitalBig label="SatO₂" value={next.vitals.spo2} unit="%" alert={next.vitalAlerts.includes("spo2")} />
                <VitalBig label="FR" value={next.vitals.fr} unit="rpm" />
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-3)" }}>
                <Icon name="bolt" size={12} /> IA sugirió Nivel {next.iaSuggested} ({next.iaConfidence}%) — coincidió con confirmación
              </div>
            </div>

            <button className="btn btn-accent btn-lg" onClick={actions.callNext} style={{ flexShrink: 0 }}>
              <Icon name="bell" size={16} /> Llamar paciente
            </button>
          </div>
        </Card>

        <Card title="Cola de espera" count={state.queue.length} pad={false}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th style={{ width: 80 }}>Turno</th>
                <th>Paciente</th>
                <th style={{ width: 140 }}>Nivel</th>
                <th style={{ width: 100 }}>Espera</th>
                <th style={{ width: 120 }} />
              </tr>
            </thead>
            <tbody>
              {state.queue.slice(0, 10).map(q => (
                <tr key={q.turn} className="clickable" onClick={() => setDetailPatient(q)}>
                  <td style={{ color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{q.pos}</td>
                  <td className="t-mono">{q.turn}</td>
                  <td>
                    <div>{q.patient}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {q.age} años{q.vital ? ` · ${q.vital}` : ""}
                    </div>
                  </td>
                  <td><LvlChip level={q.level} /></td>
                  <td><WaitTime minutes={q.wait} overMax={q.overMax} /></td>
                  <td>
                    <button className="btn btn-sm" onClick={e => { e.stopPropagation(); setDetailPatient(q); }}>
                      Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="col-side">
        <Card title="Alertas escaladas" count={1} eyebrow="Jefe de guardia" pad={false}>
          <div className="alert-card">
            <Dot level={1} pulse />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <LvlChip level={1} />
                <span className="t-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>T005</span>
                <span style={{ fontWeight: 500 }}>Juan Pérez</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 8, lineHeight: 1.5 }}>
                Nivel 1 sin atención tras 10 min. Escalada por Dra. Ana Martínez hace 2 min.
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-sm" onClick={() => setDetailPatient(state.queue[0])}>Ver paciente</button>
                <button className="btn btn-sm btn-crit" onClick={actions.callNext}>Atender ahora</button>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Mis pacientes en atención" count={D.doctorInAttention.length} pad={false}>
          {D.doctorInAttention.map((p, i) => (
            <div key={i} style={{ padding: "12px 16px", borderBottom: i < D.doctorInAttention.length - 1 ? "1px solid var(--divider)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="t-mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>Consultorio {p.room}</span>
                  <span className="t-mono" style={{ fontSize: 12, fontWeight: 600 }}>{p.turn}</span>
                  <span>{p.patient}</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="chip chip-ok" style={{ fontSize: 11 }}>
                  <span className="dot" style={{ background: "var(--ok)" }} /> {p.status} · {p.since} min
                </span>
                <button className="btn btn-sm">Finalizar</button>
              </div>
            </div>
          ))}
        </Card>

        <Card title="Estadísticas de hoy">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Stat label="Atendidos" value="8" />
            <Stat label="Promedio" value="15" sub="min por paciente" />
          </div>
          <div className="divider" style={{ margin: "14px 0" }} />
          <div className="t-eyebrow" style={{ marginBottom: 10 }}>Por nivel de triage</div>
          <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
            {([[1, 1], [2, 2], [3, 3], [4, 2]] as [1 | 2 | 3 | 4, number][]).map(([l, c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Dot level={l} />
                <span style={{ color: "var(--ink-2)" }}>Nivel {l}</span>
                <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{c}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {detailPatient && (
        <PatientDetailModal
          patient={detailPatient}
          onClose={() => setDetailPatient(null)}
          onCall={() => {
            actions.callNext();
            setDetailPatient(null);
          }}
        />
      )}
    </div>
  );
};
