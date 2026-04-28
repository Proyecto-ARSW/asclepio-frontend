export type TriageInputMethod = 'text' | 'voice';

export type TriageProcedureStatus =
	| 'pending'
	| 'resolved'
	| 'vital_signs_recorded'
	| 'closed'
	| 'open'
	| 'in_progress'
	| string;

export interface TriageClinicalSection {
	title: string;
	content: string;
}

export interface TriageComment {
	id: string;
	author_role: string;
	author_name: string;
	comment: string;
	created_at: string;
}

export interface TriageVitalSigns {
	temperature_c?: number;
	heart_rate_bpm?: number;
	respiratory_rate_bpm?: number;
	systolic_bp_mmhg?: number;
	diastolic_bp_mmhg?: number;
	oxygen_saturation_pct?: number;
	weight_kg?: number;
	height_cm?: number;
}

export interface TriagePreliminaryHistory {
	sintomas: string[];
	embarazo: boolean;
	antecedentes: string[];
	posiblesCausas: string[];
	comentario: string;
	nivelPrioridad: number;
	comentariosIA: string;
	advertenciaIA: string;
}

export interface TriageProcedure {
	procedure_id: string;
	patient_id: string;
	status: TriageProcedureStatus;
	transcript?: string;
	input_type?: string;
	preliminary_history?: TriagePreliminaryHistory;
	confidence_score?: number;
	triage_data: {
		chief_complaint?: string;
		summary?: string;
		sections?: TriageClinicalSection[];
		raw?: Record<string, unknown>;
	};
	vital_signs?: TriageVitalSigns;
	comments?: TriageComment[];
	created_at?: string;
	updated_at?: string;
	webhook_delivery?: string;
}

export interface ISISComment {
	id: string;
	comment: string;
	author: string;
	created_at: string;
}

export interface ISISProcedureRecord {
	procedure_id: string;
	patient_id: string;
	transcript: string;
	input_type: 'text' | 'audio';
	preliminary_history: TriagePreliminaryHistory;
	confidence_score: number;
	status: TriageProcedureStatus;
	vital_signs?: TriageVitalSigns | null;
	comments: ISISComment[];
	created_at: string;
	updated_at: string;
	webhook_delivery: string;
}

export interface ISISTriageIntakeResponse {
	procedure_id: string;
	patient_id: string;
	status: string;
	recommendation: string;
}

export interface TriageTextInputRequest {
	patient_id?: string;
	text: string;
}

export interface TriageVoiceInputRequest {
	patient_id?: string;
	audio?: File;
	audio_base64?: string;
	file_name?: string;
	mime_type?: string;
}

export interface TriageProcedureResponse {
	procedure_id: string;
	patient_id: string;
	status: TriageProcedureStatus;
	triage_data: TriageProcedure['triage_data'];
}

export interface UpdateVitalSignsRequest {
	vital_signs: TriageVitalSigns;
}

export interface AddCommentRequest {
	comment: string;
}

export interface CloseProcedureRequest {
	close_reason?: string;
}

export interface TriageApiError {
	status: number;
	code: string;
	message: string;
}
