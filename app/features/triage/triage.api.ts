import { AI_API_URL } from '@/lib/env';
import { getStoredToken } from '@/lib/api';
import type {
	AddCommentRequest,
	CloseProcedureRequest,
	TriageProcedure,
	TriageProcedureResponse,
	TriageTextInputRequest,
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

/* ────────────────────────────────────────────────────────────────
   Endpoints directos a ISISvoice (FastAPI) para flujo PACIENTE
   ──────────────────────────────────────────────────────────────── */

export interface TriageCreateTextResponse {
	procedure_id: string;
	patient_id: string;
	transcript: string;
	input_type: string;
	preliminary_history: Record<string, unknown>;
	confidence_score: number;
	status: string;
}

export interface TriageCreateAudioResponse {
	procedure_id: string;
	patient_id: string;
	transcript: string;
	input_type: string;
	preliminary_history: Record<string, unknown>;
	confidence_score: number;
	status: string;
}

export async function sendTriageTextInputToISIS(
	payload: TriageTextInputRequest,
): Promise<TriageCreateTextResponse> {
	const res = await fetch(`${AI_API_URL}/api/v1/triage/symptoms/text`, {
		method: 'POST',
		headers: getIsisHeaders(),
		body: JSON.stringify({ text_input: payload.text }),
	});
	return handleResponse<TriageCreateTextResponse>(res);
}

export async function sendTriageVoiceInputToISIS(
	payload: TriageVoiceInputRequest,
): Promise<TriageCreateAudioResponse> {
	const res = await fetch(`${AI_API_URL}/api/v1/triage/symptoms/audio/base64`, {
		method: 'POST',
		headers: getIsisHeaders(),
		body: JSON.stringify({
			audio_base64: payload.audio_base64,
			file_name: payload.file_name,
			mime_type: payload.mime_type,
		}),
	});
	return handleResponse<TriageCreateAudioResponse>(res);
}

export async function getTriageProcedureFromISIS(
	procedureId: string,
): Promise<TriageProcedure> {
	const res = await fetch(
		`${AI_API_URL}/api/v1/triage/procedure/${procedureId}`,
		{
			headers: getIsisHeaders(),
		},
	);
	return handleResponse<TriageProcedure>(res);
}

export async function updateTriageVitalSignsToISIS(
	procedureId: string,
	payload: UpdateVitalSignsRequest,
): Promise<TriageProcedureResponse> {
	const res = await fetch(
		`${AI_API_URL}/api/v1/triage/record/${procedureId}/vital-signs`,
		{
			method: 'PUT',
			headers: getIsisHeaders(),
			body: JSON.stringify(payload),
		},
	);
	return handleResponse<TriageProcedureResponse>(res);
}

export async function addTriageCommentToISIS(
	procedureId: string,
	payload: AddCommentRequest,
): Promise<TriageProcedureResponse> {
	const res = await fetch(
		`${AI_API_URL}/api/v1/triage/record/${procedureId}/comment`,
		{
			method: 'POST',
			headers: getIsisHeaders(),
			body: JSON.stringify({ comment: payload.comment }),
		},
	);
	return handleResponse<TriageProcedureResponse>(res);
}

export async function closeTriageProcedureToISIS(
	procedureId: string,
	payload: CloseProcedureRequest,
): Promise<TriageProcedureResponse> {
	const res = await fetch(
		`${AI_API_URL}/api/v1/triage/record/${procedureId}/close`,
		{
			method: 'POST',
			headers: getIsisHeaders(),
			body: JSON.stringify({ close_reason: payload.close_reason }),
		},
	);
	return handleResponse<TriageProcedureResponse>(res);
}

/* ────────────────────────────────────────────────────────────────
   Legacy helpers que apuntan al backend NestJS (M1) vía REST
   para compatibilidad con flujos ENFERMERO / MEDICO existentes
   ──────────────────────────────────────────────────────────────── */

import {
	apiGetBlob,
	apiGetWithStatus,
	apiPostFormData,
	apiPostWithStatus,
	apiPut,
} from '@/lib/api';

export function sendTriageTextInput(payload: TriageTextInputRequest) {
	return apiPostWithStatus<TriageProcedureResponse>(
		'/api/v1/triage/text-input',
		payload,
	);
}

export function sendTriageVoiceInput(payload: TriageVoiceInputRequest) {
	const form = new FormData();
	form.append('patient_id', payload.patient_id);
	form.append('audio', payload.audio);
	return apiPostFormData<TriageProcedureResponse>(
		'/api/v1/triage/voice-input',
		form,
	);
}

export function getTriageProcedure(procedureId: string) {
	return apiGetWithStatus<TriageProcedure>(
		`/api/v1/triage/procedure/${procedureId}`,
	);
}

export function updateTriageVitalSigns(
	procedureId: string,
	payload: UpdateVitalSignsRequest,
) {
	return apiPut<TriageProcedureResponse>(
		`/api/v1/triage/record/${procedureId}/vital-signs`,
		payload,
	);
}

export function addTriageComment(
	procedureId: string,
	payload: AddCommentRequest,
) {
	return apiPostWithStatus<TriageProcedureResponse>(
		`/api/v1/triage/record/${procedureId}/comment`,
		payload,
	);
}

export function closeTriageProcedure(
	procedureId: string,
	payload: CloseProcedureRequest,
) {
	return apiPut<TriageProcedureResponse>(
		`/api/v1/triage/record/${procedureId}/close`,
		payload,
	);
}

export async function downloadTriagePdf(procedureId: string): Promise<Blob> {
	return apiGetBlob(`/api/v1/triage/procedure/${procedureId}/pdf`);
}
