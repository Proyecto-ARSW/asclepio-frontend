import { currentLocale, type AppLocale } from '@/features/i18n/locale-path';

interface AuthContent {
	appName: string;
	appSubtitle: string;
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

const authContentByLocale: Record<AppLocale, AuthContent> = {
	es: {
		appName: 'Asclepio',
		appSubtitle: 'Sistema de gestion hospitalaria',
		login: {
			title: 'Iniciar sesion',
			emailLabel: 'Correo electronico',
			emailPlaceholder: 'correo@hospital.com',
			passwordLabel: 'Contrasena',
			passwordPlaceholder: '••••••••',
			submit: 'Iniciar sesion',
			submitLoading: 'Ingresando...',
			registerPrompt: 'No tienes cuenta?',
			registerAction: 'Registrarse',
			errors: {
				invalidCredentials: 'Credenciales invalidas',
				requiredEmail: 'Ingresa un correo valido',
				requiredPassword: 'Ingresa tu contrasena',
			},
		},
		selectHospital: {
			title: 'Seleccionar hospital',
			subtitle: 'Elige el hospital para esta sesion',
			emptyAdminTitle: 'Sin hospitales vinculados',
			emptyAdminHint: 'Crea tu primer hospital desde el panel de control.',
			emptyUserTitle: 'Sin hospitales asignados',
			emptyUserHint: 'Contacta a un administrador para obtener acceso.',
			backToLogin: 'Volver al inicio de sesion',
			listHint: 'Selecciona el hospital en el que deseas trabajar en esta sesion.',
			submit: 'Continuar',
			submitLoading: 'Ingresando...',
			errors: {
				selectionRequired: 'Debes seleccionar un hospital.',
				connection: 'Error al seleccionar hospital',
			},
		},
		roles: {
			ADMIN: 'Administrador',
			MEDICO: 'Medico',
			ENFERMERO: 'Enfermero',
			RECEPCIONISTA: 'Recepcionista',
			PACIENTE: 'Paciente',
		},
	},
	en: {
		appName: 'Asclepio',
		appSubtitle: 'Hospital management system',
		login: {
			title: 'Sign in',
			emailLabel: 'Email address',
			emailPlaceholder: 'email@hospital.com',
			passwordLabel: 'Password',
			passwordPlaceholder: '••••••••',
			submit: 'Sign in',
			submitLoading: 'Signing in...',
			registerPrompt: 'No account yet?',
			registerAction: 'Create account',
			errors: {
				invalidCredentials: 'Invalid credentials',
				requiredEmail: 'Enter a valid email',
				requiredPassword: 'Enter your password',
			},
		},
		selectHospital: {
			title: 'Select hospital',
			subtitle: 'Choose the hospital for this session',
			emptyAdminTitle: 'No linked hospitals',
			emptyAdminHint: 'Create your first hospital from the dashboard.',
			emptyUserTitle: 'No assigned hospitals',
			emptyUserHint: 'Ask an admin to grant you access.',
			backToLogin: 'Back to sign in',
			listHint: 'Select the hospital where you want to work in this session.',
			submit: 'Continue',
			submitLoading: 'Entering...',
			errors: {
				selectionRequired: 'Select one hospital first.',
				connection: 'Unable to select hospital',
			},
		},
		roles: {
			ADMIN: 'Administrator',
			MEDICO: 'Doctor',
			ENFERMERO: 'Nurse',
			RECEPCIONISTA: 'Receptionist',
			PACIENTE: 'Patient',
		},
	},
};

export function getAuthContent(locale = currentLocale()): AuthContent {
	return authContentByLocale[locale];
}
