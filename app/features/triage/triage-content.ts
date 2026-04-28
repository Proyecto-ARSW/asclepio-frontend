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

export function getTriageContent(
	locale: AppLocale = currentLocale(),
): TriageContent {
	const options = { locale } as const;
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

// Daniel Useche
