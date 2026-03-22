import { type AppLocale, currentLocale } from '@/features/i18n/locale-path';

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
		register: {
			title: 'Crear cuenta',
			subtitle: 'Registro de usuarios para la plataforma clinica',
			stepTitles: [
				'Datos personales',
				'Rol y hospital',
				'Informacion adicional',
			],
			navigation: {
				back: 'Atras',
				next: 'Continuar',
				submit: 'Crear cuenta',
				submitLoading: 'Creando cuenta...',
			},
			footer: {
				alreadyAccount: 'Ya tienes cuenta?',
				loginAction: 'Iniciar sesion',
			},
			sections: {
				doctor: 'Datos del medico',
				nurse: 'Datos del enfermero',
				patient: 'Datos del paciente',
				readyTitle: 'Listo para crear tu cuenta',
				readyHint: 'Revisa los datos anteriores y confirma el registro.',
				optionalInfo:
					'Esta informacion es opcional y puede completarse mas adelante.',
			},
			labels: {
				nombre: 'Nombre *',
				apellido: 'Apellido *',
				email: 'Correo electronico *',
				password: 'Contrasena * (min. 6 caracteres)',
				telefono: 'Telefono (opcional)',
				rol: 'Rol en el sistema *',
				hospital: 'Hospital *',
				especialidadId: 'ID de especialidad *',
				numeroRegistroMedico: 'Numero de registro medico *',
				consultorio: 'Consultorio (opcional)',
				numeroRegistroEnfermero: 'Numero de registro *',
				nivelFormacion: 'Nivel de formacion *',
				areaEspecializacion: 'ID de area de especializacion *',
				certificacionTriage: 'Certificacion de triage',
				tipoDocumento: 'Tipo de documento',
				numeroDocumento: 'Numero de documento',
				tipoSangre: 'Tipo de sangre',
				eps: 'EPS',
				alergias: 'Alergias conocidas',
			},
			placeholders: {
				nombre: 'Juan',
				apellido: 'Garcia',
				email: 'correo@hospital.com',
				password: '••••••••',
				telefono: '+57 300 123 4567',
				especialidadId: 'Ej: 1',
				numeroRegistroMedico: 'Ej: RM-2024-001',
				consultorio: 'Ej: 301',
				numeroRegistroEnfermero: 'Ej: ENF-2024-001',
				areaEspecializacion: 'Ej: 1',
				numeroDocumento: '1234567890',
				tipoSangreDefault: 'Seleccionar',
				eps: 'Sura, Compensar...',
				alergias: 'Penicilina, latex...',
			},
			roles: [
				{
					value: 'PACIENTE',
					label: 'Paciente',
					description: 'Acceso a citas y turnos propios',
				},
				{
					value: 'MEDICO',
					label: 'Medico',
					description: 'Gestion de citas y pacientes asignados',
				},
				{
					value: 'ENFERMERO',
					label: 'Enfermero',
					description: 'Apoyo clinico y gestion de turnos',
				},
				{
					value: 'RECEPCIONISTA',
					label: 'Recepcionista',
					description: 'Registro de turnos y citas',
				},
				{
					value: 'ADMIN',
					label: 'Administrador',
					description: 'Acceso total al sistema',
				},
			],
			trainingLevels: [
				{ id: 1, label: 'Tecnico' },
				{ id: 2, label: 'Tecnologo' },
				{ id: 3, label: 'Profesional' },
				{ id: 4, label: 'Especialista' },
			],
			documentTypes: ['CC', 'TI', 'CE', 'PA', 'RC'],
			bloodTypes: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
			emptyHospitals: 'Sin hospitales disponibles',
			errors: {
				requiredName: 'El nombre es requerido',
				requiredLastName: 'El apellido es requerido',
				requiredEmail: 'Ingresa un correo valido',
				requiredPassword: 'La contrasena debe tener al menos 6 caracteres',
				requiredHospital: 'Debes seleccionar un hospital',
				requiredDoctorRegistration: 'El numero de registro medico es requerido',
				requiredDoctorSpecialty:
					'El ID de especialidad debe ser un numero positivo',
				requiredNurseRegistration: 'El numero de registro es requerido',
				requiredNurseArea:
					'El area de especializacion es requerida para enfermeros',
				loadHospitals: 'No se pudo cargar la lista de hospitales',
				submit: 'Error al crear la cuenta',
			},
		},
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
			listHint:
				'Selecciona el hospital en el que deseas trabajar en esta sesion.',
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
		register: {
			title: 'Create account',
			subtitle: 'User registration for the clinical platform',
			stepTitles: ['Personal data', 'Role and hospital', 'Additional info'],
			navigation: {
				back: 'Back',
				next: 'Continue',
				submit: 'Create account',
				submitLoading: 'Creating account...',
			},
			footer: {
				alreadyAccount: 'Already have an account?',
				loginAction: 'Sign in',
			},
			sections: {
				doctor: 'Doctor details',
				nurse: 'Nurse details',
				patient: 'Patient details',
				readyTitle: 'Ready to create your account',
				readyHint: 'Review your information and confirm registration.',
				optionalInfo:
					'This information is optional and can be completed later.',
			},
			labels: {
				nombre: 'First name *',
				apellido: 'Last name *',
				email: 'Email *',
				password: 'Password * (min. 6 characters)',
				telefono: 'Phone (optional)',
				rol: 'System role *',
				hospital: 'Hospital *',
				especialidadId: 'Specialty ID *',
				numeroRegistroMedico: 'Medical license number *',
				consultorio: 'Office (optional)',
				numeroRegistroEnfermero: 'Registration number *',
				nivelFormacion: 'Education level *',
				areaEspecializacion: 'Specialization area ID *',
				certificacionTriage: 'Triage certification',
				tipoDocumento: 'Document type',
				numeroDocumento: 'Document number',
				tipoSangre: 'Blood type',
				eps: 'Insurance provider',
				alergias: 'Known allergies',
			},
			placeholders: {
				nombre: 'John',
				apellido: 'Doe',
				email: 'email@hospital.com',
				password: '••••••••',
				telefono: '+57 300 123 4567',
				especialidadId: 'Ex: 1',
				numeroRegistroMedico: 'Ex: MED-2024-001',
				consultorio: 'Ex: 301',
				numeroRegistroEnfermero: 'Ex: NUR-2024-001',
				areaEspecializacion: 'Ex: 1',
				numeroDocumento: '1234567890',
				tipoSangreDefault: 'Select',
				eps: 'Aetna, Sura...',
				alergias: 'Penicillin, latex...',
			},
			roles: [
				{
					value: 'PACIENTE',
					label: 'Patient',
					description: 'Access to personal appointments and shifts',
				},
				{
					value: 'MEDICO',
					label: 'Doctor',
					description: 'Manage appointments and assigned patients',
				},
				{
					value: 'ENFERMERO',
					label: 'Nurse',
					description: 'Clinical support and shift management',
				},
				{
					value: 'RECEPCIONISTA',
					label: 'Receptionist',
					description: 'Shift and appointment registration',
				},
				{
					value: 'ADMIN',
					label: 'Administrator',
					description: 'Full system access',
				},
			],
			trainingLevels: [
				{ id: 1, label: 'Technical' },
				{ id: 2, label: 'Technologist' },
				{ id: 3, label: 'Professional' },
				{ id: 4, label: 'Specialist' },
			],
			documentTypes: ['CC', 'TI', 'CE', 'PA', 'RC'],
			bloodTypes: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
			emptyHospitals: 'No hospitals available',
			errors: {
				requiredName: 'First name is required',
				requiredLastName: 'Last name is required',
				requiredEmail: 'Enter a valid email',
				requiredPassword: 'Password must be at least 6 characters long',
				requiredHospital: 'You must select a hospital',
				requiredDoctorRegistration: 'Medical license number is required',
				requiredDoctorSpecialty: 'Specialty ID must be a positive number',
				requiredNurseRegistration: 'Registration number is required',
				requiredNurseArea: 'Specialization area is required for nurses',
				loadHospitals: 'Unable to load hospitals list',
				submit: 'Unable to create account',
			},
		},
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
