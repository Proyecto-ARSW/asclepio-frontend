import {
	apiGetBlob,
	apiGetWithStatus,
	apiPostFormData,
	apiPostWithStatus,
	apiPut,
} from '@/lib/api';
import type {
	AddCommentRequest,
	CloseProcedureRequest,
	TriageProcedure,
	TriageProcedureResponse,
	TriageTextInputRequest,
	TriageVoiceInputRequest,
	UpdateVitalSignsRequest,
} from './triage.types';

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
