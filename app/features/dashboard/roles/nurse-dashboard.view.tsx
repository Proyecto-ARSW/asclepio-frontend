import {
	ArrowPathIcon,
	CheckCircleIcon,
	ClockIcon,
	QueueListIcon,
	XCircleIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
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
import { RoleDashboardShell } from './role-dashboard-shell';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface NurseProfile {
	id: string;
	usuarioId: string;
	nivelFormacion: number;
	certificacionTriage: boolean;
}

interface Disponibilidad {
	id: number;
	diaSemana: number;
	horaInicio: string;
	horaFin: string;
	activo: boolean;
}

interface Turno {
	id: string;
	numeroTurno: number;
	tipo: string;
	estado: string;
}

// ─── Queries & Mutations ──────────────────────────────────────────────────────

const NURSE_PROFILE_QUERY = `
	query NurseProfile {
		nurses {
			id
			usuarioId
			nivelFormacion
			certificacionTriage
		}
	}
`;

const NURSE_AVAILABILITY_QUERY = `
	query NurseAvailability($enfermeroId: ID!) {
		disponibilidadesByNurse(enfermeroId: $enfermeroId) {
			id
			diaSemana
			horaInicio
			horaFin
			activo
		}
	}
`;

const HOSPITAL_TURNS_QUERY = `
	query HospitalTurnsNurse {
		turnosPorHospital(estado: EN_ESPERA) {
			id
			numeroTurno
			tipo
			estado
		}
	}
`;

const CREATE_DISPONIBILIDAD_ENFERMERO = `
	mutation CreateDisponibilidadEnfermero($input: CreateDisponibilidadEnfermeroInput!) {
		createDisponibilidadEnfermero(input: $input) {
			id
			diaSemana
			horaInicio
			horaFin
			activo
		}
	}
`;

const REMOVE_DISPONIBILIDAD_ENFERMERO = `
	mutation RemoveDisponibilidadEnfermero($id: Int!) {
		removeDisponibilidadEnfermero(id: $id) { id }
	}
`;

// Llamar el siguiente turno en la cola (el enfermero puede gestionar turnos)
const CALL_NEXT_TURN = `
	mutation CallNextTurn {
		llamarSiguienteTurno { id numeroTurno estado }
	}
`;

const ATTEND_TURN = `
	mutation AttendTurn($id: ID!) {
		atenderTurno(id: $id) { id estado }
	}
`;

const CANCEL_TURN = `
	mutation CancelTurn($id: ID!) {
		cancelarTurno(id: $id) { id estado }
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

function dayLabel(day: number, locale: 'es' | 'en') {
	return locale === 'es' ? (DAYS_ES[day] ?? day) : (DAYS_EN[day] ?? day);
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

function turnLabel(estado: string, locale: 'es' | 'en') {
	switch (estado) {
		case 'EN_ESPERA':
			return locale === 'es' ? 'En espera' : 'Waiting';
		case 'EN_CONSULTA':
			return locale === 'es' ? 'En consulta' : 'In consultation';
		case 'ATENDIDO':
			return m.dashboardStatusAttended({}, { locale });
		case 'CANCELADO':
			return m.dashboardStatusCancelled({}, { locale });
		default:
			return estado;
	}
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function NurseDashboardView({ user, locale, section = 'overview' }: RoleViewProps) {
	const [nurseId, setNurseId] = useState<string | null>(null);
	const [missingProfile, setMissingProfile] = useState(false);
	const [availability, setAvailability] = useState<Disponibilidad[]>([]);
	const [turns, setTurns] = useState<Turno[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState('');

	// Formulario nuevo bloque de disponibilidad
	const [newSlot, setNewSlot] = useState({
		diaSemana: 1,
		horaInicio: '07:00',
		horaFin: '15:00',
	});

	const loadProfile = useCallback(async () => {
		const res = await gqlQuery<{ nurses: NurseProfile[] }>(NURSE_PROFILE_QUERY);
		const mine = res.nurses.find((n) => n.usuarioId === user.id);
		if (!mine) { setMissingProfile(true); return null; }
		setNurseId(mine.id);
		return mine;
	}, [user.id]);

	const loadData = useCallback(async () => {
		setLoading(true);
		setError('');
		setMissingProfile(false);
		try {
			const profile = await loadProfile();
			if (!profile) return;

			// Cargar datos según la sección activa para evitar requests innecesarios
			await Promise.all([
				(section === 'overview' || section === 'disponibilidad')
					? gqlQuery<{ disponibilidadesByNurse: Disponibilidad[] }>(
							NURSE_AVAILABILITY_QUERY,
							{ enfermeroId: profile.id },
						).then((r) => setAvailability(r.disponibilidadesByNurse))
					: Promise.resolve(),
				(section === 'overview' || section === 'queue')
					? gqlQuery<{ turnosPorHospital: Turno[] }>(HOSPITAL_TURNS_QUERY)
							.then((r) => setTurns(r.turnosPorHospital))
					: Promise.resolve(),
			]);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al cargar datos');
		} finally {
			setLoading(false);
		}
	}, [loadProfile, section]);

	useEffect(() => { void loadData(); }, [loadData]);

	function flash(msg: string) {
		setSuccessMsg(msg);
		setTimeout(() => setSuccessMsg(''), 3000);
	}

	// ── Acción: agregar disponibilidad ──
	async function handleAddSlot() {
		if (!nurseId) return;
		setActionLoading('new-slot');
		setError('');
		try {
			const res = await gqlMutation<{ createDisponibilidadEnfermero: Disponibilidad }>(
				CREATE_DISPONIBILIDAD_ENFERMERO,
				{ input: { enfermeroId: nurseId, ...newSlot } },
			);
			setAvailability((prev) => [...prev, res.createDisponibilidadEnfermero]);
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error');
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: eliminar disponibilidad ──
	async function handleDeleteSlot(id: number) {
		setActionLoading(`del-${id}`);
		setError('');
		try {
			await gqlMutation(REMOVE_DISPONIBILIDAD_ENFERMERO, { id });
			setAvailability((prev) => prev.filter((s) => s.id !== id));
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error');
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: llamar siguiente turno ──
	async function handleCallNext() {
		setActionLoading('call-next');
		setError('');
		try {
			const res = await gqlMutation<{ llamarSiguienteTurno: Turno }>(CALL_NEXT_TURN, {});
			if (res.llamarSiguienteTurno) {
				flash(`Turno #${res.llamarSiguienteTurno.numeroTurno} llamado`);
				void loadData();
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error');
		} finally {
			setActionLoading(null);
		}
	}

	// ── Acción: marcar turno como atendido ──
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
			setError(err instanceof Error ? err.message : 'Error');
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
			setError(err instanceof Error ? err.message : 'Error');
		} finally {
			setActionLoading(null);
		}
	}

	// ─── Secciones ────────────────────────────────────────────────────────────

	function OverviewSection() {
		return (
			<div className="space-y-4">
				{/* KPIs: bloques de disponibilidad + turnos en espera */}
				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-xl border border-border/70 bg-background/80 p-3">
						<p className="text-xs text-muted-foreground">
							{m.dashboardNurseKpiAvailability({}, { locale })}
						</p>
						<p className="text-2xl font-semibold tabular-nums text-foreground">
							{loading ? '—' : availability.length}
						</p>
					</div>
					<div className="rounded-xl border border-border/70 bg-background/80 p-3">
						<p className="text-xs text-muted-foreground">
							{m.dashboardNurseKpiTurns({}, { locale })}
						</p>
						<p className="text-2xl font-semibold tabular-nums text-foreground">
							{loading ? '—' : turns.filter((t) => t.estado === 'EN_ESPERA').length}
						</p>
					</div>
				</div>

				{/* Vista rápida de turnos */}
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">
							{m.dashboardNurseQueueTitle({}, { locale })}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{loading ? (
							<Skeleton className="h-16 rounded-lg" />
						) : turns.slice(0, 5).length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{m.dashboardPatientsEmptyDescription({}, { locale })}
							</p>
						) : (
							turns.slice(0, 5).map((t) => (
								<TurnRow key={t.id} turn={t} compact />
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
						) : availability.slice(0, 3).length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{m.dashboardPatientsEmptyDescription({}, { locale })}
							</p>
						) : (
							availability.slice(0, 3).map((slot) => (
								<SlotRow key={slot.id} slot={slot} compact />
							))
						)}
					</CardContent>
				</Card>
			</div>
		);
	}

	function DisponibilidadSection() {
		return (
			<div className="space-y-4">
				{/* Formulario para agregar disponibilidad */}
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
						<div className="grid gap-3 sm:grid-cols-3">
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground">
									{m.dashboardDoctorDisponibilidadDia({}, { locale })}
								</label>
								<Select
									value={String(newSlot.diaSemana)}
									onValueChange={(v) =>
										setNewSlot((prev) => ({ ...prev, diaSemana: Number(v) }))
									}
								>
									<SelectTrigger><SelectValue /></SelectTrigger>
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
										setNewSlot((prev) => ({ ...prev, horaInicio: e.target.value }))
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
										setNewSlot((prev) => ({ ...prev, horaFin: e.target.value }))
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
							{actionLoading === 'new-slot'
								? m.dashboardActionSaving({}, { locale })
								: m.dashboardDoctorDisponibilidadSave({}, { locale })}
						</Button>
					</CardContent>
				</Card>

				{/* Lista de bloques */}
				<div className="space-y-2">
					{loading ? (
						[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)
					) : availability.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{missingProfile
								? m.dashboardNurseMissingProfile({}, { locale })
								: m.dashboardPatientsEmptyDescription({}, { locale })}
						</p>
					) : (
						availability.map((slot) => (
							<SlotRow
								key={slot.id}
								slot={slot}
								onDelete={() => handleDeleteSlot(slot.id)}
								deleting={actionLoading === `del-${slot.id}`}
							/>
						))
					)}
				</div>
			</div>
		);
	}

	function QueueSection() {
		return (
			<div className="space-y-4">
				{/* Acción global: llamar siguiente turno */}
				<div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3">
					<div>
						<p className="text-sm font-semibold text-foreground">
							{m.dashboardNurseQueueTitle({}, { locale })}
						</p>
						<p className="text-xs text-muted-foreground">
							{m.dashboardNurseQueueSubtitle({}, { locale })}
						</p>
					</div>
					<Button
						type="button"
						onClick={handleCallNext}
						disabled={actionLoading === 'call-next'}
						className="gap-2 shrink-0"
					>
						<QueueListIcon className="h-4 w-4" />
						{actionLoading === 'call-next'
							? m.dashboardActionCreating({}, { locale })
							: m.dashboardNurseCallNext({}, { locale })}
					</Button>
				</div>

				{/* Lista de turnos con acciones */}
				<div className="space-y-2">
					{loading ? (
						[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)
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

	// ─── Subcomponentes de fila ───────────────────────────────────────────────

	function SlotRow({
		slot,
		compact = false,
		onDelete,
		deleting = false,
	}: {
		slot: Disponibilidad;
		compact?: boolean;
		onDelete?: () => void;
		deleting?: boolean;
	}) {
		return (
			<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/90 p-3">
				<div className="flex items-center gap-3">
					<ClockIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
					<div>
						<p className="text-sm font-medium text-foreground">
							{dayLabel(slot.diaSemana, locale)} — {slot.horaInicio} - {slot.horaFin}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={slot.activo ? 'default' : 'outline'}>
						{slot.activo
							? m.dashboardHospitalStatusActive({}, { locale })
							: m.dashboardHospitalStatusInactive({}, { locale })}
					</Badge>
					{!compact && onDelete && (
						<Button
							type="button"
							size="sm"
							variant="destructive"
							onClick={onDelete}
							disabled={deleting}
							className="text-xs"
						>
							{deleting ? '...' : m.dashboardDoctorDisponibilidadDelete({}, { locale })}
						</Button>
					)}
				</div>
			</div>
		);
	}

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
		const isActive = t.estado === 'EN_ESPERA' || t.estado === 'EN_CONSULTA';
		return (
			<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/90 p-3">
				<div>
					<p className="text-sm font-semibold text-foreground">
						#{t.numeroTurno}
					</p>
					<p className="text-xs text-muted-foreground">{t.tipo}</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={turnVariant(t.estado)}>
						{turnLabel(t.estado, locale)}
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
									: m.dashboardNurseAttendTurn({}, { locale })}
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
									: m.dashboardNurseCancelTurn({}, { locale })}
							</Button>
						</>
					)}
				</div>
			</div>
		);
	}

	// ─── Shell principal ──────────────────────────────────────────────────────

	const sectionTitles: Record<string, string> = {
		overview: m.dashboardNurseOverviewTitle({}, { locale }),
		disponibilidad: m.dashboardDoctorDisponibilidadTitle({}, { locale }),
		queue: m.dashboardNurseQueueTitle({}, { locale }),
	};

	function renderSection() {
		switch (section) {
			case 'overview':
				return <OverviewSection />;
			case 'disponibilidad':
				return <DisponibilidadSection />;
			case 'queue':
				return <QueueSection />;
			default:
				return <OverviewSection />;
		}
	}

	return (
		<RoleDashboardShell
			title={sectionTitles[section] ?? m.authRoleNurse({}, { locale })}
			subtitle={m.dashboardNurseOverviewSubtitle({}, { locale })}
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
					{m.dashboardNurseMissingProfile({}, { locale })}
				</p>
			) : (
				renderSection()
			)}
		</RoleDashboardShell>
	);
}

// Daniel Useche
