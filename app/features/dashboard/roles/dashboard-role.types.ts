export type UserRole =
	| 'ADMIN'
	| 'MEDICO'
	| 'ENFERMERO'
	| 'RECEPCIONISTA'
	| 'PACIENTE';

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
}
