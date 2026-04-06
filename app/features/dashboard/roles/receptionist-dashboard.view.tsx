import {
	ArrowPathIcon,
	CalendarDaysIcon,
	CheckCircleIcon,
	ClockIcon,
	PlusIcon,
	QueueListIcon,
	UserGroupIcon,
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
import type { RoleViewProps } from './dashboard-role.types';
import { RoleDashboardShell } from './role-dashboard-shell';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Turno {
	id: string;
	numeroTurno: number;
	tipo: string;
	estado: string;
}

interface Appointment {
	id: string;
	fechaHora: string;
	estado: string;
	motivo: string | null;
	pacienteId: string;
	medicoId: string;
}

interface Patient {
	id: string;
	nombre: string;
	apellido: string;
}

// ─── Queries & Mutations ──────────────────────────────────────────────────────

const RECEPTIONIST_QUERY = `
	query ReceptionistDashboard {
		turnosPorHospital {
			id
			numeroTurno
			tipo
			estado
		}
		appointments: appoinments {
			id
			fechaHora
			estado
			motivo
			pacienteId
			medicoId
		}
	}
`;

// Traer pacientes para el formulario de crear turno
const PATIENTS_QUERY = `
	query ReceptionistPatients {
		patients {
			id
			nombre
			apellido
		}
	}
`;

// Crear turno nuevo en la cola del hospital
const CREATE_TURN = `
	mutation CreateTurn($input: CreateTurnInput!) {
		crearTurno(input: $input) {
			id
			numeroTurno
			tipo
			estado
		}
	}
`;

// Llamar al siguiente turno en espera
const CALL_NEXT = `
	mutation CallNext {
		llamarSiguienteTurno { id numeroTurno estado }
	}
`;

// Marcar turno como atendido
const ATTEND_TURN = `
	mutation AttendTurn($id: ID!) {
		atenderTurno(id: $id) { id estado }
	}
`;

// Cancelar turno
const CANCEL_TURN = `
	mutation CancelTurn($id: ID!) {
		cancelarTurno(id: $id) { id estado }
	}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function appointmentVariant(
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
		case 'ATENDIDO':
			return m.dashboardStatusAttended({}, { locale });
		case 'EN_ESPERA':
			return m.dashboardStatusWaiting({}, { locale });
		case 'EN_CONSULTA':
			return m.dashboardStatusInConsultation({}, { locale });
		default:
			return estado;
	}
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ReceptionistDashboardView({
	locale,
	section = 'overview',
	selectedHospitalId,
}: RoleViewProps) {
	const [turns, setTurns] = useState<Turno[]>([]);
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [patients, setPatients] = useState<Patient[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState('');

	// Formulario para crear turno nuevo
	const [newTurn, setNewTurn] = useState({
		pacienteId: '',
		tipo: 'NORMAL' as 'NORMAL' | 'PRIORITARIO' | 'URGENTE',
	});

	const loadMainData = useCallback(async () => {
		const main = await gqlQuery<{
			turnosPorHospital: Turno[];
			appointments: Appointment[];
		}>(RECEPTIONIST_QUERY);
		setTurns(main.turnosPorHospital);
		setAppointments(main.appointments);
		return main;
	}, []);

	const loadData = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const [, patientsRes] = await Promise.all([
				loadMainData(),
				// Cargar pacientes solo para la sección de crear turnos
				section === 'queue'
					? gqlQuery<{ patients: Patient[] }>(PATIENTS_QUERY)
					: Promise.resolve({ patients: [] as Patient[] }),
			]);
			setPatients(patientsRes.patients);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.rootErrorUnexpected({}, { locale }),
			);
		} finally {
			setLoading(false);
		}
	}, [loadMainData, locale, section]);

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
				await loadMainData();
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
	}, [loadMainData, locale, section]);

	function flash(msg: string) {
		setSuccessMsg(msg);
		setTimeout(() => setSuccessMsg(''), 3000);
	}

	// KPIs derivados
	const queueCount = turns.length;
	const pendingAppointments = useMemo(
		() => appointments.filter((a) => a.estado === 'PENDIENTE').length,
		[appointments],
	);
	const waitingTurns = useMemo(
		() => turns.filter((t) => t.estado === 'EN_ESPERA').length,
		[turns],
	);
	const currentTurn = useMemo(
		() =>
			[...turns]
				.filter((t) => t.estado === 'EN_CONSULTA')
				.sort((a, b) => b.numeroTurno - a.numeroTurno)[0],
		[turns],
	);
	const turnHistory = useMemo(
		() =>
			[...turns]
				.filter((t) => t.estado === 'ATENDIDO' || t.estado === 'CANCELADO')
				.sort((a, b) => b.numeroTurno - a.numeroTurno)
				.slice(0, 6),
		[turns],
	);
	const selectedPatientLabel = useMemo(() => {
		if (!newTurn.pacienteId) return '';
		const patient = patients.find((p) => p.id === newTurn.pacienteId);
		if (!patient) return '';
		return `${patient.nombre} ${patient.apellido}`.trim();
	}, [newTurn.pacienteId, patients]);

	// ── Acción: crear turno ──
	async function handleCreateTurn() {
		if (!newTurn.pacienteId || !selectedHospitalId) return;
		setActionLoading('create-turn');
		setError('');
		try {
			// hospitalId es obligatorio en CreateTurnInput — sin él el backend devuelve 400
			const res = await gqlMutation<{ crearTurno: Turno }>(CREATE_TURN, {
				input: {
					pacienteId: newTurn.pacienteId,
					tipo: newTurn.tipo,
					hospitalId: selectedHospitalId,
				},
			});
			setTurns((prev) => [res.crearTurno, ...prev]);
			setNewTurn({ pacienteId: '', tipo: 'NORMAL' });
			flash(
				m.dashboardTurnCreated(
					{ number: String(res.crearTurno.numeroTurno) },
					{ locale },
				),
			);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: llamar siguiente turno ──
	async function handleCallNext() {
		setActionLoading('call-next');
		setError('');
		try {
			const res = await gqlMutation<{ llamarSiguienteTurno: Turno }>(
				CALL_NEXT,
				{},
			);
			if (res.llamarSiguienteTurno) {
				flash(
					m.dashboardTurnCalled(
						{ number: String(res.llamarSiguienteTurno.numeroTurno) },
						{ locale },
					),
				);
				void loadData();
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: marcar atendido ──
	async function handleAttend(id: string) {
		setActionLoading(`attend-${id}`);
		setError('');
		try {
			await gqlMutation(ATTEND_TURN, { id });
			setTurns((prev) =>
				prev.map((t) => (t.id === id ? { ...t, estado: 'ATENDIDO' } : t)),
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

	// ── Acción: cancelar turno ──
	async function handleCancelTurn(id: string) {
		setActionLoading(`cancel-${id}`);
		setError('');
		try {
			await gqlMutation(CANCEL_TURN, { id });
			setTurns((prev) =>
				prev.map((t) => (t.id === id ? { ...t, estado: 'CANCELADO' } : t)),
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

	// ─── Secciones ────────────────────────────────────────────────────────────

	function OverviewSection() {
		return (
			<div className="space-y-4">
				{/* KPIs en grid de 3 columnas */}
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div className="rounded-xl border border-border/70 bg-background/80 p-3">
						<p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
							<QueueListIcon className="h-3.5 w-3.5" />
							{m.dashboardSidebarQueue({}, { locale })}
						</p>
						<p className="text-2xl font-semibold tabular-nums text-foreground">
							{loading ? '—' : queueCount}
						</p>
					</div>
					<div className="rounded-xl border border-border/70 bg-background/80 p-3">
						<p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
							<ClockIcon className="h-3.5 w-3.5" />
							{m.dashboardStatusWaiting({}, { locale })}
						</p>
						<p className="text-2xl font-semibold tabular-nums text-foreground">
							{loading ? '—' : waitingTurns}
						</p>
					</div>
					<div className="rounded-xl border border-border/70 bg-background/80 p-3">
						<p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
							<CalendarDaysIcon className="h-3.5 w-3.5" />
							{m.dashboardSidebarAppointments({}, { locale })} (
							{m.dashboardStatusPending({}, { locale })})
						</p>
						<p className="text-2xl font-semibold tabular-nums text-foreground">
							{loading ? '—' : pendingAppointments}
						</p>
					</div>
				</div>

				{/* Acción rápida: llamar siguiente */}
				<div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3">
					<p className="text-sm font-medium text-foreground">
						{m.dashboardReceptionistCallNext({}, { locale })}
					</p>
					<Button
						type="button"
						onClick={handleCallNext}
						disabled={actionLoading === 'call-next' || waitingTurns === 0}
						className="gap-2 shrink-0"
					>
						<QueueListIcon className="h-4 w-4" />
						{actionLoading === 'call-next'
							? m.dashboardActionCreating({}, { locale })
							: m.dashboardReceptionistCallNext({}, { locale })}
					</Button>
				</div>

				{/* Preview de turnos recientes */}
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">
							{m.dashboardSidebarQueue({}, { locale })}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{loading ? (
							<Skeleton className="h-20 rounded-lg" />
						) : turns.slice(0, 6).length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{m.dashboardPatientsEmptyDescription({}, { locale })}
							</p>
						) : (
							turns
								.slice(0, 6)
								.map((t) => <TurnRow key={t.id} turn={t} compact />)
						)}
					</CardContent>
				</Card>
			</div>
		);
	}

	function AppointmentsSection() {
		return (
			<div className="space-y-2">
				{loading ? (
					[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-16 rounded-xl" />
					))
				) : appointments.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{m.dashboardPatientsEmptyDescription({}, { locale })}
					</p>
				) : (
					appointments.map((a) => (
						<div
							key={a.id}
							className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/90 p-3"
						>
							<div className="min-w-0">
								<p className="truncate text-sm font-medium text-foreground">
									{new Date(a.fechaHora).toLocaleString(locale)}
								</p>
								<p className="truncate text-xs text-muted-foreground">
									{a.motivo || a.id}
								</p>
							</div>
							<Badge variant={appointmentVariant(a.estado)}>
								{statusLabel(a.estado, locale)}
							</Badge>
						</div>
					))
				)}
			</div>
		);
	}

	function QueueSection() {
		const patientSelectId = 'receptionist-turn-patient';
		const turnTypeSelectId = 'receptionist-turn-type';

		return (
			<div className="space-y-4">
				{/* Turno actual grande + historial compacto */}
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-base">
							<QueueListIcon className="h-4 w-4" />
							{m.dashboardSidebarQueue({}, { locale })}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded-xl border border-border/60 bg-muted/20 p-3">
							<div className="flex items-center justify-between gap-2">
								<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{m.dashboardPatientCalledTurnLabel({}, { locale })}
								</p>
								<Button
									type="button"
									onClick={handleCallNext}
									disabled={actionLoading === 'call-next' || waitingTurns === 0}
									size="sm"
									className="gap-2"
								>
									<QueueListIcon className="h-4 w-4" />
									{actionLoading === 'call-next'
										? m.dashboardActionCreating({}, { locale })
										: m.dashboardReceptionistCallNext({}, { locale })}
								</Button>
							</div>
							<p className="mt-2 text-center text-3xl font-bold tabular-nums text-primary sm:text-4xl">
								{currentTurn ? `#${currentTurn.numeroTurno}` : '--'}
							</p>
							<p className="mt-1 text-center text-xs text-muted-foreground">
								{currentTurn
									? `${currentTurn.tipo} - ${statusLabel(currentTurn.estado, locale)}`
									: m.dashboardPatientNoCalledTurnInfo({}, { locale })}
							</p>
						</div>

						{turnHistory.length > 0 && (
							<div className="space-y-2 border-t border-border/60 pt-3">
								<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
									{m.dashboardSidebarHistorial({}, { locale })}
								</p>
								<ul className="space-y-1.5">
									{turnHistory.map((turn) => (
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
					</CardContent>
				</Card>

				{/* Formulario para crear turno nuevo */}
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-base">
							<UserGroupIcon className="h-4 w-4" />
							{m.dashboardReceptionistCreateTurnTitle({}, { locale })}
						</CardTitle>
						<CardDescription>
							{m.dashboardReceptionistOverviewSubtitle({}, { locale })}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid gap-3 sm:grid-cols-2">
							{/* Selector de paciente — construido desde la lista real del backend */}
							<div className="space-y-1">
								<label
									htmlFor={patientSelectId}
									className="text-xs font-medium text-muted-foreground"
								>
									{m.dashboardReceptionistSelectPatient({}, { locale })}
								</label>
								<Select
									value={newTurn.pacienteId}
									onValueChange={(v) =>
										setNewTurn((prev) => ({ ...prev, pacienteId: v ?? '' }))
									}
								>
									<SelectTrigger
										id={patientSelectId}
										className="h-10 w-full sm:w-72"
									>
										<SelectValue
											placeholder={m.dashboardReceptionistSelectPatient(
												{},
												{ locale },
											)}
										>
											{selectedPatientLabel || undefined}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{patients.map((p) => (
											<SelectItem
												key={p.id}
												value={p.id}
												label={`${p.nombre} ${p.apellido}`}
												title={`${p.nombre} ${p.apellido}`}
											>
												{p.nombre} {p.apellido}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Tipo de turno: NORMAL, PRIORITARIO, URGENTE */}
							<div className="space-y-1">
								<label
									htmlFor={turnTypeSelectId}
									className="text-xs font-medium text-muted-foreground"
								>
									{m.dashboardReceptionistTurnTypeLabel({}, { locale })}
								</label>
								<Select
									value={newTurn.tipo}
									onValueChange={(v) =>
										setNewTurn((prev) => ({
											...prev,
											tipo: v as typeof newTurn.tipo,
										}))
									}
								>
									<SelectTrigger
										id={turnTypeSelectId}
										className="h-10 w-full sm:w-72"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="NORMAL">
											{m.dashboardReceptionistTipoNormal({}, { locale })}
										</SelectItem>
										<SelectItem value="PRIORITARIO">
											{m.dashboardReceptionistTipoPrioritario({}, { locale })}
										</SelectItem>
										<SelectItem value="URGENTE">
											{m.dashboardReceptionistTipoUrgente({}, { locale })}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="flex gap-2">
							<Button
								type="button"
								onClick={handleCreateTurn}
								disabled={
									actionLoading === 'create-turn' || !newTurn.pacienteId
								}
								className="gap-2"
							>
								<PlusIcon className="h-4 w-4" />
								{actionLoading === 'create-turn'
									? m.dashboardActionCreating({}, { locale })
									: m.dashboardReceptionistCreateTurn({}, { locale })}
							</Button>

							<Button
								type="button"
								variant="outline"
								onClick={handleCallNext}
								disabled={actionLoading === 'call-next' || waitingTurns === 0}
								className="gap-2"
							>
								<QueueListIcon className="h-4 w-4" />
								{actionLoading === 'call-next'
									? m.dashboardActionCreating({}, { locale })
									: m.dashboardReceptionistCallNext({}, { locale })}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Lista completa de turnos con acciones */}
				<div className="space-y-2">
					{loading ? (
						[1, 2, 3, 4, 5].map((i) => (
							<Skeleton key={i} className="h-20 rounded-xl" />
						))
					) : turns.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{m.dashboardPatientsEmptyDescription({}, { locale })}
						</p>
					) : (
						turns.map((t) => (
							<TurnRow
								key={t.id}
								turn={t}
								onAttend={() => handleAttend(t.id)}
								onCancel={() => handleCancelTurn(t.id)}
								attending={actionLoading === `attend-${t.id}`}
								cancelling={actionLoading === `cancel-${t.id}`}
							/>
						))
					)}
				</div>
			</div>
		);
	}

	// ─── Subcomponente de fila de turno ──────────────────────────────────────

	function TurnRow({
		turn: t,
		compact = false,
		onAttend,
		onCancel,
		attending = false,
		cancelling = false,
	}: {
		turn: Turno;
		compact?: boolean;
		onAttend?: () => void;
		onCancel?: () => void;
		attending?: boolean;
		cancelling?: boolean;
	}) {
		// Solo mostrar acciones para turnos activos (en espera o en consulta)
		const isActive = t.estado === 'EN_ESPERA' || t.estado === 'EN_CONSULTA';

		return (
			<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/90 p-3">
				<div>
					<p className="flex items-center gap-1 text-sm font-semibold text-foreground">
						<QueueListIcon className="h-4 w-4 text-muted-foreground" />#
						{t.numeroTurno}
					</p>
					<p className="flex items-center gap-1 text-xs text-muted-foreground">
						<ClockIcon className="h-3.5 w-3.5" />
						{t.tipo}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={turnVariant(t.estado)}>
						{statusLabel(t.estado, locale)}
					</Badge>
					{!compact && isActive && (
						<>
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
							<Button
								type="button"
								size="sm"
								variant="destructive"
								onClick={onCancel}
								disabled={cancelling}
								className="gap-1 text-xs"
							>
								<XCircleIcon className="h-3.5 w-3.5" />
								{cancelling
									? '...'
									: m.dashboardReceptionistCancelTurn({}, { locale })}
							</Button>
						</>
					)}
				</div>
			</div>
		);
	}

	// ─── Shell principal ──────────────────────────────────────────────────────

	const sectionTitles: Record<string, string> = {
		overview: m.dashboardReceptionistOverviewTitle({}, { locale }),
		appointments: m.dashboardSidebarAppointments({}, { locale }),
		queue: m.dashboardSidebarQueue({}, { locale }),
	};

	function renderSection() {
		switch (section) {
			case 'overview':
				return OverviewSection();
			case 'appointments':
				return AppointmentsSection();
			case 'queue':
				return QueueSection();
			default:
				return OverviewSection();
		}
	}

	return (
		<RoleDashboardShell
			title={sectionTitles[section] ?? m.authRoleReceptionist({}, { locale })}
			subtitle={m.dashboardReceptionistOverviewSubtitle({}, { locale })}
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
			{renderSection()}
		</RoleDashboardShell>
	);
}

// Daniel Useche
