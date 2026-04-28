// ============================================
// Dashboard Paciente
// ============================================
import React, { useState } from "react";
import { Card, LvlChip, Icon, Stat, Modal } from "./common";
import { triageData } from "../data/mock";
import type { DashboardProps, NotificationKind } from "../types";

const kindIcon = (kind: NotificationKind) => {
  const map: Record<NotificationKind, { icon: string; color: string }> = {
    ok:   { icon: "check", color: "var(--ok)" },
    info: { icon: "bell",  color: "var(--accent)" },
    warn: { icon: "alert", color: "var(--warn)" },
    crit: { icon: "alert", color: "var(--lvl-1)" },
  };
  return map[kind];
};

export const PatientDashboard: React.FC<DashboardProps> = ({ state, actions }) => {
  const D = triageData;
  const me = D.me;
  const turn = me.currentTurn;
  const [editProfile, setEditProfile] = useState<boolean>(false);

  return (
    <div className="page-grid">
      <div className="col-main">
        {state.patientCalled && (
          <div className="patient-call-banner">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span className="dot dot-pulse" style={{ background: "white", width: 14, height: 14 }} />
              <div>
                <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.85 }}>
                  Te están llamando
                </div>
                <div style={{ fontSize: 28, fontFamily: "var(--font-display)", marginTop: 4 }}>
                  {turn.turn} · Consultorio {state.lastCalled.room}
                </div>
              </div>
            </div>
            <button
              className="btn btn-sm"
              style={{ background: "white", color: "var(--accent-ink)" }}
              onClick={actions.acknowledgeCall}
            >
              Voy en camino <Icon name="chev-right" size={14} />
            </button>
          </div>
        )}

        <Card pad={false}>
          <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "flex-start", borderBottom: "1px solid var(--divider)" }}>
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 6 }}>Tu turno actual</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
                <span className="t-display" style={{ fontSize: 64, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--accent-ink)", lineHeight: 1 }}>
                  {turn.turn}
                </span>
                <LvlChip level={turn.level} />
              </div>
              <div style={{ color: "var(--ink-3)", fontSize: 13, marginTop: 8 }}>
                Llegaste a las <span className="t-num" style={{ color: "var(--ink)" }}>{turn.arrived}</span> · llevas esperando <span className="t-num" style={{ color: "var(--ink)", fontWeight: 600 }}>{turn.waitMin} min</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="t-eyebrow" style={{ marginBottom: 6 }}>Estado</div>
              <span className="chip chip-ok" style={{ fontSize: 13, padding: "6px 10px" }}>
                <span className="dot" style={{ background: "var(--ok)" }} /> {turn.status}
              </span>
              <div style={{ marginTop: 10 }}>
                <button className="btn btn-sm" onClick={() => setEditProfile(true)}>
                  <Icon name="user" size={12} /> Ver perfil
                </button>
              </div>
            </div>
          </div>

          <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 8 }}>Tu posición</div>
              <div style={{ fontSize: 40, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", color: "var(--ink)" }}>
                {turn.position} <span style={{ fontSize: 16, color: "var(--ink-3)" }}>de {turn.total}</span>
              </div>
              <div style={{ marginTop: 10, height: 6, background: "var(--bg-3)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${((turn.total - turn.position) / turn.total) * 100}%`, height: "100%", background: "var(--accent)" }} />
              </div>
            </div>
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 8 }}>Tiempo estimado</div>
              <div style={{ fontSize: 40, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", color: "var(--ink)" }}>
                {turn.etaMin[0]}–{turn.etaMin[1]} <span style={{ fontSize: 16, color: "var(--ink-3)" }}>min</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 10 }}>
                Para tu atención médica. Mantente cerca de recepción.
              </div>
            </div>
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 8 }}>Triage confirmado</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{turn.confirmedBy}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>a las {turn.confirmedAt}</div>
              <div style={{ marginTop: 10 }}>
                <button className="btn btn-sm btn-ghost">Ver explicación IA →</button>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Consejos mientras esperas" pad>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { icon: "bell" as const, title: "Mantente atento al llamado", msg: "La pantalla anuncia los turnos con voz. También recibirás aviso en esta pantalla." },
              { icon: "phone" as const, title: "Guarda tu teléfono cargado", msg: "Te podríamos llamar al celular o enviar un SMS si hay cambios." },
              { icon: "heart" as const, title: "Si te sientes peor", msg: "Acércate de inmediato a recepción o a un enfermero. Tu nivel puede actualizarse." },
              { icon: "clock" as const, title: "Los niveles más urgentes pasan primero", msg: "El orden de atención depende de la gravedad, no de la llegada." },
            ].map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: 14, background: "var(--bg-2)", borderRadius: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={t.icon} size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3, lineHeight: 1.5 }}>{t.msg}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Historial de visitas" pad={false}>
          <table className="tbl">
            <thead><tr><th style={{ width: 120 }}>Fecha</th><th>Motivo</th><th>Médico</th><th>Diagnóstico</th></tr></thead>
            <tbody>
              {D.myVisitHistory.map((v, i) => (
                <tr key={i}>
                  <td className="t-mono" style={{ color: "var(--ink-3)" }}>{v.date}</td>
                  <td>{v.reason}</td>
                  <td style={{ color: "var(--ink-2)", fontSize: 12 }}>{v.doctor}</td>
                  <td style={{ color: "var(--ink-2)", fontSize: 12 }}>{v.dx}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="col-side">
        <Card title="Notificaciones" pad={false}>
          {D.myNotifications.map((n, i) => {
            const K = kindIcon(n.kind);
            return (
              <div key={i} style={{ padding: "14px 16px", borderBottom: i < D.myNotifications.length - 1 ? "1px solid var(--divider)" : "none", display: "flex", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center", color: K.color, flexShrink: 0 }}>
                  <Icon name={K.icon as any} size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.4 }}>{n.msg}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{n.t}</div>
                </div>
              </div>
            );
          })}
        </Card>

        <Card title="Mis datos" pad>
          <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
            <div className="kv"><span className="k">Nombre</span><span className="v">{me.name}</span></div>
            <div className="kv"><span className="k">Documento</span><span className="v t-mono">{me.doc}</span></div>
            <div className="kv"><span className="k">Edad</span><span className="v">{me.age} años</span></div>
            <div className="kv"><span className="k">Grupo sanguíneo</span><span className="v">{me.blood}</span></div>
            <div className="kv"><span className="k">EPS</span><span className="v">{me.eps}</span></div>
            <div className="kv"><span className="k">Teléfono</span><span className="v t-mono">{me.phone}</span></div>
            <div className="kv"><span className="k">Alergias</span><span className="v" style={{ color: "var(--lvl-1-ink)" }}>{me.allergies}</span></div>
          </div>
          <button className="btn btn-sm" style={{ width: "100%", marginTop: 14 }} onClick={() => setEditProfile(true)}>
            <Icon name="edit" size={12} /> Editar datos
          </button>
        </Card>

        <Card title="Resumen clínico" pad>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Stat label="Visitas totales" value="12" />
            <Stat label="Última visita" value="15/03" sub="Dr. Rodríguez" />
          </div>
          <div className="divider" style={{ margin: "14px 0" }} />
          <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Tus datos médicos se comparten con el personal que te atiende en este turno. Puedes solicitar una copia en recepción.
          </div>
        </Card>
      </div>

      {editProfile && (
        <Modal
          title="Mi perfil"
          subtitle={me.name}
          onClose={() => setEditProfile(false)}
          width={560}
          footer={
            <>
              <button className="btn" onClick={() => setEditProfile(false)}>Cerrar</button>
              <button className="btn btn-accent"><Icon name="check" size={14} /> Guardar cambios</button>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label>Nombre</label><input className="input" defaultValue={me.name} /></div>
            <div><label>Documento</label><input className="input" defaultValue={me.doc} disabled /></div>
            <div><label>Teléfono</label><input className="input" defaultValue={me.phone} /></div>
            <div><label>Email</label><input className="input" defaultValue={me.email} /></div>
            <div><label>Grupo sanguíneo</label><input className="input" defaultValue={me.blood} /></div>
            <div><label>EPS</label><input className="input" defaultValue={me.eps} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label>Alergias conocidas</label>
            <input className="input" defaultValue={me.allergies} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label>Enfermedades crónicas</label>
            <input className="input" defaultValue={me.chronic} />
          </div>
        </Modal>
      )}
    </div>
  );
};
