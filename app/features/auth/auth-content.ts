import { type AppLocale, currentLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';

interface AuthContent {
	appName: string;
	appSubtitle: string;
	register: {
		title: string;
		subtitle: string;
		stepTitles: [string, string, string];
		navigation: {
			back: string;
			next: string;
			submit: string;
			submitLoading: string;
		};
		footer: {
			alreadyAccount: string;
			loginAction: string;
		};
		sections: {
			doctor: string;
			nurse: string;
			patient: string;
			readyTitle: string;
			readyHint: string;
			optionalInfo: string;
		};
		terms: {
			prefix: string;
			link: string;
		};
		labels: {
			nombre: string;
			apellido: string;
			email: string;
			password: string;
			telefono: string;
			rol: string;
			hospital: string;
			especialidadId: string;
			numeroRegistroMedico: string;
			consultorio: string;
			numeroRegistroEnfermero: string;
			nivelFormacion: string;
			areaEspecializacion: string;
			certificacionTriage: string;
			tipoDocumento: string;
			numeroDocumento: string;
			tipoSangre: string;
			eps: string;
			alergias: string;
		};
		placeholders: {
			nombre: string;
			apellido: string;
			email: string;
			password: string;
			telefono: string;
			especialidadId: string;
			numeroRegistroMedico: string;
			consultorio: string;
			numeroRegistroEnfermero: string;
			areaEspecializacion: string;
			numeroDocumento: string;
			tipoSangreDefault: string;
			eps: string;
			alergias: string;
		};
		roles: Array<{
			value: 'PACIENTE' | 'MEDICO' | 'ENFERMERO' | 'RECEPCIONISTA' | 'ADMIN';
			label: string;
			description: string;
		}>;
		trainingLevels: Array<{
			id: number;
			label: string;
		}>;
		documentTypes: string[];
		bloodTypes: string[];
		emptyHospitals: string;
		selectedRoleBadge: string;
		defaultHospitalName: string;
		errors: {
			requiredName: string;
			requiredLastName: string;
			requiredEmail: string;
			requiredPassword: string;
			requiredHospital: string;
			requiredDoctorRegistration: string;
			requiredDoctorSpecialty: string;
			requiredNurseRegistration: string;
			requiredNurseArea: string;
			requiredTerms: string;
			loadHospitals: string;
			submit: string;
		};
	};
	login: {
		title: string;
		emailLabel: string;
		emailPlaceholder: string;
		passwordLabel: string;
		passwordPlaceholder: string;
		submit: string;
		submitLoading: string;
		registerPrompt: string;
		registerAction: string;
		errors: {
			invalidCredentials: string;
			forbidden: string;
			tooManyAttempts: string;
			invalidRequest: string;
			serverUnavailable: string;
			unknown: string;
			requiredEmail: string;
			requiredPassword: string;
		};
	};
	selectHospital: {
		title: string;
		subtitle: string;
		emptyAdminTitle: string;
		emptyAdminHint: string;
		emptyUserTitle: string;
		emptyUserHint: string;
		backToLogin: string;
		listHint: string;
		submit: string;
		submitLoading: string;
		errors: {
			selectionRequired: string;
			connection: string;
		};
	};
	roles: Record<string, string>;
}

export function getAuthContent(
	locale: AppLocale = currentLocale(),
): AuthContent {
	const options = { locale } as const;
	return {
		appName: m.appName({}, options),
		appSubtitle: m.authAppSubtitle({}, options),
		register: {
			title: m.authRegisterTitle({}, options),
			subtitle: m.authRegisterSubtitle({}, options),
			stepTitles: [
				m.authRegisterStepPersonal({}, options),
				m.authRegisterStepRoleHospital({}, options),
				m.authRegisterStepAdditional({}, options),
			],
			navigation: {
				back: m.authRegisterNavBack({}, options),
				next: m.authRegisterNavNext({}, options),
				submit: m.authRegisterNavSubmit({}, options),
				submitLoading: m.authRegisterNavSubmitLoading({}, options),
			},
			footer: {
				alreadyAccount: m.authRegisterFooterAlreadyAccount({}, options),
				loginAction: m.authRegisterFooterLoginAction({}, options),
			},
			sections: {
				doctor: m.authRegisterSectionDoctor({}, options),
				nurse: m.authRegisterSectionNurse({}, options),
				patient: m.authRegisterSectionPatient({}, options),
				readyTitle: m.authRegisterSectionReadyTitle({}, options),
				readyHint: m.authRegisterSectionReadyHint({}, options),
				optionalInfo: m.authRegisterSectionOptionalInfo({}, options),
			},
			terms: {
				prefix: m.authRegisterTermsPrefix({}, options),
				link: m.authRegisterTermsLink({}, options),
			},
			labels: {
				nombre: m.authRegisterLabelNombre({}, options),
				apellido: m.authRegisterLabelApellido({}, options),
				email: m.authRegisterLabelEmail({}, options),
				password: m.authRegisterLabelPassword({}, options),
				telefono: m.authRegisterLabelTelefono({}, options),
				rol: m.authRegisterLabelRol({}, options),
				hospital: m.authRegisterLabelHospital({}, options),
				especialidadId: m.authRegisterLabelEspecialidadId({}, options),
				numeroRegistroMedico: m.authRegisterLabelNumeroRegistroMedico(
					{},
					options,
				),
				consultorio: m.authRegisterLabelConsultorio({}, options),
				numeroRegistroEnfermero: m.authRegisterLabelNumeroRegistroEnfermero(
					{},
					options,
				),
				nivelFormacion: m.authRegisterLabelNivelFormacion({}, options),
				areaEspecializacion: m.authRegisterLabelAreaEspecializacion(
					{},
					options,
				),
				certificacionTriage: m.authRegisterLabelCertificacionTriage(
					{},
					options,
				),
				tipoDocumento: m.authRegisterLabelTipoDocumento({}, options),
				numeroDocumento: m.authRegisterLabelNumeroDocumento({}, options),
				tipoSangre: m.authRegisterLabelTipoSangre({}, options),
				eps: m.authRegisterLabelEps({}, options),
				alergias: m.authRegisterLabelAlergias({}, options),
			},
			placeholders: {
				nombre: m.authRegisterPlaceholderNombre({}, options),
				apellido: m.authRegisterPlaceholderApellido({}, options),
				email: m.authRegisterPlaceholderEmail({}, options),
				password: m.authRegisterPlaceholderPassword({}, options),
				telefono: m.authRegisterPlaceholderTelefono({}, options),
				especialidadId: m.authRegisterPlaceholderEspecialidadId({}, options),
				numeroRegistroMedico: m.authRegisterPlaceholderNumeroRegistroMedico(
					{},
					options,
				),
				consultorio: m.authRegisterPlaceholderConsultorio({}, options),
				numeroRegistroEnfermero:
					m.authRegisterPlaceholderNumeroRegistroEnfermero({}, options),
				areaEspecializacion: m.authRegisterPlaceholderAreaEspecializacion(
					{},
					options,
				),
				numeroDocumento: m.authRegisterPlaceholderNumeroDocumento({}, options),
				tipoSangreDefault: m.authRegisterPlaceholderTipoSangreDefault(
					{},
					options,
				),
				eps: m.authRegisterPlaceholderEps({}, options),
				alergias: m.authRegisterPlaceholderAlergias({}, options),
			},
			roles: [
				{
					value: 'PACIENTE',
					label: m.authRegisterRolePatientLabel({}, options),
					description: m.authRegisterRolePatientDescription({}, options),
				},
				{
					value: 'MEDICO',
					label: m.authRegisterRoleDoctorLabel({}, options),
					description: m.authRegisterRoleDoctorDescription({}, options),
				},
				{
					value: 'ENFERMERO',
					label: m.authRegisterRoleNurseLabel({}, options),
					description: m.authRegisterRoleNurseDescription({}, options),
				},
				{
					value: 'RECEPCIONISTA',
					label: m.authRegisterRoleReceptionistLabel({}, options),
					description: m.authRegisterRoleReceptionistDescription({}, options),
				},
				{
					value: 'ADMIN',
					label: m.authRegisterRoleAdminLabel({}, options),
					description: m.authRegisterRoleAdminDescription({}, options),
				},
			],
			trainingLevels: [
				{ id: 1, label: m.authRegisterTrainingLevel1({}, options) },
				{ id: 2, label: m.authRegisterTrainingLevel2({}, options) },
				{ id: 3, label: m.authRegisterTrainingLevel3({}, options) },
				{ id: 4, label: m.authRegisterTrainingLevel4({}, options) },
			],
			documentTypes: ['CC', 'TI', 'CE', 'PA', 'RC'],
			bloodTypes: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
			emptyHospitals: m.authRegisterEmptyHospitals({}, options),
			selectedRoleBadge: m.authRegisterSelectedRoleBadge({}, options),
			defaultHospitalName: m.authRegisterDefaultHospitalName({}, options),
			errors: {
				requiredName: m.authRegisterErrorRequiredName({}, options),
				requiredLastName: m.authRegisterErrorRequiredLastName({}, options),
				requiredEmail: m.authRegisterErrorRequiredEmail({}, options),
				requiredPassword: m.authRegisterErrorRequiredPassword({}, options),
				requiredHospital: m.authRegisterErrorRequiredHospital({}, options),
				requiredDoctorRegistration:
					m.authRegisterErrorRequiredDoctorRegistration({}, options),
				requiredDoctorSpecialty: m.authRegisterErrorRequiredDoctorSpecialty(
					{},
					options,
				),
				requiredNurseRegistration: m.authRegisterErrorRequiredNurseRegistration(
					{},
					options,
				),
				requiredNurseArea: m.authRegisterErrorRequiredNurseArea({}, options),
				requiredTerms: m.authRegisterErrorRequiredTerms({}, options),
				loadHospitals: m.authRegisterErrorLoadHospitals({}, options),
				submit: m.authRegisterErrorSubmit({}, options),
			},
		},
		login: {
			title: m.authLoginTitle({}, options),
			emailLabel: m.authLoginEmailLabel({}, options),
			emailPlaceholder: m.authLoginEmailPlaceholder({}, options),
			passwordLabel: m.authLoginPasswordLabel({}, options),
			passwordPlaceholder: m.authLoginPasswordPlaceholder({}, options),
			submit: m.authLoginSubmit({}, options),
			submitLoading: m.authLoginSubmitLoading({}, options),
			registerPrompt: m.authLoginRegisterPrompt({}, options),
			registerAction: m.authLoginRegisterAction({}, options),
			errors: {
				invalidCredentials: m.authLoginErrorInvalidCredentials({}, options),
				forbidden: m.authLoginErrorForbidden({}, options),
				tooManyAttempts: m.authLoginErrorTooManyAttempts({}, options),
				invalidRequest: m.authLoginErrorInvalidRequest({}, options),
				serverUnavailable: m.authLoginErrorServerUnavailable({}, options),
				unknown: m.authLoginErrorUnknown({}, options),
				requiredEmail: m.authLoginErrorRequiredEmail({}, options),
				requiredPassword: m.authLoginErrorRequiredPassword({}, options),
			},
		},
		selectHospital: {
			title: m.authSelectHospitalTitle({}, options),
			subtitle: m.authSelectHospitalSubtitle({}, options),
			emptyAdminTitle: m.authSelectHospitalEmptyAdminTitle({}, options),
			emptyAdminHint: m.authSelectHospitalEmptyAdminHint({}, options),
			emptyUserTitle: m.authSelectHospitalEmptyUserTitle({}, options),
			emptyUserHint: m.authSelectHospitalEmptyUserHint({}, options),
			backToLogin: m.authSelectHospitalBackToLogin({}, options),
			listHint: m.authSelectHospitalListHint({}, options),
			submit: m.authSelectHospitalSubmit({}, options),
			submitLoading: m.authSelectHospitalSubmitLoading({}, options),
			errors: {
				selectionRequired: m.authSelectHospitalErrorSelectionRequired(
					{},
					options,
				),
				connection: m.authSelectHospitalErrorConnection({}, options),
			},
		},
		roles: {
			ADMIN: m.authRoleAdmin({}, options),
			MEDICO: m.authRoleDoctor({}, options),
			ENFERMERO: m.authRoleNurse({}, options),
			RECEPCIONISTA: m.authRoleReceptionist({}, options),
			PACIENTE: m.authRolePatient({}, options),
		},
	};
}
