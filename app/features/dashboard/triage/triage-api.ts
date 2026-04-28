const TRIAGE_BASE = 'http://localhost:3001/api/triage';

async function triageReq<T>(
	path: string,
	token: string,
	init?: RequestInit,
): Promise<T> {
	const res = await fetch(`${TRIAGE_BASE}${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			...init?.headers,
		},
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.message ?? `Error ${res.status}`);
	}
	return res.json();
}

export const triageApi = {
	turnos: {
		porHospital: (hospitalId: number, token: string, estado?: string) =>
			triageReq<{ success: boolean; data: TriageTurno[]; total: number }>(
				`/turnos/hospital/${hospitalId}${estado ? `?estado=${estado}` : ''}`,
				token,
			),
		cancelar: (turnoId: string, token: string) =>
			triageReq(`/turnos/${turnoId}`, token, { method: 'DELETE' }),
		llamar: (
			turnoId: string,
			medicoId: string,
			consultorio: string,
			token: string,
		) =>
			triageReq(`/turnos/${turnoId}/llamar`, token, {
				method: 'PUT',
				body: JSON.stringify({ medico_id: medicoId, consultorio }),
			}),
	},
	confirmaciones: {
		confirmar: (dto: ConfirmarTriageDto, token: string) =>
			triageReq(`/confirmaciones/confirmar`, token, {
				method: 'POST',
				body: JSON.stringify(dto),
			}),
		porEnfermero: (enfermeroId: string, token: string) =>
			triageReq<{ success: boolean; data: ConfirmacionEnfermero[] }>(
				`/confirmaciones/enfermero/${enfermeroId}`,
				token,
			),
	},
	alertas: {
		porHospital: (hospitalId: number, token: string) =>
			triageReq<{ success: boolean; data: AlertasData }>(
				`/alertas/hospital/${hospitalId}`,
				token,
			),
		confirmar: (alertaId: string, medicoId: string, token: string) =>
			triageReq(`/alertas/${alertaId}/confirmar`, token, {
				method: 'PUT',
				body: JSON.stringify({ medico_id: medicoId }),
			}),
	},
	dashboard: {
		enfermero: (hospitalId: number, token: string) =>
			triageReq<{ success: boolean; data: NurseDashboardData }>(
				`/dashboard/enfermero/${hospitalId}`,
				token,
			),
		paciente: (turnoId: string, token: string) =>
			triageReq<{ success: boolean; data: PatientDashboardData }>(
				`/dashboard/paciente/${turnoId}`,
				token,
			),
		admin: (hospitalId: number, token: string) =>
			triageReq<{ success: boolean; data: AdminDashboardData }>(
				`/dashboard/admin/${hospitalId}`,
				token,
			),
	},
};

// ─── Utilidad para obtener el token JWT del store persistido ──────────────────

export function getTriageToken(): string | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.localStorage.getItem('asclepio-auth');
		if (!raw) return null;
		const parsed = JSON.parse(raw) as {
			state?: { accessToken?: string | null };
		};
		return parsed?.state?.accessToken ?? null;
	} catch {
		return null;
	}
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type TriageLevel = 1 | 2 | 3 | 4 | 5;

export type TurnoEstado =
	| 'CLASIFICACION_PENDIENTE'
	| 'ESPERANDO_CONFIRMACION'
	| 'EN_ESPERA'
	| 'EN_CONSULTA'
	| 'ATENDIDO'
	| 'CANCELADO';

export interface TriageVitalSigns {
	temperature_c: number;
	heart_rate_bpm: number;
	respiratory_rate_bpm: number;
	systolic_bp_mmhg: number;
	diastolic_bp_mmhg: number;
	oxygen_saturation_pct: number;
	weight_kg?: number;
	height_cm?: number;
}

export interface TriagePreliminaryHistory {
	sintomas: string[];
	embarazo: boolean;
	antecedentes: string[];
	posiblesCausas: string[];
	comentario?: string;
	nivelPrioridad: TriageLevel;
	comentariosIA?: string;
	advertenciaIA?: string;
}

export interface RegistroTriage {
	id: string;
	preliminary_history?: TriagePreliminaryHistory;
	vital_signs?: TriageVitalSigns;
	confidence_score?: number;
	status?: string;
}

export interface TriageTurno {
	id: string;
	numero_turno: number;
	estado: TurnoEstado;
	paciente_id: string;
	hospital_id: number;
	registro_triage_id?: string;
	nivel_triage_id?: number;
	nivel_triage?: { id: number; nombre: string };
	registro_triage?: RegistroTriage;
	creado_en: string;
	llamado_en?: string;
	atendido_en?: string;
	tiempo_espera_minutos?: number;
}

export interface ConfirmarTriageDto {
	registro_triage_id: string;
	enfermero_id: string;
	nivel_final: number;
	razon_modificacion?: string;
}

export interface ConfirmacionEnfermero {
	id: string;
	registro_triage_id: string;
	enfermero_id: string;
	nivel_sugerido_ia_preliminar: number;
	nivel_sugerido_ollama: number;
	nivel_final_enfermero: number;
	acepto_sugerencia: boolean;
	razon_modificacion?: string;
	creado_en: string;
}

export interface TriageAlerta {
	id: string;
	turno_id: string;
	hospital_id: number;
	nivel_triage: number;
	tipo_alerta: 'CRITICO' | 'TIEMPO_ESPERA';
	estado: 'PENDIENTE' | 'CONFIRMADA' | 'ESCALADA' | 'RESUELTA';
	medico_asignado_id?: string;
	fecha_creacion: string;
}

export interface AlertasData {
	alertas_criticas: TriageAlerta[];
	alertas_tiempo_espera: TriageAlerta[];
	total_criticas: number;
	total_tiempo_espera: number;
}

export interface NurseDashboardData {
	triage_queue: TriageTurno[];
	next_patients: TriageTurno[];
}

export interface PatientDashboardData {
	turno_info: TriageTurno;
	queue_position: number;
	triage_level?: number;
	wait_time?: number;
}

export interface AdminDashboardData {
	triage_metrics?: Record<string, number>;
	wait_times?: Record<string, number>;
	resource_usage?: Record<string, number>;
}

export const NIVEL_LABEL: Record<number, string> = {
	1: 'Crítico',
	2: 'Muy urgente',
	3: 'Urgente',
	4: 'Poco urgente',
	5: 'No urgente',
};

export const NIVEL_COLOR_CLASS: Record<number, string> = {
	1: 'border-red-500/40 bg-red-500/10 text-red-400',
	2: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
	3: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
	4: 'border-green-500/40 bg-green-500/10 text-green-400',
	5: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
};