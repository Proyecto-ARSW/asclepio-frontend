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
	patient: {
		patientIdLabel: string;
		textLabel: string;
		textPlaceholder: string;
		audioLabel: string;
		audioHint: string;
		startRecording: string;
		stopRecording: string;
		send: string;
		sending: string;
		successTitle: string;
		procedureId: string;
		downloadPdf: string;
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
	};
	forms: {
		vitalSigns: {
			temperature: string;
			heartRate: string;
			respiratoryRate: string;
			systolicBp: string;
			diastolicBp: string;
			oxygenSaturation: string;
			weight: string;
			height: string;
			submit: string;
			saving: string;
		};
		comment: {
			label: string;
			placeholder: string;
			submit: string;
			sending: string;
		};
		close: {
			label: string;
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

export function getTriageContent(
	locale: AppLocale = currentLocale(),
): TriageContent {
	const options = { locale } as const;
	return {
		title: m.triageTitle({}, options),
		subtitle: m.triageSubtitle({}, options),
		newTriageMenu: m.triageNewMenu({}, options),
		modes: {
			text: m.triageModeText({}, options),
			voice: m.triageModeVoice({}, options),
		},
		patient: {
			patientIdLabel: m.triagePatientIdLabel({}, options),
			textLabel: m.triageTextLabel({}, options),
			textPlaceholder: m.triageTextPlaceholder({}, options),
			audioLabel: m.triageAudioLabel({}, options),
			audioHint: m.triageAudioHint({}, options),
			startRecording: m.triageAudioStart({}, options),
			stopRecording: m.triageAudioStop({}, options),
			send: m.triageSubmit({}, options),
			sending: m.triageSubmitting({}, options),
			successTitle: m.triageSuccessTitle({}, options),
			procedureId: m.triageProcedureId({}, options),
			downloadPdf: m.triageDownloadPdf({}, options),
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
		},
		forms: {
			vitalSigns: {
				temperature: m.triageVitalTemperature({}, options),
				heartRate: m.triageVitalHeartRate({}, options),
				respiratoryRate: m.triageVitalRespiratoryRate({}, options),
				systolicBp: m.triageVitalSystolicBp({}, options),
				diastolicBp: m.triageVitalDiastolicBp({}, options),
				oxygenSaturation: m.triageVitalOxygenSaturation({}, options),
				weight: m.triageVitalWeight({}, options),
				height: m.triageVitalHeight({}, options),
				submit: m.triageSaveVitals({}, options),
				saving: m.triageSavingVitals({}, options),
			},
			comment: {
				label: m.triageCommentLabel({}, options),
				placeholder: m.triageCommentPlaceholder({}, options),
				submit: m.triageCommentSubmit({}, options),
				sending: m.triageCommentSubmitting({}, options),
			},
			close: {
				label: m.triageCloseReasonLabel({}, options),
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
