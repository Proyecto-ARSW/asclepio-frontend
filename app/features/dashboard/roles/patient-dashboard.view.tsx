import {
	ArrowPathIcon,
	ClockIcon,
	PlusIcon,
	XCircleIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import { WaitingRoomGame } from '@/components/game/waiting-room-game';
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
import { m } from '@/features/i18n/paraglide/messages';
import { gqlMutation, gqlQuery } from '@/lib/graphql-client';
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

interface SlotDisponible {
	inicio: string;
	fin: string;
}

// ─── Queries & Mutations ──────────────────────────────────────────────────────

const PATIENTS_QUERY = `
	query PatientProfile {
		patients {
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
	query DoctorsForBooking {
		doctors {
			id
			nombre
			apellido
			especialidadId
			consultorio
		}
	}
`;

// Traer slots disponibles de un médico en una fecha
const AVAILABLE_SLOTS_QUERY = `
	query AvailableSlots($medicoId: ID!, $fecha: DateTime!) {
		availableSlots(medicoId: $medicoId, fecha: $fecha) {
			inicio
			fin
		}
	}
`;

// Agendar una cita en un slot específico
const CREATE_APPOINTMENT = `
	mutation CreateAppointment($input: CreateAppoinmentInput!) {
		createAppoinment(input: $input) {
			id
			fechaHora
			estado
			motivo
		}
	}
`;

// Cancelar cita del paciente
const CANCEL_APPOINTMENT = `
	mutation CancelPatientAppointment($input: CancelAppoinmentInput!) {
		cancelAppoinment(input: $input) { id estado }
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

function statusLabel(estado: string, locale: 'es' | 'en') {
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
			return locale === 'es' ? 'En espera' : 'Waiting';
		case 'EN_CONSULTA':
			return locale === 'es' ? 'En consulta' : 'In consultation';
		default:
			return estado;
	}
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PatientDashboardView({
	user,
	locale,
	section,
}: RoleViewProps) {
	const [patientId, setPatientId] = useState<string | null>(null);
	const [missingProfile, setMissingProfile] = useState(false);
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [turns, setTurns] = useState<Turno[]>([]);
	const [historial, setHistorial] = useState<HistorialEntry[]>([]);
	const [doctors, setDoctors] = useState<Doctor[]>([]);
	const [slots, setSlots] = useState<SlotDisponible[]>([]);
	const [loading, setLoading] = useState(true);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [error, setError] = useState('');
	const [successMsg, setSuccessMsg] = useState('');
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [isWaitingRoomOpen, setIsWaitingRoomOpen] = useState(false);

	// Formulario de agendar cita
	const [booking, setBooking] = useState({
		medicoId: '',
		fecha: '',
		slot: '',
		motivo: '',
	});

	const loadProfile = useCallback(async () => {
		const res = await gqlQuery<{ patients: PatientProfile[] }>(PATIENTS_QUERY);
		const mine = res.patients.find((p) => p.usuarioId === user.id);
		if (!mine) { setMissingProfile(true); return null; }
		setPatientId(mine.id);
		return mine;
	}, [user.id]);

	const loadData = useCallback(async () => {
		setLoading(true);
		setError('');
		setMissingProfile(false);
		try {
			const profile = await loadProfile();
			if (!profile) return;

			// Carga paralela por sección para evitar waterfalls
			await Promise.all([
				(section === 'overview' || section === 'appointments' || !section)
					? gqlQuery<{ appoinmentsByPatient: Appointment[] }>(
							PATIENT_APPOINTMENTS_QUERY,
							{ pacienteId: profile.id },
						).then((r) => setAppointments(r.appoinmentsByPatient))
					: Promise.resolve(),
				(section === 'overview' || section === 'queue' || !section)
					? gqlQuery<{ turnosPorPaciente: Turno[] }>(PATIENT_TURNS_QUERY, {
							pacienteId: profile.id,
						}).then((r) => setTurns(r.turnosPorPaciente))
					: Promise.resolve(),
				section === 'historial'
					? gqlQuery<{ historialByPaciente: HistorialEntry[] }>(
							PATIENT_HISTORIAL_QUERY,
							{ pacienteId: profile.id },
						).then((r) => setHistorial(r.historialByPaciente))
					: Promise.resolve(),
				// Cargar médicos al llegar a la sección de citas (para el formulario)
				section === 'appointments'
					? gqlQuery<{ doctors: Doctor[] }>(DOCTORS_QUERY).then((r) =>
							setDoctors(r.doctors),
						)
					: Promise.resolve(),
			]);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Error al cargar datos';
			setError(msg);
		} finally {
			setLoading(false);
		}
	}, [loadProfile, section]);

	useEffect(() => { void loadData(); }, [loadData]);

	// Cerrar sala de espera al cambiar de sección
	useEffect(() => {
		if (section !== 'queue') setIsWaitingRoomOpen(false);
	}, [section]);

	function flash(msg: string) {
		setSuccessMsg(msg);
		setTimeout(() => setSuccessMsg(''), 3000);
	}

	// ── Cargar slots disponibles al seleccionar médico y fecha ──
	// Se dispara solo cuando ambos campos tienen valor, evitando requests vacíos
	useEffect(() => {
		if (!booking.medicoId || !booking.fecha) {
			setSlots([]);
			return;
		}
		setSlotsLoading(true);
		gqlQuery<{ availableSlots: SlotDisponible[] }>(AVAILABLE_SLOTS_QUERY, {
			medicoId: booking.medicoId,
			fecha: new Date(booking.fecha).toISOString(),
		})
			.then((r) => setSlots(r.availableSlots))
			.catch(() => setSlots([]))
			.finally(() => setSlotsLoading(false));
	}, [booking.medicoId, booking.fecha]);

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
			setAppointments((prev) => [res.createAppoinment, ...prev]);
			setBooking({ medicoId: '', fecha: '', slot: '', motivo: '' });
			setSlots([]);
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error');
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: cancelar cita ──
	async function handleCancelAppointment(id: string) {
		setActionLoading(`cancel-${id}`);
		setError('');
		try {
			await gqlMutation(CANCEL_APPOINTMENT, {
				input: { id, motivo: 'Cancelado por el paciente' },
			});
			setAppointments((prev) =>
				prev.map((a) => (a.id === id ? { ...a, estado: 'CANCELADA' } : a)),
			);
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error');
		} finally {
			setActionLoading(null);
		}
	}

	// ─── Cita activa / turno llamado ──────────────────────────────────────────
	const calledTurnCandidate = turns.find((t) =>
		['LLAMADO', 'LLAMANDO', 'EN_ATENCION', 'EN_CURSO'].includes(t.estado),
	);
	const fallbackTurn = turns
		.filter((t) => !['ATENDIDA', 'CANCELADA'].includes(t.estado))
		.sort((a, b) => a.numeroTurno - b.numeroTurno)[0];
	const currentCalledTurn = calledTurnCandidate ?? fallbackTurn;

	const isOverview = !section || section === 'overview';
	const showAppointments = isOverview || section === 'appointments';
	const showQueue = isOverview || section === 'queue';
	const showAi = section === 'ai';
	const showGame = section === 'queue' && isWaitingRoomOpen;
	const showHistorial = section === 'historial';
	const showQueueList = showQueue && !(section === 'queue' && showGame);
	const headerSubtitle =
		section === 'ai'
			? m.dashboardPatientAiHeaderSubtitle({}, { locale })
			: m.authRegisterRolePatientDescription({}, { locale });

	// ─── Sección de citas con formulario de agendado ──────────────────────────

	function AppointmentBookingForm() {
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
					{/* Paso 1: seleccionar médico */}
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground">
							{m.dashboardPatientSelectDoctor({}, { locale })}
						</label>
						<Select
							value={booking.medicoId}
							onValueChange={(v) =>
								setBooking((prev) => ({ ...prev, medicoId: v ?? '', slot: '' }))
							}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={
										locale === 'es' ? 'Seleccionar médico' : 'Select doctor'
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{doctors.map((d) => (
									<SelectItem key={d.id} value={d.id}>
										{d.nombre} {d.apellido}
										{d.consultorio ? ` — ${d.consultorio}` : ''}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Paso 2: seleccionar fecha */}
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground">
							{locale === 'es' ? 'Fecha' : 'Date'}
						</label>
						<Input
							type="date"
							value={booking.fecha}
							min={new Date().toISOString().split('T')[0]}
							onChange={(e) =>
								setBooking((prev) => ({
									...prev,
									fecha: e.target.value,
									slot: '',
								}))
							}
						/>
					</div>

					{/* Paso 3: seleccionar slot disponible — se carga automáticamente */}
					{booking.medicoId && booking.fecha && (
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground">
								{m.dashboardPatientSelectSlot({}, { locale })}
							</label>
							{slotsLoading ? (
								<Skeleton className="h-9 rounded-md" />
							) : slots.length === 0 ? (
								<p className="text-xs text-muted-foreground">
									{locale === 'es'
										? 'No hay horarios disponibles para esta fecha'
										: 'No available slots for this date'}
								</p>
							) : (
								<Select
									value={booking.slot}
									onValueChange={(v) =>
										setBooking((prev) => ({ ...prev, slot: v ?? '' }))
									}
								>
									<SelectTrigger>
										<SelectValue
											placeholder={
												locale === 'es'
													? 'Seleccionar horario'
													: 'Select time slot'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{slots.map((s) => (
											<SelectItem key={s.inicio} value={s.inicio}>
												{new Date(s.inicio).toLocaleTimeString(locale, {
													hour: '2-digit',
													minute: '2-digit',
												})}{' '}
												—{' '}
												{new Date(s.fin).toLocaleTimeString(locale, {
													hour: '2-digit',
													minute: '2-digit',
												})}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</div>
					)}

					{/* Motivo de la consulta */}
					<div className="space-y-1">
						<label className="text-xs font-medium text-muted-foreground">
							{m.dashboardPatientMotivo({}, { locale })}
						</label>
						<Input
							value={booking.motivo}
							onChange={(e) =>
								setBooking((prev) => ({ ...prev, motivo: e.target.value }))
							}
							placeholder={m.dashboardPatientMotivoPlaceholder({}, { locale })}
						/>
					</div>

					<Button
						type="button"
						onClick={handleBook}
						disabled={
							actionLoading === 'book' ||
							!booking.medicoId ||
							!booking.slot
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

	// ─── Shell y render principal ─────────────────────────────────────────────

	return (
		<RoleDashboardShell
			title={m.authRolePatient({}, { locale })}
			subtitle={headerSubtitle}
			showCardIdentity={section !== 'queue'}
			headerAction={
				!showGame && section !== 'ai' ? (
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
						[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)
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
			{(showAppointments || (showQueue && !showGame)) && (
				<div
					className={`grid gap-4 ${
						showAppointments && showQueue ? 'lg:grid-cols-2' : ''
					}`}
				>
					{showAppointments && (
						<section className="space-y-3 rounded-xl border border-border/70 p-3">
							<h3 className="text-sm font-semibold text-foreground">
								{m.dashboardSidebarAppointments({}, { locale })}
							</h3>

							{/* Formulario de agendar cita — solo en sección appointments, no en overview */}
							{section === 'appointments' && (
								<AppointmentBookingForm />
							)}

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
									{(isOverview
										? appointments.slice(0, 4)
										: appointments
									).map((a) => {
										const canCancel =
											a.estado === 'PENDIENTE' || a.estado === 'CONFIRMADA';
										return (
											<li
												key={a.id}
												className="rounded-lg bg-muted/30 p-2"
											>
												<div className="flex items-start justify-between gap-2">
													<div className="min-w-0">
														<div className="flex items-center gap-2">
															<span className="text-xs text-muted-foreground truncate">
																{a.id}
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
																: m.dashboardPatientCancelAction({}, { locale })}
														</Button>
													)}
												</div>
											</li>
										);
									})}
								</ul>
							)}
						</section>
					)}

					{showQueue && !showGame && (
						<section className="space-y-3 rounded-xl border border-border/70 p-3">
							<h3 className="text-sm font-semibold text-foreground">
								{m.dashboardSidebarQueue({}, { locale })}
							</h3>

							{/* Botón de sala de espera con juego interactivo */}
							{section === 'queue' && (
								<div className="rounded-xl border border-border/70 bg-muted/20 p-3">
									<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<h4 className="text-sm font-semibold text-foreground">
												{m.dashboardPatientWaitingRoomTitle({}, { locale })}
											</h4>
											<p className="text-xs text-muted-foreground">
												{m.dashboardPatientWaitingRoomDescription({}, { locale })}
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
												<p className="text-xs text-muted-foreground">{t.tipo}</p>
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
						<div className="rounded-xl border border-border/70 bg-muted/20 p-3 xl:sticky xl:top-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								{m.dashboardPatientCalledTurnLabel({}, { locale })}
							</p>
							<p className="mt-2 text-2xl font-bold tabular-nums text-primary">
								{currentCalledTurn ? `#${currentCalledTurn.numeroTurno}` : '--'}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{currentCalledTurn
									? `${currentCalledTurn.tipo} - ${currentCalledTurn.estado}`
									: m.dashboardPatientNoCalledTurnInfo({}, { locale })}
							</p>
							<Button
								type="button"
								variant="outline"
								onClick={loadData}
								disabled={loading}
								size="sm"
								className="mt-3 w-full"
							>
								<ArrowPathIcon className="mr-2 h-4 w-4" />
								{m.dashboardPatientsRefresh({}, { locale })}
							</Button>
						</div>
					</div>
				</section>
			)}

			{showAi && <PatientAiSection locale={locale} />}
		</RoleDashboardShell>
	);
}

// Daniel Useche
