// ============================================
// Dashboard Administrador
// ============================================
import React from "react";
import { Card, Dot, Icon, Stat, Avatar } from "./common";
import { triageData } from "../data/mock";
import type { DashboardProps, TriageLevel } from "../types";

export const AdminDashboard: React.FC<DashboardProps> = () => {
  const D = triageData;

  return (
    <div className="page-grid">
      <div className="col-main">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <Card pad><Stat label="Hospitales activos" value="5" sub="de 5 totales" /></Card>
          <Card pad><Stat label="Turnos hoy" value="142" sub="128 pacientes únicos" /></Card>
          <Card pad><Stat label="Atenciones" value="105" sub="1h 12min promedio" /></Card>
          <Card pad><Stat label="Conexiones WS" value="45" sub="tiempo real" /></Card>
        </div>

        <Card
          title="Gestión de hospitales"
          count={D.hospitals.length}
          pad={false}
          action={<button className="btn btn-sm btn-accent"><Icon name="plus" size={12} /> Agregar hospital</button>}
        >
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 40 }}>ID</th>
                <th>Nombre</th>
                <th>Turnos hoy</th>
                <th>Personal</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {D.hospitals.map(h => (
                <tr key={h.id}>
                  <td className="t-mono" style={{ color: "var(--ink-3)" }}>#{h.id}</td>
                  <td style={{ fontWeight: 500 }}>{h.name}</td>
                  <td className="t-num">{h.turns}</td>
                  <td className="t-num">{h.staff}</td>
                  <td><span className="chip chip-ok"><span className="dot" style={{ background: "var(--ok)" }} /> Activo</span></td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm btn-ghost"><Icon name="eye" size={12} /></button>
                    <button className="btn btn-sm btn-ghost"><Icon name="edit" size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card
          title="Gestión de usuarios"
          count={"342"}
          pad={false}
          action={<button className="btn btn-sm btn-accent"><Icon name="plus" size={12} /> Crear usuario</button>}
        >
          <div style={{ padding: "10px 14px", display: "flex", gap: 8, borderBottom: "1px solid var(--divider)" }}>
            <select className="select" style={{ width: 160 }}>
              <option>Todos los roles</option><option>Enfermero</option><option>Médico</option><option>Recepcionista</option>
            </select>
            <select className="select" style={{ width: 180 }}><option>Todos los hospitales</option></select>
            <div style={{ flex: 1, position: "relative" }}>
              <Icon name="search" size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }} />
              <input className="input" placeholder="Buscar por nombre o email..." style={{ paddingLeft: 34 }} />
            </div>
          </div>
          <table className="tbl">
            <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Hospital</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {D.systemUsers.map(u => (
                <tr key={u.email}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={u.name} size="sm" />{u.name}</div></td>
                  <td className="t-mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{u.email}</td>
                  <td><span className="chip">{u.role}</span></td>
                  <td style={{ fontSize: 12, color: "var(--ink-2)" }}>{u.hospital}</td>
                  <td>{u.active
                    ? <span className="chip chip-ok"><span className="dot" style={{ background: "var(--ok)" }} /> Activo</span>
                    : <span className="chip chip-crit"><span className="dot" style={{ background: "var(--lvl-1)" }} /> Inactivo</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm btn-ghost"><Icon name="edit" size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
          <Card title="Configuración del sistema" eyebrow="Parámetros" pad>
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Tiempos máximos de espera por nivel</div>
            <div style={{ display: "grid", gap: 8 }}>
              {([[1, 0], [2, 10], [3, 60], [4, 120], [5, 240]] as [TriageLevel, number][]).map(([l, m]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Dot level={l} />
                  <span style={{ fontSize: 13, color: "var(--ink-2)", flex: 1 }}>Nivel {l}</span>
                  <input className="input" defaultValue={m} style={{ width: 70, textAlign: "right" }} />
                  <span style={{ fontSize: 12, color: "var(--ink-3)", width: 46 }}>min</span>
                </div>
              ))}
            </div>
            <div className="divider" style={{ margin: "16px 0" }} />
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Configuración de IA</div>
            <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "var(--ink-2)", flex: 1 }}>Umbral de confianza mínimo</span>
                <input className="input" defaultValue="70" style={{ width: 70, textAlign: "right" }} />
                <span style={{ fontSize: 12, color: "var(--ink-3)", width: 46 }}>%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "var(--ink-2)", flex: 1 }}>Usar Ollama si confianza &lt;</span>
                <input className="input" defaultValue="85" style={{ width: 70, textAlign: "right" }} />
                <span style={{ fontSize: 12, color: "var(--ink-3)", width: 46 }}>%</span>
              </div>
            </div>
            <div className="divider" style={{ margin: "16px 0" }} />
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Canales de notificación</div>
            <div style={{ display: "grid", gap: 8 }}>
              {([
                ["Email para alertas críticas", true],
                ["SMS para pacientes nivel 1-2", true],
                ["Push en app móvil", true],
                ["WhatsApp", false],
              ] as [string, boolean][]).map(([label, on], i) => (
                <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" defaultChecked={on} /> {label}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--divider)" }}>
              <button className="btn">Cancelar</button>
              <button className="btn btn-accent"><Icon name="check" size={14} /> Guardar cambios</button>
            </div>
          </Card>

          <Card title="Reportes y analytics" pad>
            <label>Tipo de reporte</label>
            <select className="select">
              <option>Actividad diaria</option>
              <option>Rendimiento de personal</option>
              <option>Efectividad de IA</option>
              <option>Tiempos de espera</option>
              <option>Distribución por niveles</option>
              <option>Alertas y escalamientos</option>
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <div><label>Desde</label><input className="input" placeholder="DD/MM/AAAA" /></div>
              <div><label>Hasta</label><input className="input" placeholder="DD/MM/AAAA" /></div>
            </div>
            <label style={{ marginTop: 12 }}>Hospital</label>
            <select className="select">
              <option>Todos los hospitales</option>
              {D.hospitals.map(h => <option key={h.id}>{h.name}</option>)}
            </select>
            <label style={{ marginTop: 12 }}>Formato</label>
            <div style={{ display: "flex", gap: 6 }}>
              {["PDF", "Excel", "CSV"].map((f, i) => (
                <button key={f} className={`btn btn-sm ${i === 0 ? "btn-primary" : ""}`} style={{ flex: 1 }}>{f}</button>
              ))}
            </div>
            <button className="btn btn-accent" style={{ width: "100%", marginTop: 14 }}>
              <Icon name="download" size={14} /> Generar reporte
            </button>
            <div className="divider" style={{ margin: "16px 0" }} />
            <div className="t-eyebrow" style={{ marginBottom: 10 }}>Reportes recientes</div>
            <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
              {([
                ["21/04/2026", "Actividad diaria (Hosp. General)", "PDF"],
                ["20/04/2026", "Rendimiento mensual (Todos)", "Excel"],
                ["15/04/2026", "Efectividad IA (Q1 2026)", "PDF"],
              ] as [string, string, string][]).map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name="file" size={14} style={{ color: "var(--ink-3)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "var(--ink)" }}>{r[1]}</div>
                    <div style={{ color: "var(--ink-3)", fontSize: 11 }}>{r[0]} · {r[2]}</div>
                  </div>
                  <button className="btn btn-sm btn-ghost"><Icon name="download" size={12} /></button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="col-side">
        <Card title="Salud del sistema" eyebrow="En vivo" pad>
          <div style={{ display: "grid", gap: 10 }}>
            {D.systemHealth.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <span className="dot" style={{ background: s.status === "ok" ? "var(--ok)" : "var(--warn)" }} />
                <span style={{ flex: 1 }}>{s.service}</span>
                <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.detail}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Monitoreo en tiempo real" eyebrow="Por hospital" pad>
          <div style={{ display: "grid", gap: 12 }}>
            {D.hospitals.slice(0, 3).map(h => (
              <div key={h.id} style={{ padding: 12, background: "var(--bg-2)", borderRadius: 10 }}>
                <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 6 }}>{h.name}</div>
                <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--ink-3)" }}>
                  <span>Cola <span className="t-num" style={{ color: "var(--ink)", fontWeight: 600 }}>{h.turns % 20}</span></span>
                  <span>Alertas <span className="t-num" style={{ color: "var(--lvl-1-ink)", fontWeight: 600 }}>{h.id === 1 ? 2 : 0}</span></span>
                  <span>Activo <span className="t-num" style={{ color: "var(--ink)", fontWeight: 600 }}>hace 3 seg</span></span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Eventos recientes" pad={false}>
          <div style={{ maxHeight: 280, overflowY: "auto" }} className="scroll-y">
            {D.liveEvents.map((e, i) => (
              <div key={i} style={{ padding: "10px 14px", borderBottom: i < D.liveEvents.length - 1 ? "1px solid var(--divider)" : "none", display: "flex", gap: 10, fontSize: 12 }}>
                <span className="dot" style={{ background: e.kind === "crit" ? "var(--lvl-1)" : e.kind === "warn" ? "var(--warn)" : e.kind === "ok" ? "var(--ok)" : "var(--accent)", marginTop: 6 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "var(--ink)" }}>{e.msg}</div>
                  <div style={{ color: "var(--ink-3)", fontSize: 11, marginTop: 2 }}>
                    <span className="t-mono">{e.t}</span> · {e.where}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Log de auditoría" pad={false}>
          <div style={{ maxHeight: 240, overflowY: "auto" }} className="scroll-y">
            {D.auditLog.map((l, i) => (
              <div key={i} style={{ padding: "8px 14px", borderBottom: i < D.auditLog.length - 1 ? "1px solid var(--divider)" : "none", fontSize: 11 }}>
                <div style={{ display: "flex", gap: 8, color: "var(--ink-3)" }}>
                  <span className="t-mono">{l.t}</span>
                  <span style={{ color: "var(--ink-2)" }}>{l.user}</span>
                </div>
                <div style={{ color: "var(--ink)", marginTop: 2 }}>{l.action}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
