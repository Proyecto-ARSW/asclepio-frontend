import {
	ArrowPathIcon,
	CalendarDaysIcon,
	CheckCircleIcon,
	ClipboardDocumentListIcon,
	ClockIcon,
	PlusIcon,
	TrashIcon,
	XCircleIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { gqlMutation, gqlQuery } from '@/lib/graphql-client';
import type { DashboardSection, RoleViewProps } from './dashboard-role.types';
import { RoleDashboardShell } from './role-dashboard-shell';

// ─── Tipos GraphQL ────────────────────────────────────────────────────────────

interface DoctorProfile {
	id: string;
	usuarioId: string;
	especialidadId: number;
	consultorio: string | null;
}

interface Appointment {
	id: string;
	fechaHora: string;
	estado: string;
	motivo: string | null;
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

// ─── Queries & Mutations ──────────────────────────────────────────────────────

const DOCTOR_PROFILE_QUERY = `
	query DoctorProfile {
		doctors {
			id
			usuarioId
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

// ─── Componente principal ─────────────────────────────────────────────────────

export function DoctorDashboardView({
	user,
	locale,
	section = 'overview',
}: RoleViewProps) {
	const [doctorId, setDoctorId] = useState<string | null>(null);
	const [missingProfile, setMissingProfile] = useState(false);
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([]);
	const [historial, setHistorial] = useState<HistorialEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState('');

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
		const mine = doctors.doctors.find((d) => d.usuarioId === user.id);
		if (!mine) {
			setMissingProfile(true);
			return null;
		}
		setDoctorId(mine.id);
		return mine;
	}, [user.id]);

	const loadAppointments = useCallback(
		async (id: string) => {
			const res = await gqlQuery<{ appoinmentsByDoctor: Appointment[] }>(
				DOCTOR_APPOINTMENTS_QUERY,
				{ medicoId: id },
			);
			setAppointments(res.appoinmentsByDoctor);
		},
		[],
	);

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

	const loadData = useCallback(async () => {
		setLoading(true);
		setError('');
		setMissingProfile(false);
		try {
			const profile = await loadProfile();
			if (!profile) return;
			// Carga paralela según sección — evita waterfall de requests
			await Promise.all([
				section === 'overview' || section === 'appointments'
					? loadAppointments(profile.id)
					: Promise.resolve(),
				section === 'overview' || section === 'disponibilidad'
					? loadDisponibilidad(profile.id)
					: Promise.resolve(),
				section === 'historial' ? loadHistorial(profile.id) : Promise.resolve(),
			]);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al cargar datos');
		} finally {
			setLoading(false);
		}
	}, [
		loadProfile,
		loadAppointments,
		loadDisponibilidad,
		loadHistorial,
		section,
	]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	// ── KPIs del overview ──
	const today = new Date().toDateString();
	const kpiToday = useMemo(
		() =>
			appointments.filter(
				(a) => new Date(a.fechaHora).toDateString() === today,
			).length,
		[appointments, today],
	);
	const kpiPending = useMemo(
		() => appointments.filter((a) => a.estado === 'PENDIENTE').length,
		[appointments],
	);

	// ── Acción: confirmar cita ──
	async function handleConfirm(id: string) {
		setActionLoading(id);
		setError('');
		try {
			await gqlMutation(CONFIRM_APPOINTMENT, {
				input: { id, estado: 'CONFIRMADA' },
			});
			setAppointments((prev) =>
				prev.map((a) => (a.id === id ? { ...a, estado: 'CONFIRMADA' } : a)),
			);
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error');
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: cancelar cita ──
	async function handleCancel(id: string) {
		setActionLoading(id + '-cancel');
		setError('');
		try {
			await gqlMutation(CANCEL_APPOINTMENT, {
				input: { id, motivo: 'Cancelado por el médico' },
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

	// ── Acción: agregar bloque de disponibilidad ──
	async function handleAddSlot() {
		if (!doctorId) return;
		setActionLoading('new-slot');
		setError('');
		try {
			const res = await gqlMutation<{ createDisponibilidad: Disponibilidad }>(
				CREATE_DISPONIBILIDAD,
				{
					input: {
						medicoId: doctorId,
						...newSlot,
					},
				},
			);
			setDisponibilidad((prev) => [...prev, res.createDisponibilidad]);
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error');
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
			setError(err instanceof Error ? err.message : 'Error');
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
				prev.map((s) =>
					s.id === slot.id ? { ...s, activo: !s.activo } : s,
				),
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error');
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
			setError(err instanceof Error ? err.message : 'Error');
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
				return <OverviewSection />;
			case 'appointments':
				return <AppointmentsSection />;
			case 'disponibilidad':
				return <DisponibilidadSection />;
			case 'historial':
				return <HistorialSection />;
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
						value={'—'}
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
							appointments.slice(0, 4).map((a) => (
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
								{m.dashboardPatientsEmptyDescription({}, { locale })}
							</p>
						) : (
							disponibilidad.slice(0, 3).map((slot) => (
								<SlotRow key={slot.id} slot={slot} compact />
							))
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
					appointments.map((a) => (
						<AppointmentRow key={a.id} appointment={a} />
					))
				)}
			</div>
		);
	}

	// ── Sección de disponibilidad con CRUD ──
	function DisponibilidadSection() {
		return (
			<div className="space-y-4">
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
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground">
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
									<SelectTrigger>
										<SelectValue />
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
								<label className="text-xs font-medium text-muted-foreground">
									{m.dashboardDoctorDisponibilidadHoraInicio({}, { locale })}
								</label>
								<Input
									type="time"
									value={newSlot.horaInicio}
									onChange={(e) =>
										setNewSlot((prev) => ({
											...prev,
											horaInicio: e.target.value,
										}))
									}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground">
									{m.dashboardDoctorDisponibilidadHoraFin({}, { locale })}
								</label>
								<Input
									type="time"
									value={newSlot.horaFin}
									onChange={(e) =>
										setNewSlot((prev) => ({
											...prev,
											horaFin: e.target.value,
										}))
									}
								/>
							</div>
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground">
									{m.dashboardDoctorDisponibilidadDuracion({}, { locale })}
								</label>
								<Input
									type="number"
									min={10}
									max={120}
									step={5}
									value={newSlot.duracionCita}
									onChange={(e) =>
										setNewSlot((prev) => ({
											...prev,
											duracionCita: Number(e.target.value),
										}))
									}
								/>
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
							{m.dashboardPatientsEmptyDescription({}, { locale })}
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
		// Construir lista de pacientes únicos desde las citas del médico
		// para el selector del formulario de historial
		const patientOptions = useMemo(
			() =>
				[...new Map(appointments.map((a) => [a.pacienteId, a])).values()],
			[],
		);

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
							<label className="text-xs font-medium text-muted-foreground">
								{m.dashboardPatientSelectDoctor({}, { locale })}
							</label>
							<Select
								value={newHistorial.pacienteId}
								onValueChange={(v) =>
									setNewHistorial((prev) => ({ ...prev, pacienteId: v ?? '' }))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccionar paciente" />
								</SelectTrigger>
								<SelectContent>
									{patientOptions.map((a) => (
										<SelectItem key={a.pacienteId} value={a.pacienteId}>
											{a.pacienteId}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<label className="text-xs font-medium text-muted-foreground">
								{m.dashboardDoctorHistorialDiagnostico({}, { locale })}
							</label>
							<Input
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
							<label className="text-xs font-medium text-muted-foreground">
								{m.dashboardDoctorHistorialTratamiento({}, { locale })}
							</label>
							<Input
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
							<label className="text-xs font-medium text-muted-foreground">
								{m.dashboardDoctorHistorialObservaciones({}, { locale })}
							</label>
							<Input
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
									onClick={() => handleConfirm(a.id)}
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
									disabled={actionLoading === a.id + '-cancel'}
									className="gap-1 text-xs"
								>
									<XCircleIcon className="h-3.5 w-3.5" />
									{actionLoading === a.id + '-cancel'
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
							{dayLabel(slot.diaSemana, locale)} — {slot.horaInicio} -{' '}
							{slot.horaFin}
						</p>
						<p className="text-xs text-muted-foreground">
							{slot.duracionCita} min / cita
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
									: m.dashboardDoctorDisponibilidadToggleActive(
											{},
											{ locale },
										)}
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

	// ─── Shell principal ──────────────────────────────────────────────────────

	const sectionTitles: Partial<Record<DashboardSection, string>> = {
		overview: m.dashboardDoctorOverviewTitle({}, { locale }),
		appointments: m.dashboardSidebarAppointments({}, { locale }),
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
