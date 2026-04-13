import {
	ArrowPathIcon,
	ClockIcon,
	PlusIcon,
	XCircleIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { WaitingRoomGame } from '@/components/game/waiting-room-game';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import { Calendar } from '@/components/ui/calendar/calendar.component';
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
import { Textarea } from '@/components/ui/textarea/textarea.component';
import type { AppLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import {
	gqlMutation,
	gqlQuery,
	gqlQueryWithFallback,
} from '@/lib/graphql-client';
import type { RoleViewProps } from './dashboard-role.types';
import { PatientAiSection } from './patient-ai.section';
import { RoleDashboardShell } from './role-dashboard-shell';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PatientProfile {
	id: string;
	usuarioId: string;
	tipoSangre: string | null;
	eps: string | null;
}

interface Appointment {
	id: string;
	fechaHora: string;
	estado: string;
	motivo: string | null;
	medicoId?: string | null;
}

interface Turno {
	id: string;
	numeroTurno: number;
	estado: string;
	tipo: string;
}

interface HistorialEntry {
	id: string;
	diagnostico: string;
	tratamiento: string;
	observaciones: string | null;
	creadoEn: string;
}

interface Doctor {
	id: string;
	nombre: string;
	apellido: string;
	especialidadId: number;
	consultorio: string | null;
}

interface DoctorAvailability {
	id: number;
	diaSemana: number;
	activo: boolean;
}

interface SlotDisponible {
	fechaHora: string;
	duracionMinutos: number;
}

interface MedicineItem {
	id: number;
	nombreComercial: string;
	nombreGenerico?: string;
	presentacion?: string;
	requiereReceta: boolean;
}

interface InventarioItem {
	id: number;
	medicamentoId: number;
	sedeId: number;
	stockActual: number;
	disponibilidad: string;
	precio?: string;
}

interface SedeItem {
	id: number;
	nombre: string;
	direccion?: string;
	ciudad?: string;
}

interface ConsentimientoPatient {
	id: number;
	pacienteId: string;
	tipoConsentimiento: string;
	consentimientoOtorgado: boolean;
	fechaConsentimiento: string;
	revocado: boolean;
	fechaRevocacion: string | null;
}

interface RecetaPatient {
	id: number;
	historialId: string;
	medicamentoId: number;
	dosis: string | null;
	frecuencia: string | null;
	duracionDias: number | null;
	observaciones: string | null;
}

// ─── Queries & Mutations ──────────────────────────────────────────────────────

// myPatientProfile usa @CurrentUser() en el backend: el paciente solo accede a
// SU propio perfil sin necesitar permisos sobre el listado completo de pacientes
// (que es PHI restringido a personal clínico/administrativo).
const MY_PATIENT_PROFILE_QUERY = `
	query MyPatientProfile {
		myPatientProfile {
			id
			usuarioId
			tipoSangre
			eps
		}
	}
`;

const PATIENT_APPOINTMENTS_QUERY = `
	query PatientAppointments($pacienteId: ID!) {
		appoinmentsByPatient(pacienteId: $pacienteId) {
			id
			medicoId
			fechaHora
			estado
			motivo
		}
	}
`;

const PATIENT_APPOINTMENTS_QUERY_V2 = `
	query PatientAppointmentsV2($pacienteId: ID!) {
		appointmentsByPatient(pacienteId: $pacienteId) {
			id
			medicoId
			fechaHora
			estado
			motivo
		}
	}
`;

const PATIENT_TURNS_QUERY = `
	query PatientTurns($pacienteId: ID!) {
		turnosPorPaciente(pacienteId: $pacienteId) {
			id
			numeroTurno
			estado
			tipo
		}
	}
`;

const HOSPITAL_TURNS_QUERY = `
	query PatientHospitalTurns {
		turnosPorHospital {
			id
			numeroTurno
			estado
			tipo
		}
	}
`;

const CALLED_TURN_STATES = ['EN_CONSULTA'] as const;
const CALLED_HISTORY_TURN_STATES = [...CALLED_TURN_STATES, 'ATENDIDO'] as const;
const CLOSED_TURN_STATES = ['ATENDIDO', 'CANCELADO'] as const;

const PATIENT_HISTORIAL_QUERY = `
	query PatientHistorial($pacienteId: ID!) {
		historialByPaciente(pacienteId: $pacienteId) {
			id
			diagnostico
			tratamiento
			observaciones
			creadoEn
		}
	}
`;

// Traer médicos con disponibilidad para el selector de agendar cita
const DOCTORS_QUERY = `
	query DoctorsForBooking($hospitalId: Int!) {
		doctors(hospitalId: $hospitalId) {
			id
			nombre
			apellido
			especialidadId
			consultorio
		}
	}
`;

// Traer slots disponibles de un médico en una fecha
// El backend devuelve fechaHora (Date) y duracionMinutos (Int)
const AVAILABLE_SLOTS_QUERY = `
	query AvailableSlots($medicoId: ID!, $fecha: DateTime!) {
		availableSlots(medicoId: $medicoId, fecha: $fecha) {
			fechaHora
			duracionMinutos
		}
	}
`;

const DOCTOR_AVAILABILITY_QUERY = `
	query DoctorAvailabilityForBooking($medicoId: ID!) {
		disponibilidadesByDoctor(medicoId: $medicoId) {
			id
			diaSemana
			activo
		}
	}
`;

// Agendar una cita en un slot específico
const CREATE_APPOINTMENT = `
	mutation CreateAppointment($input: CreateAppoinmentInput!) {
		createAppoinment(input: $input) {
			id
			medicoId
			fechaHora
			estado
			motivo
		}
	}
`;

// Crear turno en la cola del hospital — requiere hospitalId (obligatorio en el backend)
const CREATE_PATIENT_TURN = `
	mutation CreatePatientTurn($input: CreateTurnInput!) {
		crearTurno(input: $input) {
			id
			numeroTurno
			tipo
			estado
		}
	}
`;

const CANCEL_TURN = `
	mutation CancelPatientTurn($id: ID!) {
		cancelarTurno(id: $id) {
			id
			estado
		}
	}
`;

// Medicamentos: catálogo, inventario por medicamento y sedes
const MEDICINES_QUERY = `
	query PatientMedicines($busqueda: String) {
		medicines(busqueda: $busqueda) {
			id
			nombreComercial
			nombreGenerico
			presentacion
			requiereReceta
		}
	}
`;

const INVENTARIO_BY_MEDICAMENTO_QUERY = `
	query InventarioByMedicamento($medicamentoId: Int!) {
		inventarioByMedicamento(medicamentoId: $medicamentoId) {
			id
			medicamentoId
			sedeId
			stockActual
			disponibilidad
			precio
		}
	}
`;

const SEDES_QUERY = `
	query Sedes {
		sedes {
			id
			nombre
			direccion
			ciudad
		}
	}
`;

// ── Consentimientos informados del paciente (solo lectura) ──
// Ley 23/1981 Art. 15 Colombia: el paciente tiene derecho a conocer los
// consentimientos que ha otorgado y su estado (vigente/revocado).
const MY_CONSENTIMIENTOS_QUERY = `
	query MisConsentimientos($pacienteId: ID!) {
		consentimientosByPaciente(pacienteId: $pacienteId) {
			id pacienteId tipoConsentimiento consentimientoOtorgado
			fechaConsentimiento revocado fechaRevocacion
		}
	}
`;

// Mutation para que el paciente otorgue o deniegue un consentimiento.
// revocarConsentimiento marca el consentimiento como revocado (denegado).
const REVOCAR_CONSENTIMIENTO = `
	mutation RevocarConsentimientoPaciente($id: Int!) {
		revocarConsentimiento(id: $id) {
			id revocado fechaRevocacion
		}
	}
`;

// ── Recetas del paciente (a través de su historial) ──
const RECETAS_BY_HISTORIAL_QUERY = `
	query RecetasPaciente($historialId: ID!) {
		recetasByHistorial(historialId: $historialId) {
			id historialId medicamentoId dosis frecuencia duracionDias observaciones
		}
	}
`;

const MEDICINES_CATALOG_QUERY = `
	query MedicinesCatalog {
		medicines { id nombreComercial nombreGenerico presentacion requiereReceta }
	}
`;

// Cancelar cita del paciente
const CANCEL_APPOINTMENT = `
	mutation CancelPatientAppointment($input: CancelAppoinmentInput!) {
		cancelAppoinment(input: $input) { id estado }
	}
`;

// Mutation para que el usuario actualice su propio perfil (nombre, apellido, teléfono).
// Usa el mutation updateMyProfile que valida el JWT para editar solo el registro propio.
const UPDATE_MY_PROFILE = `
	mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
		updateMyProfile(input: $input) {
			id
			nombre
			apellido
			telefono
		}
	}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
		case 'EN_ESPERA':
			return m.dashboardStatusWaiting({}, { locale });
		case 'EN_CONSULTA':
			return m.dashboardStatusInConsultation({}, { locale });
		default:
			return estado;
	}
}

function isActiveTurnConflictError(raw: string) {
	return /(turno\s+activo|active\s+turn)/i.test(raw);
}

function isTurnNumberConflictError(raw: string) {
	return /(idx_turnos_unique|p2002|numero_turno|unique|duplicate|valor\s+u?nico|valor\s+\u00fanico)/i.test(
		raw,
	);
}

function isWaitingTurn(estado: string) {
	return /^EN_ESPERA$/i.test(estado);
}

function isActiveAppointment(estado: string) {
	return /^(PENDIENTE|CONFIRMADA)$/i.test(estado);
}

function activeTurnConflictMessage(locale: AppLocale, turnNumber?: number) {
	if (locale === 'es') {
		return turnNumber
			? `Ya tienes un turno activo (#${turnNumber}). Debes esperar a ser atendido o cancelarlo antes de pedir otro.`
			: 'Ya tienes un turno activo. Debes esperar a ser atendido o cancelarlo antes de pedir otro.';
	}

	return turnNumber
		? `You already have an active turn (#${turnNumber}). Wait to be attended or cancel it before requesting another one.`
		: 'You already have an active turn. Wait to be attended or cancel it before requesting another one.';
}

function uniqueTurnConflictRetryMessage(locale: AppLocale) {
	if (locale === 'es') {
		return 'No se pudo crear el turno por un conflicto temporal de numeracion. Intenta nuevamente en unos segundos.';
	}
	return 'The turn could not be created due to a temporary numbering conflict. Please try again in a few seconds.';
}

// Mapa de especialidades — sincronizado con el backend (tabla especialidades)
const SPECIALTY_MAP: Record<number, { es: string; en: string }> = {
	1: { es: 'Medicina General', en: 'General Medicine' },
	2: { es: 'Cardiología', en: 'Cardiology' },
	3: { es: 'Pediatría', en: 'Pediatrics' },
	4: { es: 'Dermatología', en: 'Dermatology' },
	5: { es: 'Ginecología', en: 'Gynecology' },
	6: { es: 'Neurología', en: 'Neurology' },
	7: { es: 'Ortopedia', en: 'Orthopedics' },
};

function specialtyLabel(id: number, locale: AppLocale): string {
	const entry = SPECIALTY_MAP[id];
	if (!entry) return `#${id}`;
	return locale === 'es' ? entry.es : entry.en;
}

function doctorDisplayName(doctor: Doctor, locale: AppLocale) {
	const fullName = `${doctor.nombre ?? ''} ${doctor.apellido ?? ''}`.trim();
	return fullName || m.dashboardPatientDoctorUnnamed({}, { locale });
}

function doctorDisplayLabel(doctor: Doctor, locale: AppLocale) {
	const name = doctorDisplayName(doctor, locale);
	const spec = specialtyLabel(doctor.especialidadId, locale);
	const parts = [name, spec];
	if (doctor.consultorio) parts.push(doctor.consultorio);
	return parts.join(' — ');
}

function toLocalDateValue(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function fromLocalDateValue(value: string) {
	if (!value) return null;
	const [year, month, day] = value.split('-').map(Number);
	if (!year || !month || !day) return null;
	return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function startOfToday() {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return today;
}

function slotRangeLabel(slot: SlotDisponible, locale: AppLocale) {
	const inicio = new Date(slot.fechaHora);
	const fin = new Date(inicio.getTime() + slot.duracionMinutos * 60_000);
	const timeOpts: Intl.DateTimeFormatOptions = {
		hour: '2-digit',
		minute: '2-digit',
	};
	return `${inicio.toLocaleTimeString(locale, timeOpts)} — ${fin.toLocaleTimeString(locale, timeOpts)}`;
}

function slotHourLabelFromIso(iso: string, locale: AppLocale) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleTimeString(locale, {
		hour: '2-digit',
		minute: '2-digit',
	});
}

function finalSlotDateTimeLabel(iso: string, locale: AppLocale) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	const datePart = date.toLocaleDateString(locale, {
		weekday: 'long',
		day: '2-digit',
		month: 'long',
	});
	const timePart = date.toLocaleTimeString(locale, {
		hour: '2-digit',
		minute: '2-digit',
	});
	return `${datePart} ${timePart}`;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PatientDashboardView({
	user,
	locale,
	section,
	selectedHospitalId,
}: RoleViewProps) {
	const [patientId, setPatientId] = useState<string | null>(null);
	const [missingProfile, setMissingProfile] = useState(false);
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [turns, setTurns] = useState<Turno[]>([]);
	const [hospitalTurns, setHospitalTurns] = useState<Turno[]>([]);
	const [historial, setHistorial] = useState<HistorialEntry[]>([]);
	const [doctors, setDoctors] = useState<Doctor[]>([]);
	const [doctorAvailabilityDays, setDoctorAvailabilityDays] = useState<
		number[]
	>([]);
	const [slots, setSlots] = useState<SlotDisponible[]>([]);
	const [loading, setLoading] = useState(true);
	const [doctorAvailabilityLoading, setDoctorAvailabilityLoading] =
		useState(false);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [slotsLoadError, setSlotsLoadError] = useState('');
	const [availabilityLoadError, setAvailabilityLoadError] = useState('');
	const [error, setError] = useState('');
	const [successMsg, setSuccessMsg] = useState('');
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [isWaitingRoomOpen, setIsWaitingRoomOpen] = useState(false);
	const [specialtyFilter, setSpecialtyFilter] = useState<string>('');
	const [medicineSearch, setMedicineSearch] = useState('');
	const [medicinesList, setMedicinesList] = useState<MedicineItem[]>([]);
	const [sedes, setSedes] = useState<SedeItem[]>([]);
	const [selectedMedicineInventory, setSelectedMedicineInventory] = useState<
		InventarioItem[]
	>([]);
	const [selectedMedicineId, setSelectedMedicineId] = useState<number | null>(
		null,
	);
	const [medicinesLoading, setMedicinesLoading] = useState(false);

	// ── Estado de consentimientos y recetas del paciente ──
	const [myConsentimientos, setMyConsentimientos] = useState<
		ConsentimientoPatient[]
	>([]);
	const [myRecetas, setMyRecetas] = useState<RecetaPatient[]>([]);
	const [medicineCatalog, setMedicineCatalog] = useState<MedicineItem[]>([]);

	// Estado del formulario de perfil personal
	const [profileForm, setProfileForm] = useState({
		nombre: user.nombre,
		apellido: user.apellido,
		telefono: '',
	});
	const [profileLoading, setProfileLoading] = useState(false);

	// Formulario de agendar cita
	const [booking, setBooking] = useState({
		medicoId: '',
		fecha: '',
		slot: '',
		motivo: '',
	});

	const loadProfile = useCallback(async () => {
		// myPatientProfile devuelve null si el usuario autenticado no tiene perfil
		// de paciente creado aún, sin requerir acceso al listado completo (PHI).
		const res = await gqlQuery<{ myPatientProfile: PatientProfile | null }>(
			MY_PATIENT_PROFILE_QUERY,
		);
		const mine = res.myPatientProfile;
		if (!mine) {
			setMissingProfile(true);
			return null;
		}
		setPatientId(mine.id);
		return mine;
	}, []);

	const loadData = useCallback(async () => {
		setLoading(true);
		setError('');
		setMissingProfile(false);
		try {
			const profile = await loadProfile();
			if (!profile) return;

			// Carga paralela por sección para evitar waterfalls
			await Promise.all([
				section === 'overview' ||
				section === 'appointments' ||
				section === 'queue' ||
				!section
					? gqlQueryWithFallback<{
							appoinmentsByPatient?: Appointment[];
							appointmentsByPatient?: Appointment[];
						}>([PATIENT_APPOINTMENTS_QUERY, PATIENT_APPOINTMENTS_QUERY_V2], {
							pacienteId: profile.id,
						}).then((r) =>
							setAppointments(
								r.appoinmentsByPatient ?? r.appointmentsByPatient ?? [],
							),
						)
					: Promise.resolve(),
				section === 'overview' || section === 'queue' || !section
					? gqlQuery<{ turnosPorPaciente: Turno[] }>(PATIENT_TURNS_QUERY, {
							pacienteId: profile.id,
						}).then((r) => setTurns(r.turnosPorPaciente))
					: Promise.resolve(),
				section === 'overview' || section === 'queue' || !section
					? gqlQuery<{ turnosPorHospital: Turno[] }>(HOSPITAL_TURNS_QUERY).then(
							(r) => setHospitalTurns(r.turnosPorHospital),
						)
					: Promise.resolve(),
				section === 'historial'
					? gqlQuery<{ historialByPaciente: HistorialEntry[] }>(
							PATIENT_HISTORIAL_QUERY,
							{ pacienteId: profile.id },
						).then((r) => setHistorial(r.historialByPaciente))
					: Promise.resolve(),
				// Cargar médicos también en cola para mostrar médico de referencia
				section === 'overview' ||
				section === 'appointments' ||
				section === 'queue' ||
				!section
					? selectedHospitalId
						? gqlQuery<{ doctors: Doctor[] }>(DOCTORS_QUERY, {
								hospitalId: selectedHospitalId,
							}).then((r) => setDoctors(r.doctors))
						: Promise.resolve(setDoctors([]))
					: Promise.resolve(),
			]);
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: m.rootErrorUnexpected({}, { locale });
			setError(msg);
		} finally {
			setLoading(false);
		}
	}, [loadProfile, locale, section, selectedHospitalId]);

	const refreshQueueTurns = useCallback(async () => {
		if (!patientId) return;
		try {
			const [patientTurns, hospitalTurnsData] = await Promise.all([
				gqlQuery<{ turnosPorPaciente: Turno[] }>(PATIENT_TURNS_QUERY, {
					pacienteId: patientId,
				}),
				gqlQuery<{ turnosPorHospital: Turno[] }>(HOSPITAL_TURNS_QUERY),
			]);
			setTurns(patientTurns.turnosPorPaciente);
			setHospitalTurns(hospitalTurnsData.turnosPorHospital);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.rootErrorUnexpected({}, { locale }),
			);
		}
	}, [locale, patientId]);

	const refreshAppointments = useCallback(async () => {
		if (!patientId) return;
		try {
			const patientAppointments = await gqlQueryWithFallback<{
				appoinmentsByPatient?: Appointment[];
				appointmentsByPatient?: Appointment[];
			}>([PATIENT_APPOINTMENTS_QUERY, PATIENT_APPOINTMENTS_QUERY_V2], {
				pacienteId: patientId,
			});
			setAppointments(
				patientAppointments.appoinmentsByPatient ??
					patientAppointments.appointmentsByPatient ??
					[],
			);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.rootErrorUnexpected({}, { locale }),
			);
		}
	}, [locale, patientId]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	useEffect(() => {
		if (!(section === 'queue' || section === 'overview' || !section)) return;
		if (!patientId) return;

		let disposed = false;
		const runRefresh = async () => {
			if (disposed) return;
			if (
				typeof document !== 'undefined' &&
				document.visibilityState === 'hidden'
			) {
				return;
			}
			await refreshQueueTurns();
		};

		void runRefresh();
		const interval = window.setInterval(() => {
			void runRefresh();
		}, 4000);

		return () => {
			disposed = true;
			window.clearInterval(interval);
		};
	}, [patientId, refreshQueueTurns, section]);

	useEffect(() => {
		if (
			!(
				section === 'appointments' ||
				section === 'overview' ||
				section === 'queue' ||
				!section
			)
		)
			return;
		if (!patientId) return;

		let disposed = false;
		const runRefresh = async () => {
			if (disposed) return;
			if (
				typeof document !== 'undefined' &&
				document.visibilityState === 'hidden'
			) {
				return;
			}
			await refreshAppointments();
		};

		void runRefresh();
		const interval = window.setInterval(() => {
			void runRefresh();
		}, 10_000);

		return () => {
			disposed = true;
			window.clearInterval(interval);
		};
	}, [patientId, refreshAppointments, section]);

	// Cerrar sala de espera al cambiar de sección
	useEffect(() => {
		if (section !== 'queue') setIsWaitingRoomOpen(false);
	}, [section]);

	// Cargador de consentimientos — se usa como efecto dentro de la sección.
	// Componente inline que dispara la carga al montarse (patrón "loader component").
	function ConsentimientosLoader({
		patientId: pid,
	}: {
		patientId: string | null;
	}) {
		useEffect(() => {
			if (!pid) return;
			gqlQuery<{ consentimientosByPaciente: ConsentimientoPatient[] }>(
				MY_CONSENTIMIENTOS_QUERY,
				{ pacienteId: pid },
			)
				.then((res) => setMyConsentimientos(res.consentimientosByPaciente))
				.catch(() => {});
		}, [pid]);
		return null;
	}

	// Cargador de recetas — recorre todos los historiales del paciente
	function RecetasLoader({ patientId: pid }: { patientId: string | null }) {
		useEffect(() => {
			if (!pid || historial.length === 0) return;
			// Cargar catálogo de medicamentos para mostrar nombres
			const loadCatalog =
				medicineCatalog.length === 0
					? gqlQuery<{ medicines: MedicineItem[] }>(
							MEDICINES_CATALOG_QUERY,
						).then((res) => {
							setMedicineCatalog(res.medicines);
							return res.medicines;
						})
					: Promise.resolve(medicineCatalog);

			// Cargar recetas de todos los historiales del paciente
			void loadCatalog.then(() => {
				Promise.all(
					historial.map((h) =>
						gqlQuery<{ recetasByHistorial: RecetaPatient[] }>(
							RECETAS_BY_HISTORIAL_QUERY,
							{ historialId: h.id },
						).then((res) => res.recetasByHistorial),
					),
				)
					.then((results) => setMyRecetas(results.flat()))
					.catch(() => {});
			});
		}, [pid]); // eslint-disable-line react-hooks/exhaustive-deps
		return null;
	}

	function flash(msg: string) {
		setSuccessMsg(msg);
		setTimeout(() => setSuccessMsg(''), 3000);
	}

	// ── Cargar slots disponibles al seleccionar médico y fecha ──
	// Se dispara solo cuando ambos campos tienen valor, evitando requests vacíos
	useEffect(() => {
		if (!booking.medicoId || !booking.fecha) {
			setSlots([]);
			setSlotsLoadError('');
			return;
		}
		setSlotsLoading(true);
		setSlotsLoadError('');
		gqlQuery<{ availableSlots: SlotDisponible[] }>(AVAILABLE_SLOTS_QUERY, {
			medicoId: booking.medicoId,
			// Usar mediodía local para evitar que UTC midnight desplace el día en el servidor
			fecha: new Date(`${booking.fecha}T12:00:00`).toISOString(),
		})
			.then((r) => setSlots(r.availableSlots))
			.catch((err) => {
				setSlots([]);
				setSlotsLoadError(
					err instanceof Error
						? err.message
						: m.rootErrorUnexpected({}, { locale }),
				);
			})
			.finally(() => setSlotsLoading(false));
	}, [booking.medicoId, booking.fecha, locale]);

	useEffect(() => {
		if (!booking.medicoId) {
			setDoctorAvailabilityDays([]);
			setAvailabilityLoadError('');
			setDoctorAvailabilityLoading(false);
			return;
		}

		setDoctorAvailabilityLoading(true);
		setAvailabilityLoadError('');
		gqlQuery<{ disponibilidadesByDoctor: DoctorAvailability[] }>(
			DOCTOR_AVAILABILITY_QUERY,
			{ medicoId: booking.medicoId },
		)
			.then((response) => {
				const uniqueDays = [
					...new Set(
						response.disponibilidadesByDoctor
							.filter((slot) => slot.activo)
							.map((slot) => slot.diaSemana)
							.filter((day) => day >= 0 && day <= 6),
					),
				].sort((a, b) => a - b);
				setDoctorAvailabilityDays(uniqueDays);
			})
			.catch((err) => {
				setDoctorAvailabilityDays([]);
				setAvailabilityLoadError(
					err instanceof Error
						? err.message
						: m.rootErrorUnexpected({}, { locale }),
				);
			})
			.finally(() => setDoctorAvailabilityLoading(false));
	}, [booking.medicoId, locale]);

	// ── Acción: agendar cita ──
	async function handleBook() {
		if (!patientId || !booking.medicoId || !booking.slot) return;
		setActionLoading('book');
		setError('');
		try {
			const res = await gqlMutation<{ createAppoinment: Appointment }>(
				CREATE_APPOINTMENT,
				{
					input: {
						pacienteId: patientId,
						medicoId: booking.medicoId,
						fechaHora: booking.slot,
						motivo: booking.motivo || undefined,
					},
				},
			);
			setAppointments((prev) => [
				{
					...res.createAppoinment,
					medicoId: res.createAppoinment.medicoId ?? booking.medicoId,
				},
				...prev,
			]);
			setBooking({ medicoId: '', fecha: '', slot: '', motivo: '' });
			setSlots([]);
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: buscar medicamentos ──
	async function handleSearchMedicines(query?: string) {
		setMedicinesLoading(true);
		try {
			const [medsRes, sedesRes] = await Promise.all([
				gqlQuery<{ medicines: MedicineItem[] }>(MEDICINES_QUERY, {
					busqueda: query || undefined,
				}),
				sedes.length === 0
					? gqlQuery<{ sedes: SedeItem[] }>(SEDES_QUERY)
					: Promise.resolve({ sedes }),
			]);
			setMedicinesList(medsRes.medicines);
			if (sedesRes.sedes !== sedes) setSedes(sedesRes.sedes);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setMedicinesLoading(false);
		}
	}

	async function handleSelectMedicine(medicamentoId: number) {
		setSelectedMedicineId(medicamentoId);
		try {
			const res = await gqlQuery<{ inventarioByMedicamento: InventarioItem[] }>(
				INVENTARIO_BY_MEDICAMENTO_QUERY,
				{ medicamentoId },
			);
			setSelectedMedicineInventory(res.inventarioByMedicamento);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		}
	}

	// ── Acción: crear turno ──
	// El paciente puede unirse a la cola del hospital directamente.
	// hospitalId viene de selectedHospitalId (hospital seleccionado al iniciar sesión).
	async function handleCreateTurn() {
		if (!patientId || !selectedHospitalId) return;
		setActionLoading('create-turn');
		setError('');
		try {
			const resolveActiveTurn = async () => {
				const patientTurns = await gqlQuery<{ turnosPorPaciente: Turno[] }>(
					PATIENT_TURNS_QUERY,
					{ pacienteId: patientId },
				);
				return [...(patientTurns.turnosPorPaciente ?? [])]
					.filter(
						(turn) =>
							!CLOSED_TURN_STATES.includes(
								turn.estado as (typeof CLOSED_TURN_STATES)[number],
							),
					)
					.sort((a, b) => a.numeroTurno - b.numeroTurno)[0];
			};

			const createTurn = async () =>
				gqlMutation<{ crearTurno: Turno }>(CREATE_PATIENT_TURN, {
					input: {
						pacienteId: patientId,
						hospitalId: selectedHospitalId,
						tipo: 'NORMAL',
					},
				});

			const applyCreatedTurn = async (turn: Turno) => {
				setTurns((prev) => [turn, ...prev]);
				await refreshQueueTurns();
				flash(
					m.dashboardTurnCreated(
						{ number: String(turn.numeroTurno) },
						{ locale },
					),
				);
			};

			const activeTurn = await resolveActiveTurn();
			if (activeTurn) {
				setError(activeTurnConflictMessage(locale, activeTurn.numeroTurno));
				return;
			}

			const res = await createTurn();
			await applyCreatedTurn(res.crearTurno);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale });
			if (isActiveTurnConflictError(message)) {
				try {
					const patientTurns = await gqlQuery<{ turnosPorPaciente: Turno[] }>(
						PATIENT_TURNS_QUERY,
						{ pacienteId: patientId },
					);
					const activeTurn = [...(patientTurns.turnosPorPaciente ?? [])]
						.filter(
							(turn) =>
								!CLOSED_TURN_STATES.includes(
									turn.estado as (typeof CLOSED_TURN_STATES)[number],
								),
						)
						.sort((a, b) => a.numeroTurno - b.numeroTurno)[0];
					setError(activeTurnConflictMessage(locale, activeTurn?.numeroTurno));
				} catch {
					setError(activeTurnConflictMessage(locale));
				}
				await refreshQueueTurns();
			} else if (isTurnNumberConflictError(message)) {
				await refreshQueueTurns();
				setError(uniqueTurnConflictRetryMessage(locale));
			} else {
				setError(message);
			}
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: actualizar perfil personal ──
	async function handleUpdateProfile() {
		setProfileLoading(true);
		setError('');
		try {
			const input: Record<string, string> = {};
			if (profileForm.nombre.trim() && profileForm.nombre !== user.nombre)
				input.nombre = profileForm.nombre.trim();
			if (profileForm.apellido.trim() && profileForm.apellido !== user.apellido)
				input.apellido = profileForm.apellido.trim();
			if (profileForm.telefono.trim())
				input.telefono = profileForm.telefono.trim();

			if (Object.keys(input).length === 0) {
				setProfileLoading(false);
				return;
			}

			await gqlMutation(UPDATE_MY_PROFILE, { input });
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setProfileLoading(false);
		}
	}

	// ── Acción: cancelar mi turno en espera ──
	async function handleCancelMyTurn(turnId: string) {
		setActionLoading('cancel-my-turn');
		setError('');
		try {
			await gqlMutation(CANCEL_TURN, { id: turnId });
			await refreshQueueTurns();
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
	async function handleCancelAppointment(id: string) {
		setActionLoading(`cancel-${id}`);
		setError('');
		try {
			// canceladaPor requerido por CancelAppoinmentInput; motivoCancelacion es el nombre correcto del campo
			await gqlMutation(CANCEL_APPOINTMENT, {
				input: {
					id,
					canceladaPor: user.id,
					motivoCancelacion: m.dashboardPatientCancellationReason(
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

	// ─── Turno llamado actual (hospital) + tu turno (paciente) ───────────────
	const currentCalledTurn = [...hospitalTurns]
		.filter((turn) =>
			CALLED_TURN_STATES.includes(
				turn.estado as (typeof CALLED_TURN_STATES)[number],
			),
		)
		.sort((a, b) => b.numeroTurno - a.numeroTurno)[0];

	const calledTurnsHistory = [...hospitalTurns]
		.filter((turn) =>
			CALLED_HISTORY_TURN_STATES.includes(
				turn.estado as (typeof CALLED_HISTORY_TURN_STATES)[number],
			),
		)
		.sort((a, b) => b.numeroTurno - a.numeroTurno)
		.slice(0, 6);

	const myCurrentTurn = [...turns]
		.filter(
			(turn) =>
				!CLOSED_TURN_STATES.includes(
					turn.estado as (typeof CLOSED_TURN_STATES)[number],
				),
		)
		.sort((a, b) => a.numeroTurno - b.numeroTurno)[0];

	const activeAppointments = useMemo(
		() =>
			[...appointments]
				.filter((appointment) => isActiveAppointment(appointment.estado))
				.sort(
					(a, b) =>
						new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime(),
				),
		[appointments],
	);

	const assignedAppointment = useMemo(() => {
		const now = Date.now();
		const upcoming = activeAppointments.find(
			(appointment) => new Date(appointment.fechaHora).getTime() >= now,
		);
		return upcoming ?? activeAppointments[0] ?? null;
	}, [activeAppointments]);

	const assignedDoctorLabel = useMemo(() => {
		if (!assignedAppointment?.medicoId) return '';
		const doctor = doctors.find(
			(item) => item.id === assignedAppointment.medicoId,
		);
		if (!doctor) return '';
		return doctorDisplayLabel(doctor, locale);
	}, [assignedAppointment, doctors, locale]);

	const isOverview = !section || section === 'overview';
	const showAppointments = isOverview || section === 'appointments';
	const showQueue = isOverview || section === 'queue';
	const showAi = section === 'ai';
	const showGame = section === 'queue' && isWaitingRoomOpen;
	const showHistorial = section === 'historial';
	const showMedicines = section === 'medicines';
	const showConsentimientos = section === 'consentimientos';
	const showRecetas = section === 'recetas';
	const showProfile = section === 'profile';
	const _showQueueList = showQueue && !(section === 'queue' && showGame);
	const headerSubtitle =
		section === 'ai'
			? m.dashboardPatientAiHeaderSubtitle({}, { locale })
			: m.authRegisterRolePatientDescription({}, { locale });

	// ─── Sección de citas con formulario de agendado ──────────────────────────

	function AppointmentBookingForm() {
		const specialtySelectId = 'patient-booking-specialty';
		const doctorSelectId = 'patient-booking-doctor';
		const doctorHelpId = 'patient-booking-doctor-help';
		const doctorEmptyStateId = 'patient-booking-doctor-empty';
		const dateInputId = 'patient-booking-calendar';
		const slotSelectId = 'patient-booking-slot';
		const reasonInputId = 'patient-booking-reason';
		// Filtrar médicos por especialidad cuando el paciente selecciona una
		const filteredDoctors = specialtyFilter
			? doctors.filter((d) => String(d.especialidadId) === specialtyFilter)
			: doctors;
		// Extraer especialidades únicas de los médicos disponibles
		const availableSpecialties = [
			...new Map(
				doctors.map((d) => [
					d.especialidadId,
					specialtyLabel(d.especialidadId, locale),
				]),
			),
		].sort((a, b) => a[1].localeCompare(b[1]));
		const selectedDoctor =
			filteredDoctors.find((d) => d.id === booking.medicoId) ?? null;
		const selectedDate = fromLocalDateValue(booking.fecha);
		const selectedSlot =
			slots.find((s) => s.fechaHora === booking.slot) ?? null;
		const selectedSlotLabel = selectedSlot
			? slotRangeLabel(selectedSlot, locale)
			: booking.slot
				? slotHourLabelFromIso(booking.slot, locale)
				: undefined;
		const finalSelectionLabel = booking.slot
			? finalSlotDateTimeLabel(booking.slot, locale)
			: '';
		const availableDaysSet = new Set(doctorAvailabilityDays);
		const minDate = startOfToday();

		const isDateDisabled = (date: Date) => {
			const currentDate = new Date(date);
			currentDate.setHours(0, 0, 0, 0);
			if (currentDate < minDate) return true;
			if (!booking.medicoId) return true;
			if (availableDaysSet.size === 0) return true;
			return !availableDaysSet.has(currentDate.getDay());
		};

		return (
			<Card className="border-border/70">
				<CardHeader className="pb-2">
					<CardTitle className="text-base">
						{m.dashboardPatientBookAppointmentTitle({}, { locale })}
					</CardTitle>
					<CardDescription>
						{m.dashboardPatientBookAppointmentSubtitle({}, { locale })}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					{/* Paso 1a: filtrar por especialidad */}
					<div className="space-y-2">
						<label
							htmlFor={specialtySelectId}
							className="text-xs font-medium text-muted-foreground"
						>
							{m.dashboardPatientFilterBySpecialty({}, { locale })}
						</label>
						<Select
							value={specialtyFilter}
							onValueChange={(v) => {
								setSpecialtyFilter(!v || v === '__all__' ? '' : v);
								setBooking((prev) => ({
									...prev,
									medicoId: '',
									fecha: '',
									slot: '',
								}));
							}}
						>
							<SelectTrigger id={specialtySelectId} className="w-full">
								<SelectValue
									placeholder={m.dashboardPatientAllSpecialties({}, { locale })}
								>
									{specialtyFilter
										? specialtyLabel(Number(specialtyFilter), locale)
										: m.dashboardPatientAllSpecialties({}, { locale })}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">
									{m.dashboardPatientAllSpecialties({}, { locale })}
								</SelectItem>
								{availableSpecialties.map(([id, label]) => (
									<SelectItem key={id} value={String(id)}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Paso 1b: seleccionar médico */}
					<div className="space-y-2">
						<label
							htmlFor={doctorSelectId}
							className="text-xs font-medium text-muted-foreground"
						>
							{m.dashboardPatientSelectDoctor({}, { locale })}
						</label>
						<Select
							value={booking.medicoId}
							disabled={loading || filteredDoctors.length === 0}
							onValueChange={(v) =>
								setBooking((prev) => ({
									...prev,
									medicoId: v ?? '',
									fecha: '',
									slot: '',
								}))
							}
						>
							<SelectTrigger
								id={doctorSelectId}
								className="h-auto min-h-10 w-full py-2"
								aria-describedby={
									selectedDoctor
										? doctorHelpId
										: !loading && filteredDoctors.length === 0
											? doctorEmptyStateId
											: undefined
								}
							>
								<SelectValue
									placeholder={m.dashboardPatientSelectDoctor({}, { locale })}
									className="min-w-0"
								>
									{selectedDoctor
										? doctorDisplayLabel(selectedDoctor, locale)
										: undefined}
								</SelectValue>
							</SelectTrigger>
							<SelectContent className="w-[min(94vw,36rem)]">
								{filteredDoctors.map((d) => {
									const label = doctorDisplayLabel(d, locale);
									return (
										<SelectItem
											key={d.id}
											value={d.id}
											label={label}
											title={label}
											className="items-start py-2"
										>
											<div className="flex min-w-0 flex-col text-left">
												<span className="truncate font-medium">
													{doctorDisplayName(d, locale)}
												</span>
												{d.consultorio && (
													<span className="truncate text-xs text-muted-foreground">
														{d.consultorio}
													</span>
												)}
											</div>
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
						{selectedDoctor && (
							<p
								id={doctorHelpId}
								className="wrap-break-word text-xs text-muted-foreground"
							>
								{doctorDisplayLabel(selectedDoctor, locale)}
							</p>
						)}
						{!loading && filteredDoctors.length === 0 && (
							<p
								id={doctorEmptyStateId}
								className="text-xs text-muted-foreground"
							>
								{m.dashboardPatientNoDoctorsAvailable({}, { locale })}
							</p>
						)}
					</div>

					{/* Paso 2 + Paso 3: fecha a la izquierda, horario a la derecha */}
					<div className="grid gap-4 md:grid-cols-2 md:items-stretch">
						<div className="space-y-2 md:mx-auto md:flex md:h-full md:w-full md:max-w-76 md:flex-col md:gap-2 md:space-y-0">
							<label
								htmlFor={dateInputId}
								className="text-xs font-medium text-muted-foreground"
							>
								{m.dashboardPatientDateLabel({}, { locale })}
							</label>
							{!booking.medicoId ? (
								<p className="text-xs text-muted-foreground">
									{m.dashboardPatientSelectDoctor({}, { locale })}
								</p>
							) : doctorAvailabilityLoading ? (
								<Skeleton className="h-52 rounded-xl" />
							) : doctorAvailabilityDays.length === 0 ? (
								<p className="text-xs text-muted-foreground">
									{m.dashboardPatientNoSlotsForDate({}, { locale })}
								</p>
							) : (
								<div
									id={dateInputId}
									className="mx-auto w-fit max-w-full rounded-xl border border-border/70 bg-muted/20 p-1.5"
								>
									<Calendar
										mode="single"
										selected={selectedDate ?? undefined}
										onSelect={(date) => {
											if (!date) {
												setBooking((prev) => ({
													...prev,
													fecha: '',
													slot: '',
												}));
												return;
											}
											setBooking((prev) => ({
												...prev,
												fecha: toLocalDateValue(date),
												slot: '',
											}));
										}}
										disabled={isDateDisabled}
										className="p-1 [--cell-size:1.95rem]"
										classNames={{ root: 'mx-auto w-fit' }}
									/>
								</div>
							)}

							{availabilityLoadError && (
								<p className="text-xs text-destructive">
									{availabilityLoadError}
								</p>
							)}
						</div>

						<div className="space-y-2 md:mx-auto md:w-full md:max-w-76">
							<label
								htmlFor={slotSelectId}
								className="text-xs font-medium text-muted-foreground"
							>
								{m.dashboardPatientSelectSlot({}, { locale })}
							</label>
							{!booking.medicoId ? (
								<p className="text-xs text-muted-foreground">
									{m.dashboardPatientSelectDoctor({}, { locale })}
								</p>
							) : !booking.fecha ? (
								<p className="text-xs text-muted-foreground">
									{m.dashboardPatientDateLabel({}, { locale })}
								</p>
							) : slotsLoading ? (
								<Skeleton className="h-9 rounded-md" />
							) : slotsLoadError ? (
								<p className="text-xs text-destructive">{slotsLoadError}</p>
							) : slots.length === 0 ? (
								<p className="text-xs text-muted-foreground">
									{m.dashboardPatientNoSlotsForDate({}, { locale })}
								</p>
							) : (
								<div className="space-y-2 md:flex md:flex-1 md:flex-col md:space-y-0">
									<Select
										value={booking.slot}
										onValueChange={(v) =>
											setBooking((prev) => ({ ...prev, slot: v ?? '' }))
										}
									>
										<SelectTrigger id={slotSelectId} className="w-full">
											<SelectValue
												placeholder={m.dashboardPatientSelectSlot(
													{},
													{ locale },
												)}
											>
												{selectedSlotLabel}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{slots.map((s) => {
												const label = slotRangeLabel(s, locale);
												return (
													<SelectItem
														key={s.fechaHora}
														value={s.fechaHora}
														label={label}
													>
														{label}
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
									{finalSelectionLabel && (
										<div className="md:flex md:flex-1 md:items-center pt-5">
											<div className="w-full rounded-xl border border-secondary/70 bg-secondary/25 px-3 py-2 text-center">
												<p className="text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground">
													{m.dashboardPatientDateLabel({}, { locale })}
												</p>
												<p className="mt-1 text-xl font-bold text-secondary-foreground sm:text-2xl">
													{finalSelectionLabel}
												</p>
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					</div>

					{/* Motivo de la consulta */}
					<div className="space-y-1">
						<label
							htmlFor={reasonInputId}
							className="text-xs font-medium text-muted-foreground"
						>
							{m.dashboardPatientMotivo({}, { locale })}
						</label>
						<Textarea
							id={reasonInputId}
							value={booking.motivo}
							onChange={(e) =>
								setBooking((prev) => ({ ...prev, motivo: e.target.value }))
							}
							placeholder={m.dashboardPatientMotivoPlaceholder({}, { locale })}
							className="min-h-20 resize-y"
						/>
					</div>

					<Button
						type="button"
						onClick={handleBook}
						disabled={
							actionLoading === 'book' || !booking.medicoId || !booking.slot
						}
						className="gap-2"
					>
						<PlusIcon className="h-4 w-4" />
						{actionLoading === 'book'
							? m.dashboardActionSaving({}, { locale })
							: m.dashboardPatientBookAction({}, { locale })}
					</Button>
				</CardContent>
			</Card>
		);
	}

	function TurnStatusPanel({
		showOwnTurn,
		splitOwnTurn,
	}: {
		showOwnTurn: boolean;
		splitOwnTurn?: boolean;
	}) {
		const shouldSplitWithOwnTurn = Boolean(splitOwnTurn && myCurrentTurn);

		return (
			<div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
				<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					{m.dashboardSidebarQueue({}, { locale })}
				</p>
				{currentCalledTurn && (
					<p className="mt-1 text-xs text-muted-foreground">
						{m.dashboardTurnCalled(
							{ number: String(currentCalledTurn.numeroTurno) },
							{ locale },
						)}
					</p>
				)}
				{shouldSplitWithOwnTurn ? (
					<div className="mt-3 grid grid-cols-2 divide-x divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-background/80">
						<div className="p-3 text-center">
							<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
								{m.dashboardSidebarQueue({}, { locale })}
							</p>
							<p className="mt-2 text-3xl font-bold tabular-nums text-secondary-foreground sm:text-4xl">
								{currentCalledTurn ? `#${currentCalledTurn.numeroTurno}` : '--'}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{currentCalledTurn
									? `${currentCalledTurn.tipo} - ${statusLabel(currentCalledTurn.estado, locale)}`
									: m.dashboardPatientNoCalledTurnInfo({}, { locale })}
							</p>
						</div>
						<div className="p-3 text-center">
							<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
								{m.dashboardPatientCalledTurnLabel({}, { locale })}
							</p>
							<p className="mt-2 text-3xl font-bold tabular-nums text-primary sm:text-4xl">
								#{myCurrentTurn.numeroTurno}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{`${myCurrentTurn.tipo} - ${statusLabel(myCurrentTurn.estado, locale)}`}
							</p>
						</div>
					</div>
				) : (
					<>
						<p className="mt-3 text-center text-4xl font-bold tabular-nums text-secondary-foreground sm:text-5xl">
							{currentCalledTurn ? `#${currentCalledTurn.numeroTurno}` : '--'}
						</p>
						<p className="mt-1 text-center text-xs text-muted-foreground">
							{currentCalledTurn
								? `${currentCalledTurn.tipo} - ${statusLabel(currentCalledTurn.estado, locale)}`
								: m.dashboardPatientNoCalledTurnInfo({}, { locale })}
						</p>
					</>
				)}

				{calledTurnsHistory.length > 0 && (
					<div className="mt-4 space-y-2 border-t border-border/60 pt-3">
						<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
							{m.dashboardSidebarHistorial({}, { locale })}
						</p>
						<ul className="space-y-1.5">
							{calledTurnsHistory.map((turn) => (
								<li
									key={turn.id}
									className="flex items-center justify-between rounded-md bg-background/80 px-2 py-1.5"
								>
									<span className="text-sm font-semibold tabular-nums text-foreground">
										#{turn.numeroTurno}
									</span>
									<span className="text-xs text-muted-foreground">
										{statusLabel(turn.estado, locale)}
									</span>
								</li>
							))}
						</ul>
					</div>
				)}

				{myCurrentTurn && (
					<div className="mt-4 border-t border-border/60 pt-3">
						<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
							{locale === 'es' ? 'Flujo de atencion' : 'Care flow'}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{locale === 'es'
								? 'El cambio a Atendido lo realiza recepcion o enfermeria desde la gestion de cola.'
								: 'The transition to Attended is done by reception or nursing from queue management.'}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{assignedDoctorLabel
								? locale === 'es'
									? `Medico de referencia por cita: ${assignedDoctorLabel}`
									: `Assigned doctor from appointment: ${assignedDoctorLabel}`
								: locale === 'es'
									? 'Aun no hay un medico asignado por cita para este flujo.'
									: 'There is no doctor assigned by appointment for this flow yet.'}
						</p>
					</div>
				)}

				{showOwnTurn && !shouldSplitWithOwnTurn && (
					<div className="mt-4 border-t border-border/60 pt-3">
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							{m.dashboardPatientCalledTurnLabel({}, { locale })}
						</p>
						<p className="mt-2 text-center text-3xl font-bold tabular-nums text-primary sm:text-4xl">
							{myCurrentTurn ? `#${myCurrentTurn.numeroTurno}` : '--'}
						</p>
						<p className="mt-1 text-center text-xs text-muted-foreground">
							{myCurrentTurn
								? `${myCurrentTurn.tipo} - ${statusLabel(myCurrentTurn.estado, locale)}`
								: m.dashboardPatientNoCalledTurnInfo({}, { locale })}
						</p>
					</div>
				)}
			</div>
		);
	}

	// ─── Shell y render principal ─────────────────────────────────────────────

	return (
		<RoleDashboardShell
			title={m.authRolePatient({}, { locale })}
			subtitle={headerSubtitle}
			headerAction={
				!showGame && section !== 'ai' && section !== 'queue' ? (
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
				) : undefined
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

			{/* ── Consentimientos informados ── */}
			{showConsentimientos && (
				<section aria-label={m.dashboardSidebarConsentimientos({}, { locale })}>
					<Card className="border-border/70">
						<CardHeader className="pb-2">
							<CardTitle className="text-base">
								{locale === 'es'
									? 'Mis consentimientos informados'
									: 'My informed consents'}
							</CardTitle>
							<CardDescription>
								{locale === 'es'
									? 'Registro de autorizaciones otorgadas para procedimientos y tratamientos (Ley 23/1981).'
									: 'Record of authorizations granted for procedures and treatments.'}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							{/* ConsentimientosLoader dispara la carga al montarse como componente JSX.
							    Esto evita el problema de hooks condicionales: React lo trata como
							    componente independiente con su propio useEffect. */}
							<ConsentimientosLoader patientId={patientId} />
							{myConsentimientos.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									{locale === 'es'
										? 'No tienes consentimientos registrados.'
										: 'You have no registered consents.'}
								</p>
							) : (
								myConsentimientos.map((c) => (
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
													? m.consentimientoRevoked({}, { locale })
													: c.consentimientoOtorgado
														? m.consentimientoGranted({}, { locale })
														: m.consentimientoDenied({}, { locale })}
											</Badge>
											{/* El paciente puede revocar (denegar) un consentimiento vigente.
											    Una vez revocado el estado es irreversible desde el frontend
											    (Ley 23/1981 Art. 15: revocación queda en historial). */}
											{!c.revocado && c.consentimientoOtorgado && (
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={actionLoading === `revoke-${c.id}`}
													onClick={async () => {
														setActionLoading(`revoke-${c.id}`);
														try {
															const res = await gqlMutation<{
																revocarConsentimiento: {
																	id: number;
																	revocado: boolean;
																	fechaRevocacion: string;
																};
															}>(REVOCAR_CONSENTIMIENTO, { id: c.id });
															setMyConsentimientos((prev) =>
																prev.map((item) =>
																	item.id === c.id
																		? {
																				...item,
																				revocado: true,
																				fechaRevocacion:
																					res.revocarConsentimiento
																						.fechaRevocacion,
																			}
																		: item,
																),
															);
															flash(
																m.consentimientoUpdateSuccess({}, { locale }),
															);
														} catch {
															setError(
																m.consentimientoUpdateError({}, { locale }),
															);
														} finally {
															setActionLoading(null);
														}
													}}
												>
													{m.consentimientoDeny({}, { locale })}
												</Button>
											)}
										</div>
									</div>
								))
							)}
						</CardContent>
					</Card>
				</section>
			)}

			{/* ── Recetas médicas del paciente ── */}
			{showRecetas && (
				<section aria-label={m.dashboardSidebarRecetas({}, { locale })}>
					<Card className="border-border/70">
						<CardHeader className="pb-2">
							<CardTitle className="text-base">
								{locale === 'es' ? 'Mis recetas médicas' : 'My prescriptions'}
							</CardTitle>
							<CardDescription>
								{locale === 'es'
									? 'Recetas prescritas por tus médicos vinculadas a tu historial clínico.'
									: 'Prescriptions written by your doctors linked to your medical history.'}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							<RecetasLoader patientId={patientId} />
							{myRecetas.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									{locale === 'es'
										? 'No tienes recetas médicas registradas.'
										: 'You have no registered prescriptions.'}
								</p>
							) : (
								myRecetas.map((r) => {
									const med = medicineCatalog.find(
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
															{r.duracionDias}{' '}
															{locale === 'es' ? 'días' : 'days'}
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
								})
							)}
						</CardContent>
					</Card>
				</section>
			)}

			{/* ── Perfil personal ── */}
			{showProfile && (
				<section aria-label={m.dashboardSidebarProfile({}, { locale })}>
					<Card className="border-border/70">
						<CardHeader className="pb-2">
							<CardTitle className="text-base">
								{locale === 'es'
									? 'Información personal'
									: 'Personal information'}
							</CardTitle>
							<CardDescription>
								{locale === 'es'
									? 'Actualiza tu nombre, apellido y teléfono de contacto.'
									: 'Update your name, last name and phone number.'}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Grid responsivo: 2 columnas en escritorio, 1 en móvil */}
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-1">
									<label
										htmlFor="profile-nombre"
										className="text-xs font-medium text-muted-foreground"
									>
										{m.authRegisterLabelNombre({}, { locale })}
									</label>
									<Input
										id="profile-nombre"
										value={profileForm.nombre}
										onChange={(e) =>
											setProfileForm((prev) => ({
												...prev,
												nombre: e.target.value,
											}))
										}
										placeholder={user.nombre}
									/>
								</div>
								<div className="space-y-1">
									<label
										htmlFor="profile-apellido"
										className="text-xs font-medium text-muted-foreground"
									>
										{m.authRegisterLabelApellido({}, { locale })}
									</label>
									<Input
										id="profile-apellido"
										value={profileForm.apellido}
										onChange={(e) =>
											setProfileForm((prev) => ({
												...prev,
												apellido: e.target.value,
											}))
										}
										placeholder={user.apellido}
									/>
								</div>
							</div>
							<div className="space-y-1">
								<label
									htmlFor="profile-telefono"
									className="text-xs font-medium text-muted-foreground"
								>
									{m.authRegisterLabelTelefono({}, { locale })}
								</label>
								<Input
									id="profile-telefono"
									type="tel"
									value={profileForm.telefono}
									onChange={(e) =>
										setProfileForm((prev) => ({
											...prev,
											telefono: e.target.value,
										}))
									}
									placeholder={
										locale === 'es' ? '+57 300 123 4567' : '+1 555 123 4567'
									}
								/>
							</div>

							{/* Info de solo lectura: email y rol */}
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-1">
									<p className="text-xs font-medium text-muted-foreground">
										{m.authRegisterLabelEmail({}, { locale })}
									</p>
									<p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
										{user.email}
									</p>
								</div>
								<div className="space-y-1">
									<p className="text-xs font-medium text-muted-foreground">
										{m.authRegisterLabelRol({}, { locale })}
									</p>
									<p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
										{user.rol}
									</p>
								</div>
							</div>

							<Button
								type="button"
								onClick={handleUpdateProfile}
								disabled={profileLoading}
								className="gap-2"
							>
								{profileLoading
									? m.dashboardActionSaving({}, { locale })
									: locale === 'es'
										? 'Guardar cambios'
										: 'Save changes'}
							</Button>
						</CardContent>
					</Card>
				</section>
			)}

			{/* ── Historial médico ── */}
			{showHistorial && (
				<div className="space-y-4">
					<div>
						<p className="text-sm font-semibold text-foreground">
							{m.dashboardPatientHistorialTitle({}, { locale })}
						</p>
						<p className="text-xs text-muted-foreground">
							{m.dashboardPatientHistorialSubtitle({}, { locale })}
						</p>
					</div>
					{loading ? (
						[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-20 rounded-xl" />
						))
					) : historial.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{missingProfile
								? m.dashboardPatientMissingProfile({}, { locale })
								: m.dashboardPatientHistorialEmpty({}, { locale })}
						</p>
					) : (
						historial.map((entry) => (
							<div
								key={entry.id}
								className="rounded-xl border border-border/70 bg-background/90 p-3"
							>
								<div className="flex items-start justify-between gap-2">
									<div className="space-y-1">
										<p className="text-sm font-medium text-foreground">
											{entry.diagnostico}
										</p>
										<p className="text-xs text-muted-foreground">
											{entry.tratamiento}
										</p>
										{entry.observaciones && (
											<p className="text-xs text-muted-foreground/70">
												{entry.observaciones}
											</p>
										)}
									</div>
									<Badge variant="outline" className="shrink-0">
										{new Date(entry.creadoEn).toLocaleDateString(locale)}
									</Badge>
								</div>
							</div>
						))
					)}
				</div>
			)}

			{/* ── Citas + Turnos (overview / secciones individuales) ── */}
			{/* md:grid-cols-2 en vez de lg: tablets (768-1023px) también aprovechan el layout */}
			{(showAppointments || (showQueue && !showGame)) && (
				<div
					className={`grid gap-4 ${
						showAppointments && showQueue ? 'md:grid-cols-2' : ''
					}`}
				>
					{showAppointments && (
						<section className="space-y-3 rounded-xl border border-border/70 p-3">
							<h3 className="text-sm font-semibold text-foreground">
								{m.dashboardSidebarAppointments({}, { locale })}
							</h3>

							{/* Render como función para evitar remount del formulario interno y conservar el foco en campos de texto */}
							{section === 'appointments' && AppointmentBookingForm()}

							{loading ? (
								<Skeleton className="h-16 rounded-lg" />
							) : appointments.length === 0 ? (
								<p className="text-xs text-muted-foreground">
									{missingProfile
										? m.dashboardPatientMissingProfile({}, { locale })
										: m.dashboardPatientsEmptyDescription({}, { locale })}
								</p>
							) : (
								<ul className="space-y-2">
									{(isOverview ? appointments.slice(0, 4) : appointments).map(
										(a) => {
											const canCancel =
												a.estado === 'PENDIENTE' || a.estado === 'CONFIRMADA';
											const doctor = a.medicoId
												? doctors.find((d) => d.id === a.medicoId)
												: null;
											const doctorLabel = doctor
												? doctorDisplayLabel(doctor, locale)
												: m.dashboardPatientDoctorUnnamed({}, { locale });
											return (
												<li key={a.id} className="rounded-lg bg-muted/30 p-2">
													<div className="flex items-start justify-between gap-2">
														<div className="min-w-0">
															<div className="flex items-center gap-2">
																<span className="text-xs font-medium text-foreground truncate">
																	{doctorLabel}
																</span>
																<Badge variant={statusVariant(a.estado)}>
																	{statusLabel(a.estado, locale)}
																</Badge>
															</div>
															<p className="mt-1 flex items-center gap-1 text-xs text-foreground">
																<ClockIcon className="h-3.5 w-3.5 shrink-0" />
																{new Date(a.fechaHora).toLocaleString(locale)}
															</p>
															{a.motivo && (
																<p className="text-xs text-muted-foreground truncate">
																	{a.motivo}
																</p>
															)}
														</div>
														{/* Botón de cancelar — solo si la cita aún está activa */}
														{!isOverview && canCancel && (
															<Button
																type="button"
																size="sm"
																variant="destructive"
																onClick={() => handleCancelAppointment(a.id)}
																disabled={actionLoading === `cancel-${a.id}`}
																className="shrink-0 gap-1 text-xs"
															>
																<XCircleIcon className="h-3.5 w-3.5" />
																{actionLoading === `cancel-${a.id}`
																	? m.dashboardActionCancelling({}, { locale })
																	: m.dashboardPatientCancelAction(
																			{},
																			{ locale },
																		)}
															</Button>
														)}
													</div>
												</li>
											);
										},
									)}
								</ul>
							)}
						</section>
					)}

					{showQueue && !showGame && (
						<section className="space-y-3 rounded-xl border border-border/70 p-3">
							<h3 className="text-sm font-semibold text-foreground">
								{m.dashboardSidebarQueue({}, { locale })}
							</h3>

							<TurnStatusPanel
								showOwnTurn={false}
								splitOwnTurn={isOverview || section === 'queue'}
							/>

							{/* Crear turno — paciente puede unirse a la cola directamente */}
							{section === 'queue' && selectedHospitalId && (
								<div className="rounded-xl border border-border/70 bg-muted/20 p-3">
									<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<h4 className="text-sm font-semibold text-foreground">
												{m.dashboardPatientJoinQueueTitle({}, { locale })}
											</h4>
											<p className="text-xs text-muted-foreground">
												{m.dashboardPatientJoinQueueDescription({}, { locale })}
											</p>
										</div>
										<Button
											type="button"
											onClick={handleCreateTurn}
											disabled={actionLoading === 'create-turn' || !patientId}
											size="sm"
											className="shrink-0 gap-2"
										>
											<PlusIcon className="h-4 w-4" />
											{actionLoading === 'create-turn'
												? m.dashboardActionSaving({}, { locale })
												: m.dashboardPatientJoinQueueAction({}, { locale })}
										</Button>
									</div>
								</div>
							)}

							{section === 'queue' &&
								myCurrentTurn &&
								isWaitingTurn(myCurrentTurn.estado) && (
									<div className="rounded-xl border border-border/70 bg-muted/20 p-3">
										<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
											<div>
												<h4 className="text-sm font-semibold text-foreground">
													{locale === 'es'
														? 'Cancelar turno en espera'
														: 'Cancel waiting turn'}
												</h4>
												<p className="text-xs text-muted-foreground">
													{locale === 'es'
														? `Tienes el turno #${myCurrentTurn.numeroTurno} en espera. Puedes cancelarlo si ya no lo necesitas.`
														: `You have turn #${myCurrentTurn.numeroTurno} waiting. You can cancel it if you no longer need it.`}
												</p>
											</div>
											<Button
												type="button"
												variant="destructive"
												onClick={() => handleCancelMyTurn(myCurrentTurn.id)}
												disabled={actionLoading === 'cancel-my-turn'}
												size="sm"
												className="shrink-0 gap-2"
											>
												<XCircleIcon className="h-4 w-4" />
												{actionLoading === 'cancel-my-turn'
													? m.dashboardActionCancelling({}, { locale })
													: m.dashboardNurseCancelTurn({}, { locale })}
											</Button>
										</div>
									</div>
								)}

							{/* Botón de sala de espera con juego interactivo */}
							{section === 'queue' && (
								<div className="rounded-xl border border-border/70 bg-muted/20 p-3">
									<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<h4 className="text-sm font-semibold text-foreground">
												{m.dashboardPatientWaitingRoomTitle({}, { locale })}
											</h4>
											<p className="text-xs text-muted-foreground">
												{m.dashboardPatientWaitingRoomDescription(
													{},
													{ locale },
												)}
											</p>
										</div>
										<Button
											type="button"
											onClick={() => setIsWaitingRoomOpen(true)}
											size="sm"
										>
											{m.dashboardPatientWaitingRoomAction({}, { locale })}
										</Button>
									</div>
								</div>
							)}

							{loading ? (
								<Skeleton className="h-16 rounded-lg" />
							) : turns.length === 0 ? (
								<p className="text-xs text-muted-foreground">
									{missingProfile
										? m.dashboardPatientMissingProfile({}, { locale })
										: m.dashboardPatientsEmptyDescription({}, { locale })}
								</p>
							) : (
								<ul className="space-y-2">
									{(isOverview ? turns.slice(0, 4) : turns).map((t) => (
										<li
											key={t.id}
											className="flex items-center justify-between rounded-lg bg-muted/30 p-2"
										>
											<div>
												<p className="text-sm font-medium text-foreground">
													#{t.numeroTurno}
												</p>
												<p className="text-xs text-muted-foreground">
													{t.tipo}
												</p>
											</div>
											<Badge variant="secondary">
												{statusLabel(t.estado, locale)}
											</Badge>
										</li>
									))}
								</ul>
							)}
						</section>
					)}
				</div>
			)}

			{/* ── Sala de espera con juego ── */}
			{showGame && (
				<section className="space-y-3 rounded-xl border border-border/70 p-3">
					<div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
						<WaitingRoomGame />
						<div className="xl:sticky xl:top-4">
							<TurnStatusPanel showOwnTurn />
						</div>
					</div>
				</section>
			)}

			{showAi && <PatientAiSection locale={locale} />}

			{showMedicines && (
				<section aria-label={m.dashboardSidebarMedicines({}, { locale })}>
					<Card className="border-border/70">
						<CardHeader className="pb-2">
							<CardTitle className="text-base">
								{m.dashboardPatientMedicinesTitle({}, { locale })}
							</CardTitle>
							<CardDescription>
								{m.dashboardPatientMedicinesSubtitle({}, { locale })}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Buscador de medicamentos */}
							<div className="flex gap-2">
								<Input
									id="patient-medicine-search"
									value={medicineSearch}
									onChange={(e) => setMedicineSearch(e.target.value)}
									placeholder={m.dashboardPatientMedicinesSearchPlaceholder(
										{},
										{ locale },
									)}
									onKeyDown={(e) => {
										if (e.key === 'Enter')
											void handleSearchMedicines(medicineSearch);
									}}
								/>
								<Button
									type="button"
									onClick={() => void handleSearchMedicines(medicineSearch)}
									disabled={medicinesLoading}
								>
									{medicinesLoading
										? m.dashboardActionSaving({}, { locale })
										: m.dashboardPatientMedicinesSearchAction({}, { locale })}
								</Button>
							</div>

							{/* Lista de medicamentos */}
							{medicinesList.length > 0 && (
								<div className="space-y-2">
									{medicinesList.map((med) => {
										const isSelected = selectedMedicineId === med.id;
										return (
											<div key={med.id}>
												<button
													type="button"
													onClick={() => void handleSelectMedicine(med.id)}
													className={`w-full rounded-xl border p-3 text-left transition-colors ${
														isSelected
															? 'border-primary bg-primary/5'
															: 'border-border/70 hover:bg-muted/30'
													}`}
												>
													<div className="flex flex-wrap items-center justify-between gap-2">
														<div className="space-y-0.5">
															<p className="text-sm font-medium">
																{med.nombreComercial}
															</p>
															{med.nombreGenerico && (
																<p className="text-xs text-muted-foreground">
																	{med.nombreGenerico}
																</p>
															)}
														</div>
														<div className="flex gap-2">
															{med.presentacion && (
																<Badge variant="outline">
																	{med.presentacion}
																</Badge>
															)}
															{med.requiereReceta && (
																<Badge variant="secondary">
																	{m.dashboardMedicinesFieldRequiresPrescription(
																		{},
																		{ locale },
																	)}
																</Badge>
															)}
														</div>
													</div>
												</button>

												{/* Disponibilidad por sede */}
												{isSelected && selectedMedicineInventory.length > 0 && (
													<div className="mt-2 ml-4 space-y-1.5">
														{selectedMedicineInventory.map((inv) => {
															const sede = sedes.find(
																(s) => s.id === inv.sedeId,
															);
															return (
																<div
																	key={inv.id}
																	className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5"
																>
																	<div>
																		<p className="text-sm font-medium">
																			{sede?.nombre ?? `Sede #${inv.sedeId}`}
																		</p>
																		{sede?.direccion && (
																			<p className="text-xs text-muted-foreground">
																				{sede.direccion}
																				{sede.ciudad ? ` — ${sede.ciudad}` : ''}
																			</p>
																		)}
																	</div>
																	<div className="flex items-center gap-2">
																		<Badge
																			variant={
																				inv.disponibilidad === 'DISPONIBLE'
																					? 'default'
																					: inv.disponibilidad === 'STOCK_BAJO'
																						? 'secondary'
																						: 'destructive'
																			}
																		>
																			{inv.disponibilidad === 'DISPONIBLE'
																				? m.dashboardPatientMedicineAvailable(
																						{},
																						{ locale },
																					)
																				: inv.disponibilidad === 'STOCK_BAJO'
																					? m.dashboardPatientMedicineLowStock(
																							{},
																							{ locale },
																						)
																					: m.dashboardPatientMedicineOutOfStock(
																							{},
																							{ locale },
																						)}
																		</Badge>
																		{inv.precio && (
																			<span className="text-xs font-medium text-foreground">
																				${inv.precio}
																			</span>
																		)}
																	</div>
																</div>
															);
														})}
													</div>
												)}
												{isSelected &&
													selectedMedicineInventory.length === 0 && (
														<p className="mt-2 ml-4 text-xs text-muted-foreground">
															{m.dashboardPatientMedicinesNoStock(
																{},
																{ locale },
															)}
														</p>
													)}
											</div>
										);
									})}
								</div>
							)}

							{medicinesList.length === 0 && !medicinesLoading && (
								<p className="text-sm text-muted-foreground">
									{m.dashboardPatientMedicinesEmpty({}, { locale })}
								</p>
							)}
						</CardContent>
					</Card>
				</section>
			)}
		</RoleDashboardShell>
	);
}

// Daniel Useche
