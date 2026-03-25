export type UserRole =
	| 'ADMIN'
	| 'MEDICO'
	| 'ENFERMERO'
	| 'RECEPCIONISTA'
	| 'PACIENTE';

export type DashboardSection =
	| 'overview'
	| 'hospitals'
	| 'patients'
	| 'appointments'
	| 'queue'
	| 'medicines'
	| 'doctors'
	| 'settings';

export type OverviewBlockKey =
	| 'kpiUsers'
	| 'kpiHospitals'
	| 'kpiPatients'
	| 'kpiDoctors'
	| 'kpiNurses'
	| 'kpiAppointments'
	| 'kpiQueue'
	| 'kpiMedicines'
	| 'recentAppointments'
	| 'queuePreview'
	| 'roleManagement';

export interface RoleUpdatePayload {
	role: UserRole;
	medicoData?: {
		numeroRegistro: string;
		especialidadId: number;
		consultorio?: string;
	};
	enfermeroData?: {
		numeroRegistro: string;
		nivelFormacion: number;
		areaEspecializacion?: number;
		certificacionTriage?: boolean;
	};
}

export interface DashboardUser {
	id: string;
	nombre: string;
	apellido: string;
	email: string;
	rol: UserRole;
}

export interface RoleViewProps {
	user: DashboardUser;
	locale: 'es' | 'en';
	section?: DashboardSection;
	selectedHospitalId?: number;
	overviewBlocks?: OverviewBlockKey[];
}
