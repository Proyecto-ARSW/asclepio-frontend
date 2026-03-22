import type { NavSection } from '@/components/medical/sidebar-nav';
import { type AppLocale, currentLocale } from '@/features/i18n/locale-path';

interface DashboardContent {
	sidebar: {
		brandName: string;
		logout: string;
		sections: Record<NavSection, string>;
	};
	overview: {
		title: string;
		adminActionsTitle: string;
		manageHospitals: string;
		activeConnections: string;
		restLabel: string;
		graphqlLabel: string;
	};
	hospitals: {
		title: string;
		subtitle: string;
		createHospital: string;
		createFirstHospital: string;
		refresh: string;
		refreshLoading: string;
		empty: string;
	};
	patients: {
		title: string;
		subtitle: string;
		tableTitle: string;
		refresh: string;
		emptyTitle: string;
		emptyDescription: string;
		headers: {
			patient: string;
			document: string;
			eps: string;
			blood: string;
			registry: string;
		};
	};
	alerts: {
		tempSession: string;
		tempSessionAction: string;
		hospitalsLoadError: string;
		patientsLoadError: string;
	};
	comingSoon: {
		description: string;
	};
	settings: {
		title: string;
		description: string;
		language: {
			title: string;
			description: string;
			es: string;
			en: string;
		};
		theme: {
			title: string;
			description: string;
			light: string;
			dark: string;
			system: string;
		};
		dyslexia: {
			title: string;
			description: string;
			toggle: string;
		};
	};
	createHospitalModal: {
		title: string;
		description: string;
		successTitle: string;
		successDescription: string;
		close: string;
		primaryInfo: string;
		contactInfo: string;
		fields: {
			name: string;
			department: string;
			city: string;
			address: string;
			nit: string;
			phone: string;
			institutionType: string;
			emergencyCapacity: string;
			consultingRooms: string;
			contactEmail: string;
		};
		placeholders: {
			name: string;
			department: string;
			city: string;
			address: string;
			nit: string;
			phone: string;
			institutionType: string;
			emergencyCapacity: string;
			consultingRooms: string;
			contactEmail: string;
		};
		actions: {
			cancel: string;
			submit: string;
			submitLoading: string;
		};
		errors: {
			nameRequired: string;
			departmentRequired: string;
			cityRequired: string;
			addressRequired: string;
			submit: string;
		};
	};
}

const byLocale: Record<AppLocale, DashboardContent> = {
	es: {
		sidebar: {
			brandName: 'Asclepio',
			logout: 'Cerrar sesion',
			sections: {
				overview: 'Inicio',
				hospitals: 'Hospitales',
				patients: 'Pacientes',
				appointments: 'Citas',
				queue: 'Turnos',
				medicines: 'Medicamentos',
				doctors: 'Medicos',
				settings: 'Configuracion',
			},
		},
		overview: {
			title: 'Panel de control',
			adminActionsTitle: 'Acciones de administrador',
			manageHospitals: 'Gestionar hospitales',
			activeConnections: 'Conexiones activas',
			restLabel: 'REST API',
			graphqlLabel: 'GraphQL',
		},
		hospitals: {
			title: 'Hospitales',
			subtitle: 'REST - GET /hospitals',
			createHospital: 'Crear hospital',
			createFirstHospital: 'Crear primer hospital',
			refresh: 'Actualizar',
			refreshLoading: 'Cargando...',
			empty: 'No hay hospitales registrados.',
		},
		patients: {
			title: 'Pacientes',
			subtitle: 'GraphQL - query patients { ... }',
			tableTitle: 'Pacientes',
			refresh: 'Actualizar',
			emptyTitle: 'Sin pacientes registrados',
			emptyDescription:
				'Los pacientes apareceran aqui una vez registrados en el sistema.',
			headers: {
				patient: 'Paciente',
				document: 'Documento',
				eps: 'EPS',
				blood: 'Sangre',
				registry: 'Registro',
			},
		},
		alerts: {
			tempSession:
				'Sesion temporal activa. Ve a Hospitales para crear y vincular tu primer hospital.',
			tempSessionAction: 'Hospitales',
			hospitalsLoadError: 'Error al cargar hospitales',
			patientsLoadError: 'Error al cargar pacientes',
		},
		comingSoon: {
			description:
				'Seccion disponible - conectar con GraphQL resolver correspondiente.',
		},
		settings: {
			title: 'Configuracion',
			description:
				'Personaliza idioma, apariencia y accesibilidad para tu sesion.',
			language: {
				title: 'Idioma',
				description: 'Cambia entre espanol e ingles en toda la interfaz.',
				es: 'Espanol',
				en: 'Ingles',
			},
			theme: {
				title: 'Tema',
				description: 'Selecciona el modo de color de la aplicacion.',
				light: 'Claro',
				dark: 'Oscuro',
				system: 'Sistema',
			},
			dyslexia: {
				title: 'Tipografia para dislexia',
				description:
					'Activa una tipografia y espaciado que facilitan la lectura.',
				toggle: 'Activar tipografia accesible',
			},
		},
		createHospitalModal: {
			title: 'Crear hospital',
			description: 'Completa los datos del nuevo hospital',
			successTitle: 'Hospital creado',
			successDescription: 'fue creado y establecido como tu hospital activo.',
			close: 'Cerrar',
			primaryInfo: 'Informacion principal',
			contactInfo: 'Contacto y capacidad',
			fields: {
				name: 'Nombre del hospital',
				department: 'Departamento',
				city: 'Ciudad',
				address: 'Direccion',
				nit: 'NIT',
				phone: 'Telefono',
				institutionType: 'Tipo de institucion',
				emergencyCapacity: 'Capacidad urgencias',
				consultingRooms: 'N. consultorios',
				contactEmail: 'Email de contacto',
			},
			placeholders: {
				name: 'Ej: Hospital General de Medellin',
				department: 'Ej: Antioquia',
				city: 'Ej: Medellin',
				address: 'Ej: Calle 119 # 7-75',
				nit: 'Ej: 900.123.456-1',
				phone: 'Ej: 6015956767',
				institutionType: 'Ej: PRIVADA',
				emergencyCapacity: 'Ej: 20',
				consultingRooms: 'Ej: 50',
				contactEmail: 'contacto@hospital.com',
			},
			actions: {
				cancel: 'Cancelar',
				submit: 'Crear hospital',
				submitLoading: 'Creando...',
			},
			errors: {
				nameRequired: 'El nombre es requerido',
				departmentRequired: 'El departamento es requerido',
				cityRequired: 'La ciudad es requerida',
				addressRequired: 'La direccion es requerida',
				submit: 'Error al crear el hospital',
			},
		},
	},
	en: {
		sidebar: {
			brandName: 'Asclepio',
			logout: 'Sign out',
			sections: {
				overview: 'Home',
				hospitals: 'Hospitals',
				patients: 'Patients',
				appointments: 'Appointments',
				queue: 'Queue',
				medicines: 'Medicines',
				doctors: 'Doctors',
				settings: 'Settings',
			},
		},
		overview: {
			title: 'Dashboard',
			adminActionsTitle: 'Admin actions',
			manageHospitals: 'Manage hospitals',
			activeConnections: 'Active connections',
			restLabel: 'REST API',
			graphqlLabel: 'GraphQL',
		},
		hospitals: {
			title: 'Hospitals',
			subtitle: 'REST - GET /hospitals',
			createHospital: 'Create hospital',
			createFirstHospital: 'Create first hospital',
			refresh: 'Refresh',
			refreshLoading: 'Loading...',
			empty: 'No hospitals registered yet.',
		},
		patients: {
			title: 'Patients',
			subtitle: 'GraphQL - query patients { ... }',
			tableTitle: 'Patients',
			refresh: 'Refresh',
			emptyTitle: 'No patients registered',
			emptyDescription:
				'Patients will appear here once they are registered in the system.',
			headers: {
				patient: 'Patient',
				document: 'Document',
				eps: 'Insurance',
				blood: 'Blood',
				registry: 'Created',
			},
		},
		alerts: {
			tempSession:
				'Temporary session active. Go to Hospitals to create and link your first hospital.',
			tempSessionAction: 'Hospitals',
			hospitalsLoadError: 'Unable to load hospitals',
			patientsLoadError: 'Unable to load patients',
		},
		comingSoon: {
			description:
				'Section available - connect the corresponding GraphQL resolver.',
		},
		settings: {
			title: 'Settings',
			description:
				'Customize language, appearance, and accessibility for your session.',
			language: {
				title: 'Language',
				description: 'Switch between Spanish and English across the interface.',
				es: 'Spanish',
				en: 'English',
			},
			theme: {
				title: 'Theme',
				description: 'Select the color mode for the application.',
				light: 'Light',
				dark: 'Dark',
				system: 'System',
			},
			dyslexia: {
				title: 'Dyslexia-friendly typography',
				description: 'Enable a reading-friendly font and spacing profile.',
				toggle: 'Enable accessible typography',
			},
		},
		createHospitalModal: {
			title: 'Create hospital',
			description: 'Fill in the new hospital information',
			successTitle: 'Hospital created',
			successDescription: 'was created and set as your active hospital.',
			close: 'Close',
			primaryInfo: 'Primary information',
			contactInfo: 'Contact and capacity',
			fields: {
				name: 'Hospital name',
				department: 'Department',
				city: 'City',
				address: 'Address',
				nit: 'Tax ID',
				phone: 'Phone',
				institutionType: 'Institution type',
				emergencyCapacity: 'Emergency capacity',
				consultingRooms: 'Consulting rooms',
				contactEmail: 'Contact email',
			},
			placeholders: {
				name: 'Example: General Hospital',
				department: 'Example: Antioquia',
				city: 'Example: Medellin',
				address: 'Example: Main street 12-34',
				nit: 'Example: 900.123.456-1',
				phone: 'Example: 6015956767',
				institutionType: 'Example: PRIVATE',
				emergencyCapacity: 'Example: 20',
				consultingRooms: 'Example: 50',
				contactEmail: 'contact@hospital.com',
			},
			actions: {
				cancel: 'Cancel',
				submit: 'Create hospital',
				submitLoading: 'Creating...',
			},
			errors: {
				nameRequired: 'Hospital name is required',
				departmentRequired: 'Department is required',
				cityRequired: 'City is required',
				addressRequired: 'Address is required',
				submit: 'Unable to create hospital',
			},
		},
	},
};

export function getDashboardContent(
	locale = currentLocale(),
): DashboardContent {
	return byLocale[locale];
}
