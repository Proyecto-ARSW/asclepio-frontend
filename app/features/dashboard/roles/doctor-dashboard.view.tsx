import {
	ArrowPathIcon,
	CalendarDaysIcon,
	CheckCircleIcon,
	ClipboardDocumentListIcon,
	ClockIcon,
	PlusIcon,
	QueueListIcon,
	TrashIcon,
	XCircleIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
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
import type { DashboardSection, RoleViewProps } from './dashboard-role.types';
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
	diagnostico: string;
	tratamiento: string;
	observaciones: string | null;
	creadoEn: string;
}

interface PatientOption {
	id: string;
	nombre: string;
	apellido: string;
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
			diagnostico
			tratamiento
			observaciones
			creadoEn
		}
	}
`;

const DOCTOR_PATIENTS_QUERY = `
	query DoctorPatients {
		patients {
			id
			nombre
			apellido
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
		const res = await gqlQuery<{ patients: PatientOption[] }>(
			DOCTOR_PATIENTS_QUERY,
		);
		setPatients(res.patients);
	}, []);

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
				section === 'historial' ? loadPatients() : Promise.resolve(),
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
			case 'appointments':
				return AppointmentsSection();
			case 'queue':
				return QueueSection();
			case 'disponibilidad':
				return DisponibilidadSection();
			case 'historial':
				return HistorialSection();
			default:
				return null;
		}
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
			</div>
		);
	}

	// ── Sección de historial médico ──
	function HistorialSection() {
		const patientOptions = [
			...new Set(appointments.map((a) => a.pacienteId)),
		].map((pacienteId) => {
			const patient = patients.find((item) => item.id === pacienteId);
			const fullName =
				`${patient?.nombre ?? ''} ${patient?.apellido ?? ''}`.trim();
			return {
				id: pacienteId,
				label: fullName || pacienteId,
			};
		});
		const patientSelectId = 'doctor-historial-patient';
		const diagnosisInputId = 'doctor-historial-diagnosis';
		const treatmentInputId = 'doctor-historial-treatment';
		const observationsInputId = 'doctor-historial-observations';

		return (
			<div className="space-y-4">
				{/* Formulario para crear nueva entrada de historial */}
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
						{/* Seleccionar paciente (extraído de las citas del médico) */}
						<div className="space-y-1">
							<label
								htmlFor={patientSelectId}
								className="text-xs font-medium text-muted-foreground"
							>
								{m.dashboardPatientSelectDoctor({}, { locale })}
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
								placeholder={m.dashboardDoctorHistorialDiagnostico(
									{},
									{ locale },
								)}
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
								placeholder={m.dashboardDoctorHistorialTratamiento(
									{},
									{ locale },
								)}
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
								placeholder={m.dashboardDoctorHistorialObservaciones(
									{},
									{ locale },
								)}
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

				{/* Lista de historial existente */}
				<div className="space-y-2">
					{loading ? (
						[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-20 rounded-xl" />
						))
					) : historial.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{m.dashboardPatientHistorialEmpty({}, { locale })}
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
		appointments: m.dashboardSidebarAppointments({}, { locale }),
		queue: m.dashboardSidebarQueue({}, { locale }),
		disponibilidad: m.dashboardDoctorDisponibilidadTitle({}, { locale }),
		historial: m.dashboardDoctorHistorialTitle({}, { locale }),
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
