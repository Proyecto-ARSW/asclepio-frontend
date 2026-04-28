import { AI_API_URL, TRIAGE_API_URL } from '@/lib/env';
import { apiGetBlob, getStoredToken } from '@/lib/api';
import type {
	AddCommentRequest,
	CloseProcedureRequest,
	ISISProcedureRecord,
	ISISTriageIntakeResponse,
	TriageClinicalSection,
	TriageComment,
	TriageConfirmacion,
	TriagePreliminaryHistory,
	TriageProcedure,
	TriageTextInputRequest,
	TriageVitalSigns,
	TriageVoiceInputRequest,
	UpdateVitalSignsRequest,
} from './triage.types';

class TriageApiError extends Error {
	status: number;
	code: string;
	constructor(message: string, status: number, code = 'unknown_error') {
		super(message);
		this.name = 'TriageApiError';
		this.status = status;
		this.code = code;
	}
}

async function handleResponse<T>(res: Response): Promise<T> {
	if (!res.ok) {
		let message = 'Error en la solicitud';
		let code = 'unknown_error';
		try {
			const body = (await res.json()) as Record<string, unknown>;
			message = String(body.detail ?? body.message ?? message);
			code = String(body.code ?? code);
		} catch {
			message = `${res.status}: ${res.statusText}`;
		}
		throw new TriageApiError(message, res.status, code);
	}
	return res.json() as Promise<T>;
}

function getIsisHeaders(): Record<string, string> {
	const token = getStoredToken();
	return {
		'Content-Type': 'application/json',
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
}

function buildSections(ph: TriagePreliminaryHistory | undefined): TriageClinicalSection[] {
	if (!ph) return [];
	const sections: TriageClinicalSection[] = [];
	if (ph.sintomas?.length) sections.push({ title: 'Síntomas', content: ph.sintomas.join(', ') });
	if (ph.posiblesCausas?.length) sections.push({ title: 'Posibles causas', content: ph.posiblesCausas.join(', ') });
	if (ph.antecedentes?.length) sections.push({ title: 'Antecedentes', content: ph.antecedentes.join(', ') });
	if (ph.comentariosIA) sections.push({ title: 'Análisis IA', content: ph.comentariosIA });
	if (ph.advertenciaIA) sections.push({ title: 'Advertencia IA', content: ph.advertenciaIA });
	return sections;
}

function mapISISToTriageProcedure(raw: ISISProcedureRecord): TriageProcedure {
	const ph = raw.preliminary_history;
	const comments: TriageComment[] = (raw.comments ?? []).map((c) => ({
		id: c.id,
		author_role: c.author,
		author_name: c.author,
		comment: c.comment,
		created_at: c.created_at,
	}));

	const vitalSigns: TriageVitalSigns | undefined = raw.vital_signs
		? {
				temperature_c: raw.vital_signs.temperature_c,
				heart_rate_bpm: raw.vital_signs.heart_rate_bpm,
				respiratory_rate_bpm: raw.vital_signs.respiratory_rate_bpm,
				systolic_bp_mmhg: raw.vital_signs.systolic_bp_mmhg,
				diastolic_bp_mmhg: raw.vital_signs.diastolic_bp_mmhg,
				oxygen_saturation_pct: raw.vital_signs.oxygen_saturation_pct,
				weight_kg: raw.vital_signs.weight_kg,
				height_cm: raw.vital_signs.height_cm,
			}
		: undefined;

	return {
		procedure_id: raw.procedure_id,
		patient_id: raw.patient_id,
		status: raw.status,
		transcript: raw.transcript,
		input_type: raw.input_type,
		preliminary_history: ph,
		confidence_score: raw.confidence_score,
		triage_data: {
			summary: ph?.comentario || ph?.comentariosIA || '',
			sections: buildSections(ph),
		},
		vital_signs: vitalSigns,
		comments,
		created_at: raw.created_at,
		updated_at: raw.updated_at,
		webhook_delivery: raw.webhook_delivery,
	};
}

/* ─── Ingreso de síntomas (paciente → ISISvoice directo con JWT) ─── */

export async function sendTriageTextInputToISIS(
	payload: TriageTextInputRequest,
): Promise<ISISTriageIntakeResponse> {
	const res = await fetch(`${AI_API_URL}/api/v1/triage/symptoms/text`, {
		method: 'POST',
		headers: getIsisHeaders(),
		body: JSON.stringify({ text_input: payload.text }),
	});
	return handleResponse<ISISTriageIntakeResponse>(res);
}

export async function sendTriageVoiceInputToISIS(
	payload: TriageVoiceInputRequest,
): Promise<ISISTriageIntakeResponse> {
	const res = await fetch(`${AI_API_URL}/api/v1/triage/symptoms/audio/base64`, {
		method: 'POST',
		headers: getIsisHeaders(),
		body: JSON.stringify({
			audio_base64: payload.audio_base64,
			file_name: payload.file_name,
			mime_type: payload.mime_type,
		}),
	});
	return handleResponse<ISISTriageIntakeResponse>(res);
}

/* ─── Consulta de procedimiento individual ─── */

export async function getTriageProcedureFromISIS(
	procedureId: string,
): Promise<TriageProcedure> {
	const res = await fetch(
		`${AI_API_URL}/api/v1/triage/procedure/${procedureId}`,
		{ headers: getIsisHeaders() },
	);
	const raw = await handleResponse<ISISProcedureRecord>(res);
	return mapISISToTriageProcedure(raw);
}

/* ─── Listado para enfermero/médico ─── */

export async function getTriageRecordsFromISIS(
	limit = 100,
	status?: 'pending' | 'resolved' | 'vital_signs_recorded' | 'closed' | 'all',
): Promise<TriageProcedure[]> {
	const params = new URLSearchParams({ limit: String(limit) });
	if (status && status !== 'all') params.set('status', status);
	const res = await fetch(`${AI_API_URL}/api/v1/triage/records?${params.toString()}`, {
		headers: getIsisHeaders(),
	});
	const data = await handleResponse<{ items: ISISProcedureRecord[] }>(res);
	return (data.items ?? []).map(mapISISToTriageProcedure);
}

/* ─── Mis procedimientos (paciente) ─── */

export async function getMyProceduresFromISIS(
	limit = 10,
): Promise<TriageProcedure[]> {
	const res = await fetch(
		`${AI_API_URL}/api/v1/triage/procedures/my?limit=${limit}`,
		{ headers: getIsisHeaders() },
	);
	const data = await handleResponse<{ items: ISISProcedureRecord[] }>(res);
	return (data.items ?? []).map(mapISISToTriageProcedure);
}

/* ─── Actualizar signos vitales (enfermero/médico → ISISvoice) ─── */

export async function updateTriageVitalSignsToISIS(
	procedureId: string,
	payload: UpdateVitalSignsRequest,
): Promise<TriageProcedure> {
	const res = await fetch(
		`${AI_API_URL}/api/v1/triage/record/${procedureId}/vital-signs`,
		{
			method: 'PUT',
			headers: getIsisHeaders(),
			body: JSON.stringify(payload.vital_signs),
		},
	);
	const raw = await handleResponse<ISISProcedureRecord>(res);
	return mapISISToTriageProcedure(raw);
}

/* ─── Agregar comentario (enfermero/médico → ISISvoice) ─── */

export async function addTriageCommentToISIS(
	procedureId: string,
	payload: AddCommentRequest,
): Promise<TriageProcedure> {
	const res = await fetch(
		`${AI_API_URL}/api/v1/triage/record/${procedureId}/comment`,
		{
			method: 'POST',
			headers: getIsisHeaders(),
			body: JSON.stringify({ comment: payload.comment }),
		},
	);
	const raw = await handleResponse<ISISProcedureRecord>(res);
	return mapISISToTriageProcedure(raw);
}

/* ─── Cerrar procedimiento (médico → ISISvoice) ─── */

export async function closeTriageProcedureToISIS(
	procedureId: string,
	payload: CloseProcedureRequest,
): Promise<TriageProcedure> {
	const res = await fetch(
		`${AI_API_URL}/api/v1/triage/record/${procedureId}/close`,
		{
			method: 'POST',
			headers: getIsisHeaders(),
			body: JSON.stringify({ close_reason: payload.close_reason ?? null }),
		},
	);
	const raw = await handleResponse<ISISProcedureRecord>(res);
	return mapISISToTriageProcedure(raw);
}

/* ─── PDF (NestJS, solo médico/enfermero con acceso al historial) ─── */

export async function downloadTriagePdf(procedureId: string): Promise<Blob> {
	return apiGetBlob(`/api/v1/triage/procedure/${procedureId}/pdf`);
}

/* ─── Confirmaciones de triage (NESTJS-TRIAGE service, :3001) ─── */

export async function getConfirmacionesFromTriage(
	enfermeroId: string,
	limit = 50,
): Promise<TriageConfirmacion[]> {
	const res = await fetch(
		`${TRIAGE_API_URL}/api/triage/confirmaciones/enfermero/${enfermeroId}?limit=${limit}`,
		{ headers: getIsisHeaders() },
	);
	return handleResponse<TriageConfirmacion[]>(res);
}
