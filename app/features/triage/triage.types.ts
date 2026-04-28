export type TriageInputMethod = 'text' | 'voice';

export type TriageProcedureStatus = 'open' | 'in_progress' | 'closed' | string;

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

export interface TriageProcedure {
	procedure_id: string;
	patient_id: string;
	status: TriageProcedureStatus;
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
}

export interface TriageTextInputRequest {
	patient_id: string;
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
	patient_id: string;
	vital_signs: TriageVitalSigns;
}

export interface AddCommentRequest {
	patient_id: string;
	comment: string;
}

export interface CloseProcedureRequest {
	patient_id: string;
	close_reason: string;
}

export interface TriageApiError {
	status: number;
	code: string;
	message: string;
}
