import {
	ArrowPathIcon,
	CalendarDaysIcon,
	CheckCircleIcon,
	ClipboardDocumentListIcon,
	ClockIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	QueueListIcon,
	TrashIcon,
	XCircleIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	type AvailabilitySlot,
	AvailabilityWeekView,
} from '@/components/medical/availability-week-view';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import { Input } from '@/components/ui/input/input.component';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select/select.component';
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import type { AppLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import {
	gqlMutation,
	gqlQuery,
	gqlQueryWithFallback,
} from '@/lib/graphql-client';
import { getValidAccessTokenFromStorage } from '@/lib/auth-session';
import { SEARCH_API_URL } from '@/lib/env';
import type { DashboardSection, RoleViewProps } from './dashboard-role.types';
import { DoctorAnatomySection } from './doctor-anatomy.section';
import { ClinicalRecordCard } from '@/components/medical/clinical-record-card';
import { RoleDashboardShell } from './role-dashboard-shell';

// ─── Tipos GraphQL ────────────────────────────────────────────────────────────

interface DoctorProfile {
	id: string;
	usuarioId: string;
	email: string;
	especialidadId: number;
	consultorio: string | null;
}

interface Appointment {
	id: string;
	fechaHora: string;
	estado: string;
	motivo: string | null;
	notasMedico?: string | null;
	pacienteId: string;
}

interface Disponibilidad {
	id: number;
	diaSemana: number;
	horaInicio: string;
	horaFin: string;
	duracionCita: number;
	activo: boolean;
}

interface HistorialEntry {
	id: string;
	pacienteId: string;
	diagnostico: string;
	tratamiento: string;
	observaciones: string | null;
	creadoEn: string;
}

// Resultado devuelto por asclepio-search: búsqueda semántica sobre historias clínicas indexadas.
// record_id === historial.id, así se cruza con el estado local de historial.
interface ClinicalSearchResult {
	record_id: string;
	patient_id: string;
	similarity: number;
	notes_snippet: string;
	updated_at: string;
}

interface PatientOption {
	id: string;
	nombre: string;
	apellido: string;
	email?: string;
	tipoSangre?: string | null;
	eps?: string | null;
	numeroDocumento?: string | null;
}

interface Turno {
	id: string;
	numeroTurno: number;
	tipo: string;
	estado: string;
	pacienteId?: string;
	medicoId?: string | null;
	hospitalId?: number | null;
}

// ── Consentimiento informado (Ley 23/1981, Resolución 2003/2014 Colombia) ──
interface Consentimiento {
	id: number;
	pacienteId: string;
	tipoConsentimiento: string;
	consentimientoOtorgado: boolean;
	fechaConsentimiento: string;
	revocado: boolean;
	fechaRevocacion: string | null;
	documentoFirmado: string | null;
}

// ── Receta médica ──
interface Receta {
	id: number;
	historialId: string;
	medicamentoId: number;
	dosis: string | null;
	frecuencia: string | null;
	duracionDias: number | null;
	observaciones: string | null;
}

interface MedicineOption {
	id: number;
	nombreComercial: string;
	nombreGenerico?: string;
	presentacion?: string;
	requiereReceta: boolean;
}

// ─── Queries & Mutations ──────────────────────────────────────────────────────

const DOCTOR_PROFILE_QUERY = `
	query DoctorProfile {
		doctors {
			id
			usuarioId
			email
			especialidadId
			consultorio
		}
	}
`;

const DOCTOR_APPOINTMENTS_QUERY = `
	query DoctorAppointments($medicoId: ID!) {
		appoinmentsByDoctor(medicoId: $medicoId) {
			id
			fechaHora
			estado
			motivo
			notasMedico
			pacienteId
		}
	}
`;

const DOCTOR_APPOINTMENTS_QUERY_V2 = `
	query DoctorAppointmentsV2($medicoId: ID!) {
		appointmentsByDoctor(medicoId: $medicoId) {
			id
			fechaHora
			estado
			motivo
			notasMedico
			pacienteId
		}
	}
`;

const DOCTOR_DISPONIBILIDAD_QUERY = `
	query DoctorDisponibilidad($medicoId: ID!) {
		disponibilidadesByDoctor(medicoId: $medicoId) {
			id
			diaSemana
			horaInicio
			horaFin
			duracionCita
			activo
		}
	}
`;

const DOCTOR_HISTORIAL_QUERY = `
	query DoctorHistorial($medicoId: ID!) {
		historialByMedico(medicoId: $medicoId) {
			id
			pacienteId
			diagnostico
			tratamiento
			observaciones
			creadoEn
		}
	}
`;

// patientsByHospital filtra pacientes vinculados al hospital del médico
// a través de la tabla hospital_usuario, evitando mostrar pacientes
// de otros hospitales o usuarios con roles no-paciente.
const DOCTOR_PATIENTS_QUERY = `
	query DoctorPatientsByHospital($hospitalId: Int!) {
		patientsByHospital(hospitalId: $hospitalId) {
			id
			nombre
			apellido
			email
			tipoSangre
			eps
			numeroDocumento
		}
	}
`;

// Fallback: si el backend aún no soporta patientsByHospital, usa patients
const DOCTOR_PATIENTS_QUERY_FALLBACK = `
	query DoctorPatients {
		patients {
			id
			nombre
			apellido
			email
			tipoSangre
			eps
			numeroDocumento
		}
	}
`;

const DOCTOR_TURNS_QUERY = `
	query DoctorTurns {
		turnosPorHospital {
			id
			numeroTurno
			tipo
			estado
			pacienteId
			medicoId
			hospitalId
		}
	}
`;

const DOCTOR_TURNS_QUERY_FALLBACK = `
	query DoctorTurnsFallback {
		turnosPorHospital {
			id
			numeroTurno
			tipo
			estado
			pacienteId
			hospitalId
		}
	}
`;

const DOCTOR_TURNS_BY_HOSPITAL_QUERY = `
	query DoctorTurnsByHospital($hospitalId: Int!) {
		turnosPorHospital(hospitalId: $hospitalId) {
			id
			numeroTurno
			tipo
			estado
			pacienteId
			medicoId
			hospitalId
		}
	}
`;

const DOCTOR_TURNS_BY_HOSPITAL_QUERY_FALLBACK = `
	query DoctorTurnsByHospitalFallback($hospitalId: Int!) {
		turnosPorHospital(hospitalId: $hospitalId) {
			id
			numeroTurno
			tipo
			estado
			pacienteId
			hospitalId
		}
	}
`;

// Mutations para citas
const CONFIRM_APPOINTMENT = `
	mutation ConfirmAppointment($input: UpdateAppoinmentInput!) {
		updateAppoinment(input: $input) { id estado }
	}
`;

const CANCEL_APPOINTMENT = `
	mutation CancelAppointment($input: CancelAppoinmentInput!) {
		cancelAppoinment(input: $input) { id estado }
	}
`;

// Mutation para crear bloque de disponibilidad
const CREATE_DISPONIBILIDAD = `
	mutation CreateDisponibilidad($input: CreateDisponibilidadInput!) {
		createDisponibilidad(input: $input) {
			id
			diaSemana
			horaInicio
			horaFin
			duracionCita
			activo
		}
	}
`;

// Mutation para eliminar bloque de disponibilidad
const REMOVE_DISPONIBILIDAD = `
	mutation RemoveDisponibilidad($id: Int!) {
		removeDisponibilidad(id: $id) { id }
	}
`;

// Mutation para actualizar (activar/desactivar) disponibilidad
const UPDATE_DISPONIBILIDAD = `
	mutation UpdateDisponibilidad($input: UpdateDisponibilidadInput!) {
		updateDisponibilidad(input: $input) {
			id
			activo
		}
	}
`;

const UPDATE_DOCTOR_PROFILE = `
	mutation UpdateDoctorProfile($input: UpdateDoctorInput!) {
		updateDoctor(input: $input) {
			id
			consultorio
		}
	}
`;

// Mutation para crear historial médico
const CREATE_HISTORIAL = `
	mutation CreateHistorial($input: CreateHistorialInput!) {
		createHistorial(input: $input) {
			id
			diagnostico
			tratamiento
			observaciones
			creadoEn
		}
	}
`;

const ATTEND_TURN = `
	mutation DoctorAttendTurn($id: ID!) {
		atenderTurno(id: $id) {
			id
			estado
		}
	}
`;

// ── Consentimientos (cumplimiento Ley 23/1981 y Resolución 2003/2014) ────────
// El consentimiento informado es obligatorio antes de cualquier procedimiento
// quirúrgico, diagnóstico invasivo o tratamiento de alto riesgo en Colombia.

const CONSENTIMIENTOS_BY_PACIENTE = `
	query ConsentimientosByPaciente($pacienteId: ID!) {
		consentimientosByPaciente(pacienteId: $pacienteId) {
			id pacienteId tipoConsentimiento consentimientoOtorgado
			fechaConsentimiento revocado fechaRevocacion documentoFirmado
		}
	}
`;

const CREATE_CONSENTIMIENTO = `
	mutation CreateConsentimiento($input: CreateConsentimientoInput!) {
		createConsentimiento(input: $input) {
			id pacienteId tipoConsentimiento consentimientoOtorgado
			fechaConsentimiento revocado
		}
	}
`;

const REVOCAR_CONSENTIMIENTO = `
	mutation RevocarConsentimiento($id: Int!) {
		revocarConsentimiento(id: $id) {
			id revocado fechaRevocacion
		}
	}
`;

// ── Recetas médicas ─────────────────────────────────────────────────────────

const RECETAS_BY_HISTORIAL = `
	query RecetasByHistorial($historialId: ID!) {
		recetasByHistorial(historialId: $historialId) {
			id historialId medicamentoId dosis frecuencia duracionDias observaciones
		}
	}
`;

const CREATE_RECETA = `
	mutation CreateReceta($input: CreateRecetaInput!) {
		createReceta(input: $input) {
			id historialId medicamentoId dosis frecuencia duracionDias observaciones
		}
	}
`;

const MEDICINES_FOR_RECETA = `
	query MedicinesForReceta {
		medicines { id nombreComercial nombreGenerico presentacion requiereReceta }
	}
`;

// El backend expone `nurses` (sin filtro de hospital) — los campos nombre/apellido
// están aplanados directamente en la entidad Nurse, no en un sub-objeto `usuario`.
const ALL_NURSES_QUERY = `
	query AllNurses {
		nurses {
			id usuarioId nombre apellido numeroRegistro nivelFormacion
		}
	}
`;

const NURSE_DISPONIBILIDAD_QUERY = `
	query NurseDisponibilidad($enfermeroId: ID!) {
		disponibilidadesByNurse(enfermeroId: $enfermeroId) {
			id diaSemana horaInicio horaFin activo
		}
	}
`;

interface NurseForLookup {
	id: string;
	usuarioId: string;
	nombre: string;
	apellido: string;
	numeroRegistro: string;
	nivelFormacion: number;
}

interface NurseAvailSlot {
	id: number;
	diaSemana: number;
	horaInicio: string;
	horaFin: string;
	activo: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_ES = [
	'Domingo',
	'Lunes',
	'Martes',
	'Miércoles',
	'Jueves',
	'Viernes',
	'Sábado',
];
const DAYS_EN = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
];

function dayLabel(day: number, locale: AppLocale) {
	return locale === 'es' ? (DAYS_ES[day] ?? day) : (DAYS_EN[day] ?? day);
}

function statusVariant(
	estado: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (estado) {
		case 'CONFIRMADA':
			return 'default';
		case 'CANCELADA':
			return 'destructive';
		case 'COMPLETADA':
			return 'secondary';
		default:
			return 'outline';
	}
}

function statusLabel(estado: string, locale: AppLocale) {
	switch (estado) {
		case 'PENDIENTE':
			return m.dashboardStatusPending({}, { locale });
		case 'CONFIRMADA':
			return m.dashboardStatusConfirmed({}, { locale });
		case 'CANCELADA':
			return m.dashboardStatusCancelled({}, { locale });
		case 'COMPLETADA':
			return m.dashboardStatusAttended({}, { locale });
		default:
			return estado;
	}
}

function turnVariant(
	estado: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (estado) {
		case 'EN_CONSULTA':
			return 'default';
		case 'ATENDIDO':
			return 'secondary';
		case 'CANCELADO':
			return 'destructive';
		default:
			return 'outline';
	}
}

function turnLabel(estado: string, locale: AppLocale) {
	switch (estado) {
		case 'EN_ESPERA':
			return m.dashboardStatusWaiting({}, { locale });
		case 'EN_CONSULTA':
			return m.dashboardStatusInConsultation({}, { locale });
		case 'ATENDIDO':
			return m.dashboardStatusAttended({}, { locale });
		case 'CANCELADO':
			return m.dashboardStatusCancelled({}, { locale });
		default:
			return estado;
	}
}

function isTurnClosed(estado: string) {
	return /^(ATENDIDO|ATENDIDA|CANCELADO|CANCELADA)$/i.test(estado);
}

function isConsultationTurn(estado: string) {
	return /^EN_CONSULTA$/i.test(estado);
}

// ─── Helpers de disponibilidad ───────────────────────────────────────────────

/**
 * Convierte 'HH:MM' a ISO 8601 preservando la hora en la zona local.
 * Se usa `new Date()` con setHours para que el offset local se incluya
 * en el ISO string resultante → el backend recibe la hora UTC correcta.
 * Antes usaba '1970-01-01T${hhmm}:00.000Z' (UTC fijo), que hacía que
 * el médico en UTC-5 al ingresar "09:00" enviara 09:00 UTC = 04:00 local.
 */
function toIsoTime(hhmm: string): string {
	const [hours, minutes] = hhmm.split(':').map(Number);
	const d = new Date();
	d.setHours(hours, minutes, 0, 0);
	return d.toISOString();
}

/**
 * Extrae 'HH:MM' en hora LOCAL de un ISO date string.
 * Antes usaba toISOString().slice(11,16) que siempre daba UTC,
 * causando que el médico viera horarios desfasados respecto al paciente.
 */
function formatTime(t: string | Date): string {
	if (!t) return '';
	const d = new Date(t);
	if (Number.isNaN(d.getTime())) {
		return String(t).slice(0, 5);
	}
	// getHours/getMinutes retornan hora LOCAL, no UTC
	const h = String(d.getHours()).padStart(2, '0');
	const min = String(d.getMinutes()).padStart(2, '0');
	return `${h}:${min}`;
}

/**
 * Calcula la duración sugerida (en minutos) dado el rango horario.
 * Elige el mayor preset que quepa al menos una vez dentro del bloque.
 */
const DURATION_PRESETS = [10, 15, 20, 30, 45, 60, 90] as const;

function buildTimeOptions(stepMinutes: number): string[] {
	const options: string[] = [];
	for (let total = 0; total < 24 * 60; total += stepMinutes) {
		const hours = String(Math.floor(total / 60)).padStart(2, '0');
		const minutes = String(total % 60).padStart(2, '0');
		options.push(`${hours}:${minutes}`);
	}
	return options;
}

const TIME_OPTIONS = buildTimeOptions(15);

function suggestDuration(inicio: string, fin: string): number {
	const [sh, sm] = inicio.split(':').map(Number);
	const [eh, em] = fin.split(':').map(Number);
	const diff = eh * 60 + em - (sh * 60 + sm);
	if (diff <= 0) return 30;
	return [...DURATION_PRESETS].reverse().find((p) => p <= diff) ?? 30;
}

/**
 * Traduce errores del backend a mensajes amigables en español para el usuario final.
 * Los mensajes técnicos de GraphQL/class-validator nunca deben mostrarse directamente.
 */
function friendlyDisponibilidadError(raw: string, locale: AppLocale): string {
	if (/horaFin debe ser posterior/i.test(raw))
		return m.dashboardDoctorErrorEndTimeAfterStart({}, { locale });
	if (/Ya existe un bloque/i.test(raw))
		return m.dashboardDoctorErrorSlotAlreadyExists({}, { locale });
	if (/diaSemana/i.test(raw))
		return m.dashboardDoctorErrorInvalidWeekDay({}, { locale });
	if (/duracionCita/i.test(raw))
		return m.dashboardDoctorErrorInvalidDuration({}, { locale });
	if (/Bad Request|validation/i.test(raw))
		return m.dashboardDoctorErrorInvalidInput({}, { locale });
	if (/network|fetch|unavailable/i.test(raw))
		return m.dashboardDoctorErrorNetwork({}, { locale });
	return m.dashboardDoctorErrorSaveAvailability({}, { locale });
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function DoctorDashboardView({
	user,
	locale,
	section = 'overview',
	selectedHospitalId,
}: RoleViewProps) {
	const [doctorId, setDoctorId] = useState<string | null>(null);
	const [missingProfile, setMissingProfile] = useState(false);
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [turns, setTurns] = useState<Turno[]>([]);
	const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([]);
	const [historial, setHistorial] = useState<HistorialEntry[]>([]);
	const [patients, setPatients] = useState<PatientOption[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState('');
	const [consultorioInput, setConsultorioInput] = useState('');
	const [patientSearch, setPatientSearch] = useState('');

	// ── Búsqueda semántica de historial (asclepio-search) ──
	// historialSearch: texto del input; searchResults: lo que devuelve el servicio;
	// historialFilter: filtro local por tipo de campo visible en la tarjeta.
	const [historialSearch, setHistorialSearch] = useState('');
	const [searchResults, setSearchResults] = useState<ClinicalSearchResult[]>([]);
	const [searchLoading, setSearchLoading] = useState(false);
	const [historialFilter, setHistorialFilter] = useState<
		'all' | 'diagnostico' | 'tratamiento' | 'observaciones'
	>('all');

	// ── Búsqueda de disponibilidad de enfermeros ──
	const [hospitalNurses, setHospitalNurses] = useState<NurseForLookup[]>([]);
	const [nurseSearch, setNurseSearch] = useState('');
	const [selectedNurseId, setSelectedNurseId] = useState<string | null>(null);
	const [nurseSlots, setNurseSlots] = useState<NurseAvailSlot[]>([]);
	const [nurseSlotsLoading, setNurseSlotsLoading] = useState(false);

	// ── Consentimientos y recetas ──
	const [consentimientos, setConsentimientos] = useState<Consentimiento[]>([]);
	const [consentimientoPacienteId, setConsentimientoPacienteId] = useState('');
	const [newConsentimiento, setNewConsentimiento] = useState({
		tipoConsentimiento: '',
		consentimientoOtorgado: true,
	});
	const [recetas, setRecetas] = useState<Receta[]>([]);
	const [recetaHistorialId, setRecetaHistorialId] = useState('');
	const [medicineOptions, setMedicineOptions] = useState<MedicineOption[]>([]);
	const [newReceta, setNewReceta] = useState({
		medicamentoId: 0,
		dosis: '',
		frecuencia: '',
		duracionDias: 0,
		observaciones: '',
	});

	// ── Formulario de disponibilidad ──
	const [newSlot, setNewSlot] = useState({
		diaSemana: 1,
		horaInicio: '08:00',
		horaFin: '17:00',
		duracionCita: 30,
	});

	// ── Formulario de historial ──
	const [newHistorial, setNewHistorial] = useState({
		diagnostico: '',
		tratamiento: '',
		observaciones: '',
		// El pacienteId se necesita para crear historial; usamos el primer paciente de las citas
		pacienteId: '',
		citaId: '',
	});

	// ── Carga de datos según la sección activa ──
	// Separar carga por sección evita consultas innecesarias al backend
	const loadProfile = useCallback(async () => {
		const doctors = await gqlQuery<{ doctors: DoctorProfile[] }>(
			DOCTOR_PROFILE_QUERY,
		);
		const normalizedUserId = String(user.id);
		const normalizedUserEmail = user.email.trim().toLowerCase();
		const mine =
			doctors.doctors.find((d) => String(d.usuarioId) === normalizedUserId) ??
			doctors.doctors.find(
				(d) => d.email.trim().toLowerCase() === normalizedUserEmail,
			);
		if (!mine) {
			setMissingProfile(true);
			return null;
		}
		setDoctorId(mine.id);
		setConsultorioInput(mine.consultorio ?? '');
		return mine;
	}, [user.email, user.id]);

	const loadAppointments = useCallback(async (id: string) => {
		const res = await gqlQueryWithFallback<{
			appoinmentsByDoctor?: Appointment[];
			appointmentsByDoctor?: Appointment[];
		}>([DOCTOR_APPOINTMENTS_QUERY, DOCTOR_APPOINTMENTS_QUERY_V2], {
			medicoId: id,
		});
		const resolved = res.appoinmentsByDoctor ?? res.appointmentsByDoctor ?? [];
		setAppointments(resolved);
		return resolved;
	}, []);

	const loadDisponibilidad = useCallback(async (id: string) => {
		const res = await gqlQuery<{
			disponibilidadesByDoctor: Disponibilidad[];
		}>(DOCTOR_DISPONIBILIDAD_QUERY, { medicoId: id });
		setDisponibilidad(res.disponibilidadesByDoctor);
	}, []);

	const loadHistorial = useCallback(async (id: string) => {
		const res = await gqlQuery<{ historialByMedico: HistorialEntry[] }>(
			DOCTOR_HISTORIAL_QUERY,
			{ medicoId: id },
		);
		setHistorial(res.historialByMedico);
	}, []);

	const loadPatients = useCallback(async () => {
		if (selectedHospitalId) {
			try {
				// Intenta usar patientsByHospital para mostrar solo pacientes del hospital
				const res = await gqlQuery<{ patientsByHospital: PatientOption[] }>(
					DOCTOR_PATIENTS_QUERY,
					{ hospitalId: selectedHospitalId },
				);
				setPatients(res.patientsByHospital);
				return;
			} catch {
				// Si el backend no soporta patientsByHospital aún, cae al fallback
			}
		}
		const res = await gqlQuery<{ patients: PatientOption[] }>(
			DOCTOR_PATIENTS_QUERY_FALLBACK,
		);
		setPatients(res.patients);
	}, [selectedHospitalId]);

	const loadTurns = useCallback(async () => {
		let turnosPorHospital: Turno[] = [];

		if (selectedHospitalId) {
			try {
				const scoped = await gqlQuery<{ turnosPorHospital: Turno[] }>(
					DOCTOR_TURNS_BY_HOSPITAL_QUERY,
					{ hospitalId: selectedHospitalId },
				);
				turnosPorHospital = scoped.turnosPorHospital ?? [];
			} catch {
				try {
					const scopedFallback = await gqlQuery<{ turnosPorHospital: Turno[] }>(
						DOCTOR_TURNS_BY_HOSPITAL_QUERY_FALLBACK,
						{ hospitalId: selectedHospitalId },
					);
					turnosPorHospital = scopedFallback.turnosPorHospital ?? [];
				} catch {
					const fallback = await gqlQuery<{ turnosPorHospital: Turno[] }>(
						DOCTOR_TURNS_QUERY_FALLBACK,
					);
					turnosPorHospital = fallback.turnosPorHospital ?? [];
				}
			}
		} else {
			try {
				const fallback = await gqlQuery<{ turnosPorHospital: Turno[] }>(
					DOCTOR_TURNS_QUERY,
				);
				turnosPorHospital = fallback.turnosPorHospital ?? [];
			} catch {
				const legacyFallback = await gqlQuery<{ turnosPorHospital: Turno[] }>(
					DOCTOR_TURNS_QUERY_FALLBACK,
				);
				turnosPorHospital = legacyFallback.turnosPorHospital ?? [];
			}
		}

		setTurns(turnosPorHospital);
		return turnosPorHospital;
	}, [selectedHospitalId]);

	const loadData = useCallback(async () => {
		setLoading(true);
		setError('');
		setMissingProfile(false);
		try {
			const profile = await loadProfile();
			if (!profile) return;
			// Carga paralela según sección — evita waterfall de requests
			await Promise.all([
				section === 'overview' ||
				section === 'appointments' ||
				section === 'historial'
					? loadAppointments(profile.id)
					: Promise.resolve(),
				section === 'overview' || section === 'queue'
					? loadTurns()
					: Promise.resolve(),
				section === 'overview' || section === 'disponibilidad'
					? loadDisponibilidad(profile.id)
					: Promise.resolve(),
				section === 'historial' ? loadHistorial(profile.id) : Promise.resolve(),
				section === 'historial' || section === 'patients'
					? loadPatients()
					: Promise.resolve(),
			]);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.rootErrorUnexpected({}, { locale }),
			);
		} finally {
			setLoading(false);
		}
	}, [
		loadProfile,
		loadAppointments,
		loadTurns,
		loadDisponibilidad,
		loadHistorial,
		loadPatients,
		locale,
		section,
	]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	// Precargar medicamentos al entrar en la sección de recetas.
	// Este useEffect vivía dentro de RecetasSection(), pero como renderSection()
	// invoca las secciones como funciones (no como JSX), los hooks dentro de ellas
	// se ejecutan condicionalmente y violan la regla de hooks de React
	// ("Rendered more hooks than during the previous render").
	// Al moverlo al cuerpo del componente padre se ejecuta siempre, respetando
	// la regla, y la guarda `section === 'recetas'` evita trabajo innecesario.
	useEffect(() => {
		if (section !== 'recetas') return;
		if (medicineOptions.length > 0) return;
		gqlQuery<{ medicines: MedicineOption[] }>(MEDICINES_FOR_RECETA)
			.then((res) => setMedicineOptions(res.medicines))
			.catch(() => {});
	}, [section, medicineOptions.length]);

	// Búsqueda semántica en asclepio-search con debounce de 400ms.
	// Se activa solo en la sección historial y cuando el query tiene ≥3 chars
	// (mínimo requerido por el backend para generar un embedding significativo).
	// El JWT se lee del localStorage via getValidAccessTokenFromStorage — misma
	// fuente que usa api.ts, así no necesitamos prop-drill del token.
	useEffect(() => {
		if (section !== 'historial') return;
		if (!historialSearch.trim() || historialSearch.length < 3) {
			setSearchResults([]);
			return;
		}
		const timer = setTimeout(async () => {
			setSearchLoading(true);
			try {
				const token = getValidAccessTokenFromStorage();
				const res = await fetch(
					`${SEARCH_API_URL}/search?q=${encodeURIComponent(historialSearch)}&limit=20`,
					{ headers: { Authorization: `Bearer ${token ?? ''}` } },
				);
				if (!res.ok) throw new Error(`search ${res.status}`);
				const data = (await res.json()) as { results?: ClinicalSearchResult[] };
				setSearchResults(data.results ?? []);
			} catch {
				setSearchResults([]);
			} finally {
				setSearchLoading(false);
			}
		}, 400);
		return () => clearTimeout(timer);
	}, [historialSearch, section]);

	// Cargar enfermeros al entrar en disponibilidad.
	// El backend solo expone `nurses` (sin filtro de hospital), así que cargamos
	// todos y filtramos en cliente si es necesario.
	useEffect(() => {
		if (section !== 'disponibilidad') return;
		if (hospitalNurses.length > 0) return;
		gqlQuery<{ nurses: NurseForLookup[] }>(ALL_NURSES_QUERY)
			.then((res) => setHospitalNurses(res.nurses))
			.catch(() => {});
	}, [section, hospitalNurses.length]);

	// Cargar disponibilidad del enfermero seleccionado
	useEffect(() => {
		if (!selectedNurseId) {
			setNurseSlots([]);
			return;
		}
		setNurseSlotsLoading(true);
		gqlQuery<{ disponibilidadesByNurse: NurseAvailSlot[] }>(
			NURSE_DISPONIBILIDAD_QUERY,
			{ enfermeroId: selectedNurseId },
		)
			.then((res) => setNurseSlots(res.disponibilidadesByNurse))
			.catch(() => setNurseSlots([]))
			.finally(() => setNurseSlotsLoading(false));
	}, [selectedNurseId]);

	useEffect(() => {
		if (!(section === 'queue' || section === 'overview')) return;

		let disposed = false;
		const runRefresh = async () => {
			if (disposed) return;
			if (
				typeof document !== 'undefined' &&
				document.visibilityState === 'hidden'
			) {
				return;
			}
			try {
				await loadTurns();
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: m.rootErrorUnexpected({}, { locale }),
				);
			}
		};

		void runRefresh();
		const interval = window.setInterval(() => {
			void runRefresh();
		}, 4000);

		return () => {
			disposed = true;
			window.clearInterval(interval);
		};
	}, [loadTurns, locale, section]);

	// ── KPIs del overview ──
	const today = new Date().toDateString();
	const kpiToday = useMemo(
		() =>
			appointments.filter((a) => new Date(a.fechaHora).toDateString() === today)
				.length,
		[appointments, today],
	);
	const kpiPending = useMemo(
		() => appointments.filter((a) => a.estado === 'PENDIENTE').length,
		[appointments],
	);
	const doctorTurns = useMemo(() => {
		if (!doctorId) return [];
		return turns.filter(
			(turn) => String(turn.medicoId ?? '') === String(doctorId),
		);
	}, [doctorId, turns]);
	const activeDoctorTurns = useMemo(
		() =>
			doctorTurns
				.filter((turn) => !isTurnClosed(turn.estado))
				.sort((a, b) => a.numeroTurno - b.numeroTurno),
		[doctorTurns],
	);
	const currentDoctorTurn = useMemo(
		() =>
			[...activeDoctorTurns].find((turn) => isConsultationTurn(turn.estado)) ??
			activeDoctorTurns[0],
		[activeDoctorTurns],
	);

	// ── Acción: confirmar cita ──
	// UpdateAppoinmentInput solo acepta {id, notasMedico?, motivo?}.
	// Enviar solo id no genera cambios persistentes en backend.
	async function handleConfirm(appointment: Appointment) {
		const id = appointment.id;
		setActionLoading(id);
		setError('');
		try {
			const motivo = appointment.motivo?.trim();
			const notasMedico = appointment.notasMedico?.trim();
			const confirmationPayload: {
				id: string;
				notasMedico?: string;
				motivo?: string;
			} = { id };

			if (notasMedico) {
				confirmationPayload.notasMedico = notasMedico;
			} else if (motivo) {
				confirmationPayload.motivo = motivo;
			} else {
				confirmationPayload.notasMedico = m.dashboardStatusConfirmed(
					{},
					{ locale },
				);
			}

			const response = await gqlMutation<{
				updateAppoinment: { id: string; estado: string };
			}>(CONFIRM_APPOINTMENT, {
				input: confirmationPayload,
			});

			let finalState = response.updateAppoinment.estado;
			if (doctorId) {
				const refreshed = await loadAppointments(doctorId);
				finalState =
					refreshed.find((item) => item.id === id)?.estado ?? finalState;
			} else {
				setAppointments((prev) =>
					prev.map((a) =>
						a.id === id
							? { ...a, estado: response.updateAppoinment.estado }
							: a,
					),
				);
			}

			if (finalState !== 'CONFIRMADA') {
				setError(m.rootErrorUnexpected({}, { locale }));
				return;
			}
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: cancelar cita ──
	async function handleCancel(id: string) {
		setActionLoading(`${id}-cancel`);
		setError('');
		try {
			// canceladaPor: user.id identifica quién cancela (requerido por el backend)
			// motivoCancelacion: nombre correcto del campo en CancelAppoinmentInput
			await gqlMutation(CANCEL_APPOINTMENT, {
				input: {
					id,
					canceladaPor: user.id,
					motivoCancelacion: m.dashboardDoctorCancellationReason(
						{},
						{ locale },
					),
				},
			});
			setAppointments((prev) =>
				prev.map((a) => (a.id === id ? { ...a, estado: 'CANCELADA' } : a)),
			);
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	async function handleAttendTurn(id: string) {
		setActionLoading(`attend-turn-${id}`);
		setError('');
		try {
			await gqlMutation(ATTEND_TURN, { id });
			setTurns((prev) =>
				prev.map((turn) =>
					turn.id === id ? { ...turn, estado: 'ATENDIDO' } : turn,
				),
			);
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: agregar bloque de disponibilidad ──
	async function handleAddSlot() {
		if (!doctorId) return;

		// Validación en cliente antes de llamar al backend — evita un round-trip innecesario
		const [sh, sm] = newSlot.horaInicio.split(':').map(Number);
		const [eh, em] = newSlot.horaFin.split(':').map(Number);
		if (eh * 60 + em <= sh * 60 + sm) {
			setError(m.dashboardDoctorErrorEndTimeAfterStart({}, { locale }));
			return;
		}

		setActionLoading('new-slot');
		setError('');
		try {
			const res = await gqlMutation<{ createDisponibilidad: Disponibilidad }>(
				CREATE_DISPONIBILIDAD,
				{
					input: {
						medicoId: doctorId,
						diaSemana: newSlot.diaSemana,
						// El backend espera un Date completo; enviamos ISO con fecha base arbitraria
						horaInicio: toIsoTime(newSlot.horaInicio),
						horaFin: toIsoTime(newSlot.horaFin),
						duracionCita: newSlot.duracionCita,
					},
				},
			);
			setDisponibilidad((prev) => [...prev, res.createDisponibilidad]);
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				friendlyDisponibilidadError(
					err instanceof Error ? err.message : '',
					locale,
				),
			);
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: eliminar bloque de disponibilidad ──
	async function handleDeleteSlot(id: number) {
		setActionLoading(`delete-slot-${id}`);
		setError('');
		try {
			await gqlMutation(REMOVE_DISPONIBILIDAD, { id });
			setDisponibilidad((prev) => prev.filter((s) => s.id !== id));
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: activar/desactivar bloque ──
	async function handleToggleSlot(slot: Disponibilidad) {
		setActionLoading(`toggle-slot-${slot.id}`);
		setError('');
		try {
			await gqlMutation(UPDATE_DISPONIBILIDAD, {
				input: { id: slot.id, activo: !slot.activo },
			});
			setDisponibilidad((prev) =>
				prev.map((s) => (s.id === slot.id ? { ...s, activo: !s.activo } : s)),
			);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	async function handleSaveConsultorio() {
		if (!doctorId) return;
		setActionLoading('save-consultorio');
		setError('');
		try {
			const trimmed = consultorioInput.trim();
			const response = await gqlMutation<{
				updateDoctor: { id: string; consultorio: string | null };
			}>(UPDATE_DOCTOR_PROFILE, {
				input: {
					id: doctorId,
					consultorio: trimmed.length > 0 ? trimmed : null,
				},
			});
			setConsultorioInput(response.updateDoctor.consultorio ?? '');
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: crear historial médico ──
	async function handleCreateHistorial() {
		if (!doctorId || !newHistorial.pacienteId || !newHistorial.diagnostico)
			return;
		setActionLoading('new-historial');
		setError('');
		try {
			const res = await gqlMutation<{ createHistorial: HistorialEntry }>(
				CREATE_HISTORIAL,
				{
					input: {
						medicoId: doctorId,
						pacienteId: newHistorial.pacienteId,
						citaId: newHistorial.citaId || undefined,
						diagnostico: newHistorial.diagnostico,
						tratamiento: newHistorial.tratamiento,
						observaciones: newHistorial.observaciones || undefined,
					},
				},
			);
			setHistorial((prev) => [res.createHistorial, ...prev]);
			setNewHistorial({
				diagnostico: '',
				tratamiento: '',
				observaciones: '',
				pacienteId: '',
				citaId: '',
			});
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	// ── Consentimientos: carga, creación y revocación ──

	async function loadConsentimientos(pacienteId: string) {
		try {
			const res = await gqlQuery<{
				consentimientosByPaciente: Consentimiento[];
			}>(CONSENTIMIENTOS_BY_PACIENTE, { pacienteId });
			setConsentimientos(res.consentimientosByPaciente);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		}
	}

	async function handleCreateConsentimiento() {
		if (!consentimientoPacienteId || !newConsentimiento.tipoConsentimiento)
			return;
		setActionLoading('create-consent');
		setError('');
		try {
			const res = await gqlMutation<{
				createConsentimiento: Consentimiento;
			}>(CREATE_CONSENTIMIENTO, {
				input: {
					pacienteId: consentimientoPacienteId,
					tipoConsentimiento: newConsentimiento.tipoConsentimiento,
					consentimientoOtorgado: newConsentimiento.consentimientoOtorgado,
				},
			});
			setConsentimientos((prev) => [res.createConsentimiento, ...prev]);
			setNewConsentimiento({
				tipoConsentimiento: '',
				consentimientoOtorgado: true,
			});
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	async function handleRevocarConsentimiento(id: number) {
		setActionLoading(`revoke-${id}`);
		setError('');
		try {
			const res = await gqlMutation<{
				revocarConsentimiento: {
					id: number;
					revocado: boolean;
					fechaRevocacion: string;
				};
			}>(REVOCAR_CONSENTIMIENTO, { id });
			setConsentimientos((prev) =>
				prev.map((c) =>
					c.id === id
						? {
								...c,
								revocado: true,
								fechaRevocacion: res.revocarConsentimiento.fechaRevocacion,
							}
						: c,
				),
			);
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	// ── Recetas: carga y creación ──

	async function loadRecetas(historialId: string) {
		try {
			const [recetasRes, medsRes] = await Promise.all([
				gqlQuery<{ recetasByHistorial: Receta[] }>(RECETAS_BY_HISTORIAL, {
					historialId,
				}),
				medicineOptions.length === 0
					? gqlQuery<{ medicines: MedicineOption[] }>(MEDICINES_FOR_RECETA)
					: Promise.resolve({ medicines: medicineOptions }),
			]);
			setRecetas(recetasRes.recetasByHistorial);
			if (medsRes.medicines !== medicineOptions)
				setMedicineOptions(medsRes.medicines);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		}
	}

	async function handleCreateReceta() {
		if (!recetaHistorialId || !newReceta.medicamentoId) return;
		setActionLoading('create-receta');
		setError('');
		try {
			const res = await gqlMutation<{ createReceta: Receta }>(CREATE_RECETA, {
				input: {
					historialId: recetaHistorialId,
					medicamentoId: newReceta.medicamentoId,
					dosis: newReceta.dosis || undefined,
					frecuencia: newReceta.frecuencia || undefined,
					duracionDias: newReceta.duracionDias || undefined,
					observaciones: newReceta.observaciones || undefined,
				},
			});
			setRecetas((prev) => [...prev, res.createReceta]);
			setNewReceta({
				medicamentoId: 0,
				dosis: '',
				frecuencia: '',
				duracionDias: 0,
				observaciones: '',
			});
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	// Muestra un mensaje de éxito temporal
	function flash(msg: string) {
		setSuccessMsg(msg);
		setTimeout(() => setSuccessMsg(''), 3000);
	}

	// ─── Render de secciones ──────────────────────────────────────────────────

	function renderSection(sec: DashboardSection) {
		switch (sec) {
			case 'overview':
				return OverviewSection();
			case 'patients':
				return PatientsSection();
			case 'appointments':
				return AppointmentsSection();
			case 'queue':
				return QueueSection();
			case 'disponibilidad':
				return DisponibilidadSection();
			case 'historial':
				return HistorialSection();
			case 'consentimientos':
				return ConsentimientosSection();
			case 'recetas':
				return RecetasSection();
			case 'anatomy3d':
				// Sección educativa: el médico muestra modelos 3D al paciente
				// como apoyo visual durante la consulta (corazón, esqueleto, ADN).
				return (
					<DoctorAnatomySection
						locale={locale}
						isDark={
							typeof document !== 'undefined' &&
							document.documentElement.classList.contains('dark')
						}
					/>
				);
			default:
				return null;
		}
	}

	// ── Sección de consentimientos informados ─────────────────────────────────
	// Ley 23 de 1981 Art. 15 y Resolución 2003 de 2014 Colombia:
	// El médico debe obtener consentimiento informado del paciente antes de
	// cualquier procedimiento, tratamiento o estudio diagnóstico invasivo.
	function ConsentimientosSection() {
		// Tipos comunes de consentimiento según normativa colombiana
		const tiposConsentimiento = [
			locale === 'es' ? 'Procedimiento quirúrgico' : 'Surgical procedure',
			locale === 'es' ? 'Anestesia' : 'Anesthesia',
			locale === 'es'
				? 'Tratamiento farmacológico'
				: 'Pharmacological treatment',
			locale === 'es'
				? 'Estudio diagnóstico invasivo'
				: 'Invasive diagnostic study',
			locale === 'es' ? 'Transfusión sanguínea' : 'Blood transfusion',
			locale === 'es'
				? 'Tratamiento de datos personales'
				: 'Personal data processing',
		];

		return (
			<div className="space-y-4">
				{/* Formulario para registrar consentimiento */}
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">
							{locale === 'es'
								? 'Registrar consentimiento informado'
								: 'Register informed consent'}
						</CardTitle>
						<CardDescription>
							{locale === 'es'
								? 'Ley 23/1981 Art. 15: El médico debe obtener autorización expresa del paciente.'
								: 'The physician must obtain express authorization from the patient.'}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1">
								<label
									htmlFor="consent-patient"
									className="text-xs font-medium text-muted-foreground"
								>
									{m.dashboardSidebarPatients({}, { locale })}
								</label>
								<Select
									value={consentimientoPacienteId}
									onValueChange={(v) => {
										setConsentimientoPacienteId(v ?? '');
										if (v) void loadConsentimientos(v);
									}}
								>
									<SelectTrigger id="consent-patient" className="w-full">
										<SelectValue
											placeholder={
												locale === 'es'
													? 'Seleccionar paciente'
													: 'Select patient'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{patients.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.nombre} {p.apellido}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<label
									htmlFor="consent-type"
									className="text-xs font-medium text-muted-foreground"
								>
									{locale === 'es' ? 'Tipo de consentimiento' : 'Consent type'}
								</label>
								<Select
									value={newConsentimiento.tipoConsentimiento}
									onValueChange={(v) =>
										setNewConsentimiento((prev) => ({
											...prev,
											tipoConsentimiento: v ?? '',
										}))
									}
								>
									<SelectTrigger id="consent-type" className="w-full">
										<SelectValue
											placeholder={
												locale === 'es' ? 'Seleccionar...' : 'Select...'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{tiposConsentimiento.map((tipo) => (
											<SelectItem key={tipo} value={tipo}>
												{tipo}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="consent-granted"
								checked={newConsentimiento.consentimientoOtorgado}
								onChange={(e) =>
									setNewConsentimiento((prev) => ({
										...prev,
										consentimientoOtorgado: e.target.checked,
									}))
								}
								className="h-4 w-4 rounded border-border"
							/>
							<label
								htmlFor="consent-granted"
								className="text-sm text-foreground"
							>
								{locale === 'es'
									? 'Paciente otorga consentimiento'
									: 'Patient grants consent'}
							</label>
						</div>
						<Button
							type="button"
							onClick={handleCreateConsentimiento}
							disabled={
								!consentimientoPacienteId ||
								!newConsentimiento.tipoConsentimiento ||
								actionLoading === 'create-consent'
							}
							className="gap-2"
						>
							{actionLoading === 'create-consent'
								? m.dashboardActionSaving({}, { locale })
								: locale === 'es'
									? 'Registrar consentimiento'
									: 'Register consent'}
						</Button>
					</CardContent>
				</Card>

				{/* Lista de consentimientos del paciente seleccionado */}
				{consentimientoPacienteId && (
					<Card className="border-border/70">
						<CardHeader className="pb-2">
							<CardTitle className="text-base">
								{locale === 'es'
									? 'Consentimientos registrados'
									: 'Registered consents'}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{consentimientos.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									{locale === 'es'
										? 'No hay consentimientos registrados para este paciente.'
										: 'No consents registered for this patient.'}
								</p>
							) : (
								consentimientos.map((c) => (
									<div
										key={c.id}
										className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/90 p-3"
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium text-foreground">
												{c.tipoConsentimiento}
											</p>
											<p className="text-xs text-muted-foreground">
												{new Date(c.fechaConsentimiento).toLocaleDateString(
													locale,
													{
														day: '2-digit',
														month: 'long',
														year: 'numeric',
													},
												)}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Badge
												variant={
													c.revocado
														? 'destructive'
														: c.consentimientoOtorgado
															? 'default'
															: 'secondary'
												}
											>
												{c.revocado
													? locale === 'es'
														? 'Revocado'
														: 'Revoked'
													: c.consentimientoOtorgado
														? locale === 'es'
															? 'Otorgado'
															: 'Granted'
														: locale === 'es'
															? 'Denegado'
															: 'Denied'}
											</Badge>
											{!c.revocado && c.consentimientoOtorgado && (
												<Button
													type="button"
													size="sm"
													variant="destructive"
													onClick={() => handleRevocarConsentimiento(c.id)}
													disabled={actionLoading === `revoke-${c.id}`}
													className="text-xs"
												>
													{actionLoading === `revoke-${c.id}`
														? '...'
														: locale === 'es'
															? 'Revocar'
															: 'Revoke'}
												</Button>
											)}
										</div>
									</div>
								))
							)}
						</CardContent>
					</Card>
				)}
			</div>
		);
	}

	// ── Sección de recetas médicas ────────────────────────────────────────────
	// Las recetas se vinculan a un historial médico existente.
	// El médico selecciona el historial, el medicamento del catálogo y prescribe
	// dosis, frecuencia y duración según la normativa farmacéutica colombiana.
	function RecetasSection() {
		return (
			<div className="space-y-4">
				{/* Selector de historial para ver/crear recetas */}
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">
							{locale === 'es'
								? 'Prescribir receta médica'
								: 'Write prescription'}
						</CardTitle>
						<CardDescription>
							{locale === 'es'
								? 'Seleccione un historial médico y prescriba el medicamento con dosis y frecuencia.'
								: 'Select a medical history entry and prescribe the medication with dose and frequency.'}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{/* Selector de historial */}
						<div className="space-y-1">
							<label
								htmlFor="receta-historial"
								className="text-xs font-medium text-muted-foreground"
							>
								{m.dashboardSidebarHistorial({}, { locale })}
							</label>
							<Select
								value={recetaHistorialId}
								onValueChange={(v) => {
									setRecetaHistorialId(v ?? '');
									if (v) void loadRecetas(v);
								}}
							>
								<SelectTrigger id="receta-historial" className="w-full">
									<SelectValue
										placeholder={
											locale === 'es'
												? 'Seleccionar historial...'
												: 'Select history entry...'
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{historial.map((h) => (
										<SelectItem key={h.id} value={h.id}>
											{h.diagnostico
												? `${h.diagnostico.slice(0, 50)}${h.diagnostico.length > 50 ? '...' : ''}`
												: `#${h.id.slice(0, 8)}`}{' '}
											— {new Date(h.creadoEn).toLocaleDateString(locale)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{recetaHistorialId && (
							<>
								<div className="grid gap-3 sm:grid-cols-2">
									<div className="space-y-1">
										<label
											htmlFor="receta-med"
											className="text-xs font-medium text-muted-foreground"
										>
											{locale === 'es' ? 'Medicamento' : 'Medicine'}
										</label>
										<Select
											value={
												newReceta.medicamentoId
													? String(newReceta.medicamentoId)
													: ''
											}
											onValueChange={(v) =>
												setNewReceta((prev) => ({
													...prev,
													medicamentoId: Number(v),
												}))
											}
										>
											<SelectTrigger id="receta-med" className="w-full">
												<SelectValue
													placeholder={
														locale === 'es' ? 'Seleccionar...' : 'Select...'
													}
												/>
											</SelectTrigger>
											<SelectContent>
												{medicineOptions.map((med) => (
													<SelectItem key={med.id} value={String(med.id)}>
														{med.nombreComercial}
														{med.nombreGenerico
															? ` (${med.nombreGenerico})`
															: ''}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-1">
										<label
											htmlFor="receta-dosis"
											className="text-xs font-medium text-muted-foreground"
										>
											{locale === 'es' ? 'Dosis' : 'Dose'}
										</label>
										<Input
											id="receta-dosis"
											value={newReceta.dosis}
											onChange={(e) =>
												setNewReceta((prev) => ({
													...prev,
													dosis: e.target.value,
												}))
											}
											placeholder="500mg"
										/>
									</div>
								</div>
								<div className="grid gap-3 sm:grid-cols-3">
									<div className="space-y-1">
										<label
											htmlFor="receta-freq"
											className="text-xs font-medium text-muted-foreground"
										>
											{locale === 'es' ? 'Frecuencia' : 'Frequency'}
										</label>
										<Input
											id="receta-freq"
											value={newReceta.frecuencia}
											onChange={(e) =>
												setNewReceta((prev) => ({
													...prev,
													frecuencia: e.target.value,
												}))
											}
											placeholder={
												locale === 'es' ? 'Cada 8 horas' : 'Every 8 hours'
											}
										/>
									</div>
									<div className="space-y-1">
										<label
											htmlFor="receta-days"
											className="text-xs font-medium text-muted-foreground"
										>
											{locale === 'es' ? 'Duración (días)' : 'Duration (days)'}
										</label>
										<Input
											id="receta-days"
											type="number"
											min={1}
											value={newReceta.duracionDias || ''}
											onChange={(e) =>
												setNewReceta((prev) => ({
													...prev,
													duracionDias: Number(e.target.value),
												}))
											}
										/>
									</div>
									<div className="space-y-1">
										<label
											htmlFor="receta-obs"
											className="text-xs font-medium text-muted-foreground"
										>
											{locale === 'es' ? 'Observaciones' : 'Observations'}
										</label>
										<Input
											id="receta-obs"
											value={newReceta.observaciones}
											onChange={(e) =>
												setNewReceta((prev) => ({
													...prev,
													observaciones: e.target.value,
												}))
											}
										/>
									</div>
								</div>
								<Button
									type="button"
									onClick={handleCreateReceta}
									disabled={
										!newReceta.medicamentoId ||
										actionLoading === 'create-receta'
									}
									className="gap-2"
								>
									{actionLoading === 'create-receta'
										? m.dashboardActionSaving({}, { locale })
										: locale === 'es'
											? 'Prescribir receta'
											: 'Write prescription'}
								</Button>
							</>
						)}
					</CardContent>
				</Card>

				{/* Lista de recetas del historial seleccionado */}
				{recetaHistorialId && recetas.length > 0 && (
					<Card className="border-border/70">
						<CardHeader className="pb-2">
							<CardTitle className="text-base">
								{locale === 'es'
									? 'Recetas del historial'
									: 'History prescriptions'}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{recetas.map((r) => {
								const med = medicineOptions.find(
									(m2) => m2.id === r.medicamentoId,
								);
								return (
									<div
										key={r.id}
										className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/90 p-3"
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-semibold text-foreground">
												{med?.nombreComercial ?? `#${r.medicamentoId}`}
											</p>
											<div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
												{r.dosis && (
													<span>
														{locale === 'es' ? 'Dosis' : 'Dose'}: {r.dosis}
													</span>
												)}
												{r.frecuencia && (
													<span>
														{locale === 'es' ? 'Frecuencia' : 'Frequency'}:{' '}
														{r.frecuencia}
													</span>
												)}
												{r.duracionDias && (
													<span>
														{r.duracionDias} {locale === 'es' ? 'días' : 'days'}
													</span>
												)}
											</div>
											{r.observaciones && (
												<p className="mt-1 text-xs text-muted-foreground/80">
													{r.observaciones}
												</p>
											)}
										</div>
										{med?.requiereReceta && (
											<Badge variant="secondary" className="text-[10px]">
												{locale === 'es'
													? 'Requiere receta'
													: 'Prescription required'}
											</Badge>
										)}
									</div>
								);
							})}
						</CardContent>
					</Card>
				)}
			</div>
		);
	}

	// ── Overview: KPIs + vista rápida de citas y disponibilidad ──
	function OverviewSection() {
		return (
			<div className="space-y-4">
				{/* KPI cards — 3 métricas clave en grid responsivo */}
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<KpiCard
						icon={<CalendarDaysIcon className="h-5 w-5" />}
						label={m.dashboardDoctorKpiAppointmentsToday({}, { locale })}
						value={String(kpiToday)}
					/>
					<KpiCard
						icon={<ClockIcon className="h-5 w-5" />}
						label={m.dashboardDoctorKpiPending({}, { locale })}
						value={String(kpiPending)}
					/>
					<KpiCard
						icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
						label={m.dashboardDoctorKpiConsultorio({}, { locale })}
						value={consultorioInput || '—'}
					/>
				</div>

				{/* Vista rápida de próximas citas */}
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">
							{m.dashboardSidebarAppointments({}, { locale })}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{loading ? (
							<Skeleton className="h-20 rounded-lg" />
						) : appointments.slice(0, 4).length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{m.dashboardPatientsEmptyDescription({}, { locale })}
							</p>
						) : (
							appointments
								.slice(0, 4)
								.map((a) => (
									<AppointmentRow key={a.id} appointment={a} compact />
								))
						)}
					</CardContent>
				</Card>

				{/* Vista rápida de disponibilidad */}
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">
							{m.dashboardSidebarDisponibilidad({}, { locale })}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{loading ? (
							<Skeleton className="h-16 rounded-lg" />
						) : disponibilidad.slice(0, 3).length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{m.dashboardDoctorDisponibilidadEmptyDescription(
									{},
									{ locale },
								)}
							</p>
						) : (
							disponibilidad
								.slice(0, 3)
								.map((slot) => <SlotRow key={slot.id} slot={slot} compact />)
						)}
					</CardContent>
				</Card>
			</div>
		);
	}

	// ── Sección de pacientes del hospital ──
	function PatientsSection() {
		const filtered = patientSearch.trim()
			? patients.filter((p) => {
					const q = patientSearch.toLowerCase();
					return (
						p.nombre.toLowerCase().includes(q) ||
						p.apellido.toLowerCase().includes(q) ||
						(p.email?.toLowerCase().includes(q) ?? false) ||
						(p.numeroDocumento?.toLowerCase().includes(q) ?? false)
					);
				})
			: patients;

		return (
			<div className="space-y-3">
				<div className="space-y-1">
					<label
						htmlFor="doctor-patient-search"
						className="text-xs font-medium text-muted-foreground"
					>
						{m.dashboardAdminSearchPlaceholder({}, { locale })}
					</label>
					<Input
						id="doctor-patient-search"
						value={patientSearch}
						onChange={(e) => setPatientSearch(e.target.value)}
						placeholder={m.dashboardAdminSearchPlaceholder({}, { locale })}
					/>
				</div>
				{loading ? (
					[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
				) : filtered.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{m.dashboardPatientsEmptyDescription({}, { locale })}
					</p>
				) : (
					filtered.map((p) => (
						<Card key={p.id} className="border-border/70">
							<CardContent className="p-4">
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="space-y-1">
										<p className="text-sm font-semibold text-foreground">
											{p.nombre} {p.apellido}
										</p>
										{p.email && (
											<p className="text-xs text-muted-foreground">{p.email}</p>
										)}
										{p.numeroDocumento && (
											<p className="text-xs text-muted-foreground">
												{m.dashboardPatientsHeaderDocument({}, { locale })}:{' '}
												{p.numeroDocumento}
											</p>
										)}
									</div>
									<div className="flex flex-wrap gap-2">
										{p.tipoSangre && (
											<Badge variant="outline">
												{m.dashboardPatientsHeaderBlood({}, { locale })}:{' '}
												{p.tipoSangre}
											</Badge>
										)}
										{p.eps && (
											<Badge variant="secondary">
												{m.dashboardPatientsHeaderEps({}, { locale })}: {p.eps}
											</Badge>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					))
				)}
			</div>
		);
	}

	// ── Sección de citas con acciones reales ──
	function AppointmentsSection() {
		return (
			<div className="space-y-3">
				{loading ? (
					[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
				) : appointments.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{m.dashboardPatientsEmptyDescription({}, { locale })}
					</p>
				) : (
					appointments.map((a) => <AppointmentRow key={a.id} appointment={a} />)
				)}
			</div>
		);
	}

	function QueueSection() {
		return (
			<div className="space-y-4">
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">
							{m.dashboardSidebarQueue({}, { locale })}
						</CardTitle>
						<CardDescription>
							{m.dashboardStatusInConsultation({}, { locale })}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{loading ? (
							<Skeleton className="h-20 rounded-lg" />
						) : !currentDoctorTurn ? (
							<p className="text-sm text-muted-foreground">
								{m.dashboardPatientsEmptyDescription({}, { locale })}
							</p>
						) : (
							<TurnRow
								turn={currentDoctorTurn}
								onAttend={() => handleAttendTurn(currentDoctorTurn.id)}
								attending={
									actionLoading === `attend-turn-${currentDoctorTurn.id}`
								}
							/>
						)}
					</CardContent>
				</Card>

				<div className="space-y-2">
					{loading ? (
						[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-20 rounded-xl" />
						))
					) : activeDoctorTurns.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{m.dashboardPatientsEmptyDescription({}, { locale })}
						</p>
					) : (
						activeDoctorTurns.map((turn) => (
							<TurnRow
								key={turn.id}
								turn={turn}
								onAttend={() => handleAttendTurn(turn.id)}
								attending={actionLoading === `attend-turn-${turn.id}`}
							/>
						))
					)}
				</div>
			</div>
		);
	}

	// ── Sección de disponibilidad con CRUD ──
	function DisponibilidadSection() {
		const daySelectId = 'doctor-slot-day';
		const startTimeId = 'doctor-slot-start-time';
		const endTimeId = 'doctor-slot-end-time';
		const durationSelectId = 'doctor-slot-duration';
		const consultorioInputId = 'doctor-consultorio-input';

		return (
			<div className="space-y-4">
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">
							{m.dashboardDoctorKpiConsultorio({}, { locale })}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
							<div className="space-y-1">
								<label
									htmlFor={consultorioInputId}
									className="text-xs font-medium text-muted-foreground"
								>
									{m.authRegisterLabelConsultorio({}, { locale })}
								</label>
								<Input
									id={consultorioInputId}
									value={consultorioInput}
									onChange={(e) => setConsultorioInput(e.target.value)}
									placeholder={m.authRegisterLabelConsultorio({}, { locale })}
								/>
							</div>
							<Button
								type="button"
								onClick={handleSaveConsultorio}
								disabled={actionLoading === 'save-consultorio'}
								className="gap-2"
							>
								{actionLoading === 'save-consultorio'
									? m.dashboardActionSaving({}, { locale })
									: m.dashboardDoctorDisponibilidadSave({}, { locale })}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Formulario para agregar nuevo bloque */}
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">
							{m.dashboardDoctorDisponibilidadAddSlot({}, { locale })}
						</CardTitle>
						<CardDescription>
							{m.dashboardDoctorDisponibilidadSubtitle({}, { locale })}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{/* Grid responsivo para los campos del formulario */}
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1fr)_10rem]">
							<div className="space-y-1">
								<label
									htmlFor={daySelectId}
									className="text-xs font-medium text-muted-foreground"
								>
									{m.dashboardDoctorDisponibilidadDia({}, { locale })}
								</label>
								<Select
									value={String(newSlot.diaSemana)}
									onValueChange={(v) =>
										setNewSlot((prev) => ({
											...prev,
											diaSemana: Number(v),
										}))
									}
								>
									<SelectTrigger id={daySelectId} className="w-full">
										<SelectValue>
											{dayLabel(newSlot.diaSemana, locale)}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{[0, 1, 2, 3, 4, 5, 6].map((d) => (
											<SelectItem key={d} value={String(d)}>
												{dayLabel(d, locale)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<label
									htmlFor={startTimeId}
									className="text-xs font-medium text-muted-foreground"
								>
									{m.dashboardDoctorDisponibilidadHoraInicio({}, { locale })}
								</label>
								<Select
									value={newSlot.horaInicio}
									onValueChange={(horaInicio) => {
										if (!horaInicio) return;
										setNewSlot((prev) => ({
											...prev,
											horaInicio,
											duracionCita: suggestDuration(horaInicio, prev.horaFin),
										}));
									}}
								>
									<SelectTrigger id={startTimeId} className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TIME_OPTIONS.map((time) => (
											<SelectItem key={`start-${time}`} value={time}>
												{time}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<label
									htmlFor={endTimeId}
									className="text-xs font-medium text-muted-foreground"
								>
									{m.dashboardDoctorDisponibilidadHoraFin({}, { locale })}
								</label>
								<Select
									value={newSlot.horaFin}
									onValueChange={(horaFin) => {
										if (!horaFin) return;
										setNewSlot((prev) => ({
											...prev,
											horaFin,
											duracionCita: suggestDuration(prev.horaInicio, horaFin),
										}));
									}}
								>
									<SelectTrigger id={endTimeId} className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TIME_OPTIONS.map((time) => (
											<SelectItem key={`end-${time}`} value={time}>
												{time}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<label
									htmlFor={durationSelectId}
									className="text-xs font-medium text-muted-foreground"
								>
									{m.dashboardDoctorDisponibilidadDuracion({}, { locale })}
								</label>
								{/* Select con presets comunes — elimina errores de entrada manual */}
								<Select
									value={String(newSlot.duracionCita)}
									onValueChange={(v) =>
										setNewSlot((prev) => ({ ...prev, duracionCita: Number(v) }))
									}
								>
									<SelectTrigger id={durationSelectId} className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{DURATION_PRESETS.map((min) => (
											<SelectItem key={min} value={String(min)}>
												{min} min
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<Button
							type="button"
							onClick={handleAddSlot}
							disabled={actionLoading === 'new-slot'}
							className="gap-2"
						>
							<PlusIcon className="h-4 w-4" />
							{actionLoading === 'new-slot'
								? m.dashboardActionSaving({}, { locale })
								: m.dashboardDoctorDisponibilidadSave({}, { locale })}
						</Button>
					</CardContent>
				</Card>

				{/* Lista de bloques existentes */}
				<div className="space-y-2">
					{loading ? (
						[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-16 rounded-xl" />
						))
					) : disponibilidad.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{m.dashboardDoctorDisponibilidadEmptyDescription({}, { locale })}
						</p>
					) : (
						disponibilidad.map((slot) => (
							<SlotRow
								key={slot.id}
								slot={slot}
								onDelete={() => handleDeleteSlot(slot.id)}
								onToggle={() => handleToggleSlot(slot)}
								deleting={actionLoading === `delete-slot-${slot.id}`}
								toggling={actionLoading === `toggle-slot-${slot.id}`}
							/>
						))
					)}
				</div>

				{/* Vista de disponibilidad de enfermeros del hospital */}
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">
							{m.availabilityViewNurseTitle({}, { locale })}
						</CardTitle>
						<CardDescription>
							{m.availabilityViewNurseSubtitle({}, { locale })}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<Input
							type="search"
							placeholder={m.availabilitySearchPlaceholder({}, { locale })}
							value={nurseSearch}
							onChange={(e) => {
								setNurseSearch(e.target.value);
								setSelectedNurseId(null);
							}}
						/>
						{(() => {
							const q = nurseSearch.toLowerCase().trim();
							const filtered = q
								? hospitalNurses.filter(
										(n) =>
											n.nombre.toLowerCase().includes(q) ||
											n.apellido.toLowerCase().includes(q),
									)
								: hospitalNurses;

							if (hospitalNurses.length === 0) {
								return (
									<p className="py-2 text-center text-sm text-muted-foreground">
										{m.availabilitySearchEmpty({}, { locale })}
									</p>
								);
							}

							return (
								<div className="space-y-2">
									<div className="flex flex-wrap gap-1.5">
										{filtered.map((n) => {
											const active = selectedNurseId === n.id;
											return (
												<Button
													key={n.id}
													type="button"
													variant={active ? 'default' : 'outline'}
													size="sm"
													onClick={() =>
														setSelectedNurseId(active ? null : n.id)
													}
												>
													{n.nombre} {n.apellido}
												</Button>
											);
										})}
										{filtered.length === 0 && (
											<p className="py-2 text-sm text-muted-foreground">
												{m.availabilitySearchEmpty({}, { locale })}
											</p>
										)}
									</div>
									{selectedNurseId &&
										(nurseSlotsLoading ? (
											<Skeleton className="h-32 rounded-lg" />
										) : (
											<AvailabilityWeekView
												slots={nurseSlots as AvailabilitySlot[]}
												locale={locale}
												personName={(() => {
													const n = hospitalNurses.find(
														(item) => item.id === selectedNurseId,
													);
													return n ? `${n.nombre} ${n.apellido}` : '';
												})()}
												personRole={m.availabilityNurseLabel({}, { locale })}
											/>
										))}
								</div>
							);
						})()}
					</CardContent>
				</Card>
			</div>
		);
	}

	// ── Sección de historial médico ──
	function HistorialSection() {
		const isEs = locale === 'es';
		const patientOptions = patients.map((patient) => ({
			id: patient.id,
			label: `${patient.nombre ?? ''} ${patient.apellido ?? ''}`.trim() || patient.id,
		}));
		const patientSelectId = 'doctor-historial-patient';
		const diagnosisInputId = 'doctor-historial-diagnosis';
		const treatmentInputId = 'doctor-historial-treatment';
		const observationsInputId = 'doctor-historial-observations';

		// Mapa de record_id → similarity para cruzar resultados de búsqueda con historial local.
		// Se recalcula solo cuando cambian searchResults (useMemo en el padre sería equivalente).
		const searchMap = new Map(searchResults.map((r) => [r.record_id, r.similarity]));
		const isSearchActive = historialSearch.trim().length >= 3;

		// Entradas que se mostrarán: si hay búsqueda activa, filtrar y ordenar por similitud;
		// si no, mostrar todo aplicando el filtro de tipo de campo seleccionado.
		let visibleEntries = historial;
		if (isSearchActive && searchResults.length > 0) {
			visibleEntries = historial
				.filter((e) => searchMap.has(e.id))
				.sort((a, b) => (searchMap.get(b.id) ?? 0) - (searchMap.get(a.id) ?? 0));
		}
		// Filtro local por tipo de campo (solo si no hay búsqueda activa)
		if (!isSearchActive && historialFilter !== 'all') {
			visibleEntries = visibleEntries.filter((e) => !!e[historialFilter]);
		}

		// Configuración de los pills de filtro
		const FILTERS: { key: typeof historialFilter; labelEs: string; labelEn: string }[] = [
			{ key: 'all', labelEs: 'Todos', labelEn: 'All' },
			{ key: 'diagnostico', labelEs: 'Diagnóstico', labelEn: 'Diagnosis' },
			{ key: 'tratamiento', labelEs: 'Tratamiento', labelEn: 'Treatment' },
			{ key: 'observaciones', labelEs: 'Observaciones', labelEn: 'Observations' },
		];

		return (
			<div className="space-y-5">
				{/* ── Formulario para crear nueva entrada de historial ── */}
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">
							{m.dashboardDoctorHistorialNew({}, { locale })}
						</CardTitle>
						<CardDescription>
							{m.dashboardDoctorHistorialSubtitle({}, { locale })}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1">
							<label
								htmlFor={patientSelectId}
								className="text-xs font-medium text-muted-foreground"
							>
								{m.dashboardDoctorSelectPatientPlaceholder({}, { locale })}
							</label>
							<Select
								value={newHistorial.pacienteId}
								onValueChange={(v) =>
									setNewHistorial((prev) => ({ ...prev, pacienteId: v ?? '' }))
								}
							>
								<SelectTrigger id={patientSelectId}>
									<SelectValue
										placeholder={m.dashboardDoctorSelectPatientPlaceholder(
											{},
											{ locale },
										)}
									/>
								</SelectTrigger>
								<SelectContent>
									{patientOptions.map((patient) => (
										<SelectItem
											key={patient.id}
											value={patient.id}
											label={patient.label}
											title={patient.label}
										>
											{patient.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<label
								htmlFor={diagnosisInputId}
								className="text-xs font-medium text-muted-foreground"
							>
								{m.dashboardDoctorHistorialDiagnostico({}, { locale })}
							</label>
							<Input
								id={diagnosisInputId}
								value={newHistorial.diagnostico}
								onChange={(e) =>
									setNewHistorial((prev) => ({
										...prev,
										diagnostico: e.target.value,
									}))
								}
								placeholder={m.dashboardDoctorHistorialDiagnostico({}, { locale })}
							/>
						</div>
						<div className="space-y-1">
							<label
								htmlFor={treatmentInputId}
								className="text-xs font-medium text-muted-foreground"
							>
								{m.dashboardDoctorHistorialTratamiento({}, { locale })}
							</label>
							<Input
								id={treatmentInputId}
								value={newHistorial.tratamiento}
								onChange={(e) =>
									setNewHistorial((prev) => ({
										...prev,
										tratamiento: e.target.value,
									}))
								}
								placeholder={m.dashboardDoctorHistorialTratamiento({}, { locale })}
							/>
						</div>
						<div className="space-y-1">
							<label
								htmlFor={observationsInputId}
								className="text-xs font-medium text-muted-foreground"
							>
								{m.dashboardDoctorHistorialObservaciones({}, { locale })}
							</label>
							<Input
								id={observationsInputId}
								value={newHistorial.observaciones}
								onChange={(e) =>
									setNewHistorial((prev) => ({
										...prev,
										observaciones: e.target.value,
									}))
								}
								placeholder={m.dashboardDoctorHistorialObservaciones({}, { locale })}
							/>
						</div>
						<Button
							type="button"
							onClick={handleCreateHistorial}
							disabled={
								actionLoading === 'new-historial' ||
								!newHistorial.diagnostico ||
								!newHistorial.pacienteId
							}
							className="gap-2"
						>
							<PlusIcon className="h-4 w-4" />
							{actionLoading === 'new-historial'
								? m.dashboardActionSaving({}, { locale })
								: m.dashboardDoctorHistorialSave({}, { locale })}
						</Button>
					</CardContent>
				</Card>

				{/* ── Búsqueda semántica ── */}
				{/* El input llama al servicio asclepio-search con debounce 400ms definido en el useEffect del padre.
				    La búsqueda vectorial encuentra registros por similitud semántica, no solo por texto exacto. */}
				<div className="space-y-3">
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
						<Input
							value={historialSearch}
							onChange={(e) => setHistorialSearch(e.target.value)}
							placeholder={
								isEs
									? 'Buscar en historias clínicas...'
									: 'Search clinical records...'
							}
							className="pl-9"
						/>
						{/* Indicador de estado de búsqueda */}
						{searchLoading && (
							<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
								{isEs ? 'Buscando...' : 'Searching...'}
							</span>
						)}
					</div>

					{/* Pills de filtro por tipo de campo — solo visibles cuando no hay búsqueda activa */}
					{!isSearchActive && (
						<div className="flex flex-wrap items-center gap-2">
							{/* Label que contextualiza al médico qué parte del historial está filtrando */}
							<span className="text-xs font-medium text-muted-foreground">
								{isEs ? 'Ver:' : 'Show:'}
							</span>
							{FILTERS.map(({ key, labelEs, labelEn }) => (
								<button
									key={key}
									type="button"
									onClick={() => setHistorialFilter(key)}
									className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
										historialFilter === key
											? 'bg-primary text-primary-foreground border-primary'
											: 'border-border/70 text-muted-foreground hover:border-primary/50 hover:text-foreground'
									}`}
								>
									{isEs ? labelEs : labelEn}
								</button>
							))}
						</div>
					)}

					{/* Texto contextual: indica al médico exactamente qué está viendo */}
					<p className="text-xs text-muted-foreground">
						{isSearchActive
							? searchLoading
								? isEs
									? 'Buscando registros similares...'
									: 'Searching similar records...'
								: isEs
									? `${visibleEntries.length} resultado(s) para "${historialSearch}"`
									: `${visibleEntries.length} result(s) for "${historialSearch}"`
							: historialFilter === 'all'
								? isEs
									? `${visibleEntries.length} registro(s) — historial completo`
									: `${visibleEntries.length} record(s) — full history`
								: isEs
									? `Mostrando solo: ${FILTERS.find((f) => f.key === historialFilter)?.[isEs ? 'labelEs' : 'labelEn'] ?? ''}`
									: `Showing only: ${FILTERS.find((f) => f.key === historialFilter)?.labelEn ?? ''}`}
					</p>
				</div>

				{/* ── Lista de historial ── */}
				<div className="space-y-3">
					{loading ? (
						[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-28 rounded-xl" />
						))
					) : visibleEntries.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{isSearchActive
								? isEs
									? 'Sin coincidencias. Intenta otra búsqueda.'
									: 'No matches. Try a different search.'
								: m.dashboardPatientHistorialEmpty({}, { locale })}
						</p>
					) : (
						visibleEntries.map((entry, index) => {
							// Lookup del nombre del paciente para mostrarlo en la tarjeta
							const patient = patients.find((p) => p.id === entry.pacienteId);
							const patientName = patient
								? `${patient.nombre} ${patient.apellido}`.trim()
								: entry.pacienteId;
							return (
								<ClinicalRecordCard
									key={entry.id}
									entry={entry}
									patientName={patientName}
									locale={locale}
									similarityScore={
										isSearchActive ? searchMap.get(entry.id) : undefined
									}
									// Escalonar la animación de entrada para efecto cascada visual
									delay={index * 0.05}
								/>
							);
						})
					)}
				</div>
			</div>
		);
	}

	// ─── Sub-componentes de fila ──────────────────────────────────────────────

	function AppointmentRow({
		appointment: a,
		compact = false,
	}: {
		appointment: Appointment;
		compact?: boolean;
	}) {
		const isPending = a.estado === 'PENDIENTE';
		const appointmentPatient = patients.find((p) => p.id === a.pacienteId);
		const appointmentPatientName = appointmentPatient
			? `${appointmentPatient.nombre} ${appointmentPatient.apellido}`.trim()
			: a.pacienteId;
		return (
			<div className="rounded-xl border border-border/70 bg-background/90 p-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="min-w-0">
						<p className="truncate text-sm font-medium text-foreground">
							{new Date(a.fechaHora).toLocaleString(locale)}
						</p>
						<p className="truncate text-xs text-muted-foreground">
							{a.motivo || a.id}
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<Badge variant={statusVariant(a.estado)}>
							{statusLabel(a.estado, locale)}
						</Badge>
						{/* Solo mostrar acciones en la vista completa (no compact) y si está pendiente */}
						{!compact && isPending && (
							<>
								<Button
									type="button"
									size="sm"
									variant="outline"
									aria-label={m.a11yDoctorConfirmAppointmentBtn(
										{ patient: appointmentPatientName },
										{ locale },
									)}
									onClick={() => handleConfirm(a)}
									disabled={actionLoading === a.id}
									className="gap-1 text-xs"
								>
									<CheckCircleIcon className="h-3.5 w-3.5" />
									{actionLoading === a.id
										? m.dashboardActionConfirming({}, { locale })
										: m.dashboardDoctorConfirmAppointment({}, { locale })}
								</Button>
								<Button
									type="button"
									size="sm"
									variant="destructive"
									aria-label={m.a11yDoctorCancelAppointmentBtn(
										{ patient: appointmentPatientName },
										{ locale },
									)}
									onClick={() => handleCancel(a.id)}
									disabled={actionLoading === `${a.id}-cancel`}
									className="gap-1 text-xs"
								>
									<XCircleIcon className="h-3.5 w-3.5" />
									{actionLoading === `${a.id}-cancel`
										? m.dashboardActionCancelling({}, { locale })
										: m.dashboardDoctorCancelAppointment({}, { locale })}
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		);
	}

	function SlotRow({
		slot,
		compact = false,
		onDelete,
		onToggle,
		deleting = false,
		toggling = false,
	}: {
		slot: Disponibilidad;
		compact?: boolean;
		onDelete?: () => void;
		onToggle?: () => void;
		deleting?: boolean;
		toggling?: boolean;
	}) {
		return (
			<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/90 p-3">
				<div className="flex items-center gap-3">
					<ClockIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
					<div>
						<p className="text-sm font-medium text-foreground">
							{dayLabel(slot.diaSemana, locale)} — {formatTime(slot.horaInicio)}{' '}
							- {formatTime(slot.horaFin)}
						</p>
						<p className="text-xs text-muted-foreground">
							{m.dashboardDoctorSlotDurationLabel(
								{ minutes: String(slot.duracionCita) },
								{ locale },
							)}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={slot.activo ? 'default' : 'outline'}>
						{slot.activo
							? m.dashboardHospitalStatusActive({}, { locale })
							: m.dashboardHospitalStatusInactive({}, { locale })}
					</Badge>
					{!compact && (
						<>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={onToggle}
								disabled={toggling}
								className="text-xs"
							>
								{toggling
									? '...'
									: m.dashboardDoctorDisponibilidadToggleActive({}, { locale })}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="destructive"
								onClick={onDelete}
								disabled={deleting}
								className="gap-1 text-xs"
							>
								<TrashIcon className="h-3.5 w-3.5" />
								{deleting
									? '...'
									: m.dashboardDoctorDisponibilidadDelete({}, { locale })}
							</Button>
						</>
					)}
				</div>
			</div>
		);
	}

	function TurnRow({
		turn,
		onAttend,
		attending = false,
	}: {
		turn: Turno;
		onAttend?: () => void;
		attending?: boolean;
	}) {
		const canAttend = !isTurnClosed(turn.estado);
		return (
			<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/90 p-3">
				<div>
					<p className="flex items-center gap-1 text-sm font-semibold text-foreground">
						<QueueListIcon className="h-4 w-4 text-muted-foreground" />#
						{turn.numeroTurno}
					</p>
					<p className="text-xs text-muted-foreground">{turn.tipo}</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={turnVariant(turn.estado)}>
						{turnLabel(turn.estado, locale)}
					</Badge>
					{canAttend && (
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={onAttend}
							disabled={attending}
							className="gap-1 text-xs"
						>
							<CheckCircleIcon className="h-3.5 w-3.5" />
							{attending
								? '...'
								: m.dashboardReceptionistAttendTurn({}, { locale })}
						</Button>
					)}
				</div>
			</div>
		);
	}

	// ─── Shell principal ──────────────────────────────────────────────────────

	const sectionTitles: Partial<Record<DashboardSection, string>> = {
		overview: m.dashboardDoctorOverviewTitle({}, { locale }),
		patients: m.dashboardSidebarPatients({}, { locale }),
		appointments: m.dashboardSidebarAppointments({}, { locale }),
		queue: m.dashboardSidebarQueue({}, { locale }),
		disponibilidad: m.dashboardDoctorDisponibilidadTitle({}, { locale }),
		historial: m.dashboardDoctorHistorialTitle({}, { locale }),
		anatomy3d: m.dashboardSidebarAnatomy3d({}, { locale }),
	};

	return (
		<RoleDashboardShell
			title={sectionTitles[section] ?? m.authRoleDoctor({}, { locale })}
			subtitle={m.dashboardDoctorOverviewSubtitle({}, { locale })}
			headerAction={
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={loadData}
					disabled={loading}
				>
					<ArrowPathIcon className="mr-2 h-4 w-4" />
					{m.dashboardPatientsRefresh({}, { locale })}
				</Button>
			}
		>
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			{successMsg && (
				<Alert>
					<AlertDescription>{successMsg}</AlertDescription>
				</Alert>
			)}
			{missingProfile ? (
				<p className="text-sm text-muted-foreground">
					{m.dashboardDoctorMissingProfile({}, { locale })}
				</p>
			) : (
				renderSection(section as DashboardSection)
			)}
		</RoleDashboardShell>
	);
}

// ─── KPI card reutilizable ────────────────────────────────────────────────────

function KpiCard({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-xl border border-border/70 bg-background/80 p-3">
			<div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
				{icon}
				<span>{label}</span>
			</div>
			<p className="text-2xl font-semibold tabular-nums text-foreground">
				{value}
			</p>
		</div>
	);
}

// Daniel Useche
