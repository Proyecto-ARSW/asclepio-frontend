import type { AppLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';

const ROLE_ALIASES = {
	ADMIN: 'ADMIN',
	DOCTOR: 'MEDICO',
	MEDICO: 'MEDICO',
	NURSE: 'ENFERMERO',
	ENFERMERO: 'ENFERMERO',
	RECEPTIONIST: 'RECEPCIONISTA',
	RECEPCIONISTA: 'RECEPCIONISTA',
	PATIENT: 'PACIENTE',
	PACIENTE: 'PACIENTE',
} as const;

type NormalizedRole = (typeof ROLE_ALIASES)[keyof typeof ROLE_ALIASES];

function normalizeRole(role: string | null | undefined): NormalizedRole | null {
	if (!role) return null;
	const key = role.trim().toUpperCase() as keyof typeof ROLE_ALIASES;
	return ROLE_ALIASES[key] ?? null;
}

function toReadableRole(role: string): string {
	return role
		.trim()
		.toLowerCase()
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

export function getLocalizedRoleLabel(
	role: string | null | undefined,
	locale: AppLocale,
): string {
	const normalizedRole = normalizeRole(role);
	switch (normalizedRole) {
		case 'ADMIN':
			return m.authRoleAdmin({}, { locale });
		case 'MEDICO':
			return m.authRoleDoctor({}, { locale });
		case 'ENFERMERO':
			return m.authRoleNurse({}, { locale });
		case 'RECEPCIONISTA':
			return m.authRoleReceptionist({}, { locale });
		case 'PACIENTE':
			return m.authRolePatient({}, { locale });
		default:
			return role ? toReadableRole(role) : m.authRolePatient({}, { locale });
	}
}
