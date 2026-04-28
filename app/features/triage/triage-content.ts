import { type AppLocale, currentLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';

export interface TriageContent {
	title: string;
	subtitle: string;
	newTriageMenu: string;
	modes: {
		text: string;
		voice: string;
	};
	formTitle: string;
	patient: {
		patientIdLabel: string;
		patientIdDesc: string;
		textLabel: string;
		textPlaceholder: string;
		textDesc: string;
		audioLabel: string;
		audioHint: string;
		audioDesc: string;
		startRecording: string;
		stopRecording: string;
		send: string;
		sending: string;
		successTitle: string;
		procedureId: string;
		downloadPdf: string;
		browserNotSupported: string;
		audioClear: string;
		recordingActive: string;
		recordedLabel: string;
		myProceduresTitle: string;
		myProceduresEmpty: string;
		recommendationTitle: string;
	};
	queue: {
		title: string;
		pending: string;
		attended: string;
		empty: string;
		emptyAttended: string;
		selectProcedure: string;
		confidence: string;
		symptoms: string;
		priority: string;
		possibleCauses: string;
		aiComments: string;
	};
	detail: {
		heading: string;
		triageData: string;
		vitalSigns: string;
		comments: string;
		status: string;
		empty: string;
		refresh: string;
		loading: string;
		closedLabel: string;
		transcript: string;
	};
	forms: {
		vitalSigns: {
			formLabel: string;
			temperature: string;
			temperatureDesc: string;
			heartRate: string;
			heartRateDesc: string;
			respiratoryRate: string;
			respiratoryRateDesc: string;
			systolicBp: string;
			systolicBpDesc: string;
			diastolicBp: string;
			diastolicBpDesc: string;
			oxygenSaturation: string;
			oxygenSaturationDesc: string;
			weight: string;
			weightDesc: string;
			height: string;
			heightDesc: string;
			submit: string;
			saving: string;
		};
		comment: {
			formLabel: string;
			label: string;
			commentDesc: string;
			placeholder: string;
			submit: string;
			sending: string;
		};
		close: {
			formLabel: string;
			label: string;
			closeReasonDesc: string;
			placeholder: string;
			submit: string;
			sending: string;
		};
	};
	errors: {
		required: string;
		invalidNumber: string;
		actionNotAllowed: string;
	};
}

const INLINE_TEXTS: Record<AppLocale, {
	myProceduresTitle: string;
	myProceduresEmpty: string;
	recommendationTitle: string;
	queueTitle: string;
	queuePending: string;
	queueAttended: string;
	queueEmpty: string;
	queueEmptyAttended: string;
	queueSelectProcedure: string;
	queueConfidence: string;
	queueSymptoms: string;
	queuePriority: string;
	queuePossibleCauses: string;
	queueAIComments: string;
	detailTranscript: string;
}> = {
	es: {
		myProceduresTitle: 'Mis procedimientos recientes',
		myProceduresEmpty: 'Aún no tienes procedimientos de triage registrados.',
		recommendationTitle: 'Recomendación preliminar',
		queueTitle: 'Cola de triage',
		queuePending: 'Pendientes',
		queueAttended: 'Atendidos',
		queueEmpty: 'Sin procedimientos pendientes.',
		queueEmptyAttended: 'Sin procedimientos atendidos aún.',
		queueSelectProcedure: 'Selecciona un procedimiento de la lista para ver el detalle.',
		queueConfidence: 'Confianza IA',
		queueSymptoms: 'Síntomas',
		queuePriority: 'Nivel de prioridad',
		queuePossibleCauses: 'Posibles causas',
		queueAIComments: 'Análisis de la IA',
		detailTranscript: 'Descripción del paciente',
	},
	en: {
		myProceduresTitle: 'My recent procedures',
		myProceduresEmpty: 'You have no triage procedures registered yet.',
		recommendationTitle: 'Preliminary recommendation',
		queueTitle: 'Triage queue',
		queuePending: 'Pending',
		queueAttended: 'Attended',
		queueEmpty: 'No pending procedures.',
		queueEmptyAttended: 'No attended procedures yet.',
		queueSelectProcedure: 'Select a procedure from the list to see the details.',
		queueConfidence: 'AI Confidence',
		queueSymptoms: 'Symptoms',
		queuePriority: 'Priority level',
		queuePossibleCauses: 'Possible causes',
		queueAIComments: 'AI Analysis',
		detailTranscript: 'Patient description',
	},
	pt: {
		myProceduresTitle: 'Meus procedimentos recentes',
		myProceduresEmpty: 'Você ainda não possui procedimentos de triagem registrados.',
		recommendationTitle: 'Recomendação preliminar',
		queueTitle: 'Fila de triagem',
		queuePending: 'Pendentes',
		queueAttended: 'Atendidos',
		queueEmpty: 'Sem procedimentos pendentes.',
		queueEmptyAttended: 'Sem procedimentos atendidos ainda.',
		queueSelectProcedure: 'Selecione um procedimento da lista para ver os detalhes.',
		queueConfidence: 'Confiança IA',
		queueSymptoms: 'Sintomas',
		queuePriority: 'Nível de prioridade',
		queuePossibleCauses: 'Possíveis causas',
		queueAIComments: 'Análise da IA',
		detailTranscript: 'Descrição do paciente',
	},
	fr: {
		myProceduresTitle: 'Mes procédures récentes',
		myProceduresEmpty: "Vous n'avez pas encore de procédures de triage enregistrées.",
		recommendationTitle: 'Recommandation préliminaire',
		queueTitle: 'File de triage',
		queuePending: 'En attente',
		queueAttended: 'Traités',
		queueEmpty: 'Aucune procédure en attente.',
		queueEmptyAttended: 'Aucune procédure traitée encore.',
		queueSelectProcedure: 'Sélectionnez une procédure de la liste pour voir les détails.',
		queueConfidence: 'Confiance IA',
		queueSymptoms: 'Symptômes',
		queuePriority: 'Niveau de priorité',
		queuePossibleCauses: 'Causes possibles',
		queueAIComments: "Analyse de l'IA",
		detailTranscript: 'Description du patient',
	},
	de: {
		myProceduresTitle: 'Meine aktuellen Vorgänge',
		myProceduresEmpty: 'Sie haben noch keine Triage-Vorgänge registriert.',
		recommendationTitle: 'Vorläufige Empfehlung',
		queueTitle: 'Triage-Warteschlange',
		queuePending: 'Ausstehend',
		queueAttended: 'Erledigt',
		queueEmpty: 'Keine ausstehenden Vorgänge.',
		queueEmptyAttended: 'Noch keine erledigten Vorgänge.',
		queueSelectProcedure: 'Wählen Sie einen Vorgang aus der Liste, um Details anzuzeigen.',
		queueConfidence: 'KI-Konfidenz',
		queueSymptoms: 'Symptome',
		queuePriority: 'Prioritätsstufe',
		queuePossibleCauses: 'Mögliche Ursachen',
		queueAIComments: 'KI-Analyse',
		detailTranscript: 'Patientenbeschreibung',
	},
};

export function getTriageContent(
	locale: AppLocale = currentLocale(),
): TriageContent {
	const options = { locale } as const;
	const t = INLINE_TEXTS[locale] ?? INLINE_TEXTS.es;

	return {
		formTitle: m.a11yTriageNewForm({}, options),
		title: m.triageTitle({}, options),
		subtitle: m.triageSubtitle({}, options),
		newTriageMenu: m.triageNewMenu({}, options),
		modes: {
			text: m.triageModeText({}, options),
			voice: m.triageModeVoice({}, options),
		},
		patient: {
			patientIdLabel: m.triagePatientIdLabel({}, options),
			patientIdDesc: m.a11yTriagePatientIdDesc({}, options),
			textLabel: m.triageTextLabel({}, options),
			textDesc: m.a11yTriageTextDesc({}, options),
			textPlaceholder: m.triageTextPlaceholder({}, options),
			audioLabel: m.triageAudioLabel({}, options),
			audioHint: m.triageAudioHint({}, options),
			audioDesc: m.a11yTriageAudioDesc({}, options),
			browserNotSupported: m.triageBrowserNotSupported({}, options),
			audioClear: m.triageAudioClear({}, options),
			recordingActive: m.triageRecordingActive({}, options),
			recordedLabel: m.triageRecordedLabel({}, options),
			startRecording: m.triageAudioStart({}, options),
			stopRecording: m.triageAudioStop({}, options),
			send: m.triageSubmit({}, options),
			sending: m.triageSubmitting({}, options),
			successTitle: m.triageSuccessTitle({}, options),
			procedureId: m.triageProcedureId({}, options),
			downloadPdf: m.triageDownloadPdf({}, options),
			myProceduresTitle: t.myProceduresTitle,
			myProceduresEmpty: t.myProceduresEmpty,
			recommendationTitle: t.recommendationTitle,
		},
		queue: {
			title: t.queueTitle,
			pending: t.queuePending,
			attended: t.queueAttended,
			empty: t.queueEmpty,
			emptyAttended: t.queueEmptyAttended,
			selectProcedure: t.queueSelectProcedure,
			confidence: t.queueConfidence,
			symptoms: t.queueSymptoms,
			priority: t.queuePriority,
			possibleCauses: t.queuePossibleCauses,
			aiComments: t.queueAIComments,
		},
		detail: {
			heading: m.triageDetailHeading({}, options),
			triageData: m.triageDetailSectionData({}, options),
			vitalSigns: m.triageDetailSectionVitals({}, options),
			comments: m.triageDetailSectionComments({}, options),
			status: m.triageDetailSectionStatus({}, options),
			empty: m.triageDetailEmpty({}, options),
			refresh: m.triageRefresh({}, options),
			loading: m.triageLoading({}, options),
			closedLabel: m.triageStatusClosed({}, options),
			transcript: t.detailTranscript,
		},
		forms: {
			vitalSigns: {
				formLabel: m.a11yTriageVitalsForm({}, options),
				temperature: m.triageVitalTemperature({}, options),
				temperatureDesc: m.a11yTriageTemperatureDesc({}, options),
				heartRate: m.triageVitalHeartRate({}, options),
				heartRateDesc: m.a11yTriageHeartRateDesc({}, options),
				respiratoryRate: m.triageVitalRespiratoryRate({}, options),
				respiratoryRateDesc: m.a11yTriageRespiratoryRateDesc({}, options),
				systolicBp: m.triageVitalSystolicBp({}, options),
				systolicBpDesc: m.a11yTriageSystolicBpDesc({}, options),
				diastolicBp: m.triageVitalDiastolicBp({}, options),
				diastolicBpDesc: m.a11yTriageDiastolicBpDesc({}, options),
				oxygenSaturation: m.triageVitalOxygenSaturation({}, options),
				oxygenSaturationDesc: m.a11yTriageOxygenDesc({}, options),
				weight: m.triageVitalWeight({}, options),
				weightDesc: m.a11yTriageWeightDesc({}, options),
				height: m.triageVitalHeight({}, options),
				heightDesc: m.a11yTriageHeightDesc({}, options),
				submit: m.triageSaveVitals({}, options),
				saving: m.triageSavingVitals({}, options),
			},
			comment: {
				formLabel: m.a11yTriageCommentForm({}, options),
				label: m.triageCommentLabel({}, options),
				commentDesc: m.a11yTriageCommentDesc({}, options),
				placeholder: m.triageCommentPlaceholder({}, options),
				submit: m.triageCommentSubmit({}, options),
				sending: m.triageCommentSubmitting({}, options),
			},
			close: {
				formLabel: m.a11yTriageCloseForm({}, options),
				label: m.triageCloseReasonLabel({}, options),
				closeReasonDesc: m.a11yTriageCloseReasonDesc({}, options),
				placeholder: m.triageCloseReasonPlaceholder({}, options),
				submit: m.triageCloseSubmit({}, options),
				sending: m.triageCloseSubmitting({}, options),
			},
		},
		errors: {
			required: m.triageValidationRequired({}, options),
			invalidNumber: m.triageValidationInvalidNumber({}, options),
			actionNotAllowed: m.triageErrorActionNotAllowed({}, options),
		},
	};
}
