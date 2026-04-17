import {
	ArrowPathIcon,
	BeakerIcon,
	CheckCircleIcon,
	ClockIcon,
	PlusIcon,
	QueueListIcon,
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
	stockMinimo?: number;
	disponibilidad: string;
	precio?: string;
}

interface SedeItem {
	id: number;
	nombre: string;
	direccion?: string;
	ciudad?: string;
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
		turnosPorHospital {
			id
			numeroTurno
			tipo
			estado
		}
	}
`;

const HOSPITAL_TURNS_BY_HOSPITAL_QUERY = `
	query HospitalTurnsNurseByHospital($hospitalId: Int!) {
		turnosPorHospital(hospitalId: $hospitalId) {
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

const CALL_NEXT_TURN_BY_HOSPITAL = `
	mutation CallNextTurnByHospital($hospitalId: Int!) {
		llamarSiguienteTurno(hospitalId: $hospitalId) { id numeroTurno estado }
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

// ── Queries de inventario de medicamentos (enfermero gestiona stock por sede) ──
const MEDICINES_QUERY = `
	query NurseMedicines($busqueda: String) {
		medicines(busqueda: $busqueda) {
			id
			nombreComercial
			nombreGenerico
			presentacion
			requiereReceta
		}
	}
`;

const SEDES_QUERY = `
	query NurseSedes {
		sedes { id nombre direccion ciudad }
	}
`;

const INVENTARIO_BY_SEDE_QUERY = `
	query NurseInventarioBySede($sedeId: Int!) {
		inventarioBySede(sedeId: $sedeId) {
			id medicamentoId sedeId stockActual stockMinimo disponibilidad precio
		}
	}
`;

const CREATE_INVENTARIO = `
	mutation NurseCreateInventario($input: CreateInventarioInput!) {
		createInventario(input: $input) {
			id medicamentoId sedeId stockActual disponibilidad precio
		}
	}
`;

const UPDATE_INVENTARIO = `
	mutation NurseUpdateInventario($input: UpdateInventarioInput!) {
		updateInventario(input: $input) {
			id stockActual disponibilidad precio
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

function formatTime(t: string | Date): string {
	if (!t) return '';
	const d = new Date(t);
	if (Number.isNaN(d.getTime())) {
		return String(t).slice(0, 5);
	}
	const h = String(d.getHours()).padStart(2, '0');
	const min = String(d.getMinutes()).padStart(2, '0');
	return `${h}:${min}`;
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

function isQueueActiveTurn(estado: string) {
	return /^(EN_ESPERA|EN_CONSULTA)$/i.test(estado);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function NurseDashboardView({
	user,
	locale,
	section = 'overview',
	selectedHospitalId,
}: RoleViewProps) {
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

	// ── Estado de inventario de medicamentos ──
	const [medicines, setMedicines] = useState<MedicineItem[]>([]);
	const [sedes, setSedes] = useState<SedeItem[]>([]);
	const [inventario, setInventario] = useState<InventarioItem[]>([]);
	const [selectedSedeId, setSelectedSedeId] = useState<number | null>(null);
	const [medicinesLoading, setMedicinesLoading] = useState(false);
	const [newStock, setNewStock] = useState({
		medicamentoId: 0,
		stockActual: 0,
	});

	const loadProfile = useCallback(async () => {
		const res = await gqlQuery<{ nurses: NurseProfile[] }>(NURSE_PROFILE_QUERY);
		const normalizedUserId = String(user.id);
		const mine = res.nurses.find(
			(n) => String(n.usuarioId) === normalizedUserId,
		);
		if (!mine) {
			setMissingProfile(true);
			return null;
		}
		setNurseId(mine.id);
		return mine;
	}, [user.id]);

	const loadTurns = useCallback(async () => {
		const query = selectedHospitalId
			? gqlQuery<{ turnosPorHospital: Turno[] }>(
					HOSPITAL_TURNS_BY_HOSPITAL_QUERY,
					{
						hospitalId: selectedHospitalId,
					},
				)
			: gqlQuery<{ turnosPorHospital: Turno[] }>(HOSPITAL_TURNS_QUERY);

		const response = await query;
		const turnosPorHospital = response.turnosPorHospital ?? [];
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

			// Cargar datos según la sección activa para evitar requests innecesarios
			await Promise.all([
				section === 'overview' || section === 'disponibilidad'
					? gqlQuery<{ disponibilidadesByNurse: Disponibilidad[] }>(
							NURSE_AVAILABILITY_QUERY,
							{ enfermeroId: profile.id },
						).then((r) => setAvailability(r.disponibilidadesByNurse))
					: Promise.resolve(),
				section === 'overview' || section === 'queue'
					? loadTurns()
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
	}, [loadProfile, loadTurns, locale, section]);

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

	const actionableTurns = useMemo(
		() =>
			turns
				.filter(
					(turn) =>
						isQueueActiveTurn(turn.estado) && !isTurnClosed(turn.estado),
				)
				.sort((a, b) => a.numeroTurno - b.numeroTurno),
		[turns],
	);

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
			const res = await gqlMutation<{
				createDisponibilidadEnfermero: Disponibilidad;
			}>(CREATE_DISPONIBILIDAD_ENFERMERO, {
				input: { enfermeroId: nurseId, ...newSlot },
			});
			setAvailability((prev) => [...prev, res.createDisponibilidadEnfermero]);
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
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
			const res = selectedHospitalId
				? await gqlMutation<{ llamarSiguienteTurno: Turno }>(
						CALL_NEXT_TURN_BY_HOSPITAL,
						{ hospitalId: selectedHospitalId },
					)
				: await gqlMutation<{ llamarSiguienteTurno: Turno }>(
						CALL_NEXT_TURN,
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
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setActionLoading(null);
		}
	}

	// ── Carga de medicamentos y sedes para la sección de inventario ──
	async function loadMedicinesData() {
		setMedicinesLoading(true);
		try {
			const [medsRes, sedesRes] = await Promise.all([
				gqlQuery<{ medicines: MedicineItem[] }>(MEDICINES_QUERY, {}),
				sedes.length === 0
					? gqlQuery<{ sedes: SedeItem[] }>(SEDES_QUERY)
					: Promise.resolve({ sedes }),
			]);
			setMedicines(medsRes.medicines);
			if (sedesRes.sedes !== sedes) setSedes(sedesRes.sedes);
			// Si hay sedes y no se ha seleccionado una, seleccionar la primera
			if (!selectedSedeId && sedesRes.sedes.length > 0) {
				const firstSede = sedesRes.sedes[0].id;
				setSelectedSedeId(firstSede);
				const invRes = await gqlQuery<{ inventarioBySede: InventarioItem[] }>(
					INVENTARIO_BY_SEDE_QUERY,
					{ sedeId: firstSede },
				);
				setInventario(invRes.inventarioBySede);
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setMedicinesLoading(false);
		}
	}

	async function handleSedeChange(sedeId: number) {
		setSelectedSedeId(sedeId);
		try {
			const res = await gqlQuery<{ inventarioBySede: InventarioItem[] }>(
				INVENTARIO_BY_SEDE_QUERY,
				{ sedeId },
			);
			setInventario(res.inventarioBySede);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		}
	}

	// ── Acción: crear/actualizar stock de un medicamento en una sede ──
	async function handleUpdateStock(
		inventarioId: number,
		newStockActual: number,
	) {
		setActionLoading(`stock-${inventarioId}`);
		setError('');
		try {
			const res = await gqlMutation<{ updateInventario: InventarioItem }>(
				UPDATE_INVENTARIO,
				{ input: { id: inventarioId, stockActual: newStockActual } },
			);
			setInventario((prev) =>
				prev.map((item) =>
					item.id === inventarioId
						? { ...item, ...res.updateInventario }
						: item,
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

	async function handleCreateInventario() {
		if (!selectedSedeId || !newStock.medicamentoId) return;
		setActionLoading('create-inv');
		setError('');
		try {
			const res = await gqlMutation<{ createInventario: InventarioItem }>(
				CREATE_INVENTARIO,
				{
					input: {
						medicamentoId: newStock.medicamentoId,
						sedeId: selectedSedeId,
						stockActual: newStock.stockActual,
					},
				},
			);
			setInventario((prev) => [...prev, res.createInventario]);
			setNewStock({ medicamentoId: 0, stockActual: 0 });
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
							{loading ? '—' : actionableTurns.length}
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
						) : actionableTurns.slice(0, 5).length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{m.dashboardPatientsEmptyDescription({}, { locale })}
							</p>
						) : (
							actionableTurns
								.slice(0, 5)
								.map((t) => <TurnRow key={t.id} turn={t} compact />)
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
							availability
								.slice(0, 3)
								.map((slot) => <SlotRow key={slot.id} slot={slot} compact />)
						)}
					</CardContent>
				</Card>
			</div>
		);
	}

	function DisponibilidadSection() {
		const daySelectId = 'nurse-slot-day';
		const startTimeId = 'nurse-slot-start-time';
		const endTimeId = 'nurse-slot-end-time';

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
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1fr)]">
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
										setNewSlot((prev) => ({ ...prev, diaSemana: Number(v) }))
									}
								>
									<SelectTrigger id={daySelectId} className="w-full sm:w-44">
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
								<Input
									id={startTimeId}
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
								<label
									htmlFor={endTimeId}
									className="text-xs font-medium text-muted-foreground"
								>
									{m.dashboardDoctorDisponibilidadHoraFin({}, { locale })}
								</label>
								<Input
									id={endTimeId}
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
						[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-16 rounded-xl" />
						))
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
						[1, 2, 3, 4].map((i) => (
							<Skeleton key={i} className="h-20 rounded-xl" />
						))
					) : actionableTurns.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{m.dashboardPatientsEmptyDescription({}, { locale })}
						</p>
					) : (
						actionableTurns.map((t) => (
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

	// ── Sección de medicamentos / inventario por sede ──
	function MedicinesSection() {
		// Cargar datos al montar la sección
		useEffect(() => {
			if (medicines.length === 0) void loadMedicinesData();
		}, []); // eslint-disable-line react-hooks/exhaustive-deps

		// Medicamentos que ya están en el inventario de la sede seleccionada
		const inventarioMedIds = new Set(inventario.map((i) => i.medicamentoId));
		// Medicamentos disponibles para agregar (no están ya en inventario)
		const availableMeds = medicines.filter(
			(med) => !inventarioMedIds.has(med.id),
		);

		return (
			<div className="space-y-4">
				{/* Selector de sede */}
				<Card className="border-border/70">
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-base">
							<BeakerIcon className="h-5 w-5 text-primary" />
							{m.dashboardSidebarMedicines({}, { locale })}
						</CardTitle>
						<CardDescription>
							{locale === 'es'
								? 'Gestiona el stock de medicamentos por sede.'
								: 'Manage medicine stock by location.'}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="space-y-1">
							<label
								htmlFor="nurse-sede-select"
								className="text-xs font-medium text-muted-foreground"
							>
								{locale === 'es' ? 'Sede' : 'Location'}
							</label>
							<Select
								value={selectedSedeId ? String(selectedSedeId) : ''}
								onValueChange={(v) => handleSedeChange(Number(v))}
							>
								<SelectTrigger id="nurse-sede-select" className="w-full">
									<SelectValue
										placeholder={
											locale === 'es' ? 'Seleccionar sede' : 'Select location'
										}
									>
										{sedes.find((s) => s.id === selectedSedeId)?.nombre ?? ''}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{sedes.map((s) => (
										<SelectItem key={s.id} value={String(s.id)}>
											{s.nombre}
											{s.ciudad ? ` — ${s.ciudad}` : ''}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</Card>

				{/* Inventario actual de la sede */}
				{selectedSedeId && (
					<Card className="border-border/70">
						<CardHeader className="pb-2">
							<CardTitle className="text-base">
								{locale === 'es'
									? 'Inventario de la sede'
									: 'Location inventory'}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{medicinesLoading ? (
								[1, 2, 3].map((i) => (
									<Skeleton key={i} className="h-16 rounded-xl" />
								))
							) : inventario.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									{locale === 'es'
										? 'No hay medicamentos registrados en esta sede.'
										: 'No medicines registered at this location.'}
								</p>
							) : (
								inventario.map((inv) => {
									const med = medicines.find(
										(m2) => m2.id === inv.medicamentoId,
									);
									return (
										<div
											key={inv.id}
											className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/90 p-3"
										>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium text-foreground">
													{med?.nombreComercial ?? `#${inv.medicamentoId}`}
												</p>
												{med?.nombreGenerico && (
													<p className="text-xs text-muted-foreground">
														{med.nombreGenerico}
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
														? locale === 'es'
															? 'Disponible'
															: 'Available'
														: inv.disponibilidad === 'STOCK_BAJO'
															? locale === 'es'
																? 'Stock bajo'
																: 'Low stock'
															: locale === 'es'
																? 'Agotado'
																: 'Out of stock'}
												</Badge>
												<span className="text-xs tabular-nums text-muted-foreground">
													{inv.stockActual} uds
												</span>
												<Input
													type="number"
													min={0}
													defaultValue={inv.stockActual}
													className="w-20 text-center text-xs"
													aria-label={`Stock ${med?.nombreComercial ?? inv.medicamentoId}`}
													onBlur={(e) => {
														const val = Number(e.target.value);
														if (!Number.isNaN(val) && val !== inv.stockActual) {
															handleUpdateStock(inv.id, val);
														}
													}}
												/>
											</div>
										</div>
									);
								})
							)}
						</CardContent>
					</Card>
				)}

				{/* Agregar medicamento al inventario de la sede */}
				{selectedSedeId && availableMeds.length > 0 && (
					<Card className="border-border/70">
						<CardHeader className="pb-2">
							<CardTitle className="text-base">
								{locale === 'es' ? 'Agregar medicamento' : 'Add medicine'}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="space-y-1">
									<label
										htmlFor="nurse-med-select"
										className="text-xs font-medium text-muted-foreground"
									>
										{locale === 'es' ? 'Medicamento' : 'Medicine'}
									</label>
									<Select
										value={
											newStock.medicamentoId
												? String(newStock.medicamentoId)
												: ''
										}
										onValueChange={(v) =>
											setNewStock((prev) => ({
												...prev,
												medicamentoId: Number(v),
											}))
										}
									>
										<SelectTrigger id="nurse-med-select" className="w-full">
											<SelectValue
												placeholder={
													locale === 'es' ? 'Seleccionar...' : 'Select...'
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{availableMeds.map((med) => (
												<SelectItem key={med.id} value={String(med.id)}>
													{med.nombreComercial}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<label
										htmlFor="nurse-stock-input"
										className="text-xs font-medium text-muted-foreground"
									>
										{locale === 'es' ? 'Stock inicial' : 'Initial stock'}
									</label>
									<Input
										id="nurse-stock-input"
										type="number"
										min={0}
										value={newStock.stockActual}
										onChange={(e) =>
											setNewStock((prev) => ({
												...prev,
												stockActual: Number(e.target.value),
											}))
										}
									/>
								</div>
							</div>
							<Button
								type="button"
								onClick={handleCreateInventario}
								disabled={
									!newStock.medicamentoId || actionLoading === 'create-inv'
								}
								className="gap-2"
							>
								<PlusIcon className="h-4 w-4" />
								{actionLoading === 'create-inv'
									? m.dashboardActionSaving({}, { locale })
									: locale === 'es'
										? 'Agregar al inventario'
										: 'Add to inventory'}
							</Button>
						</CardContent>
					</Card>
				)}
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
							{dayLabel(slot.diaSemana, locale)} — {formatTime(slot.horaInicio)}{' '}
							- {formatTime(slot.horaFin)}
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
							{deleting
								? '...'
								: m.dashboardDoctorDisponibilidadDelete({}, { locale })}
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
		const isActive = !isTurnClosed(t.estado);
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
								{attending ? '...' : m.dashboardNurseAttendTurn({}, { locale })}
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
		medicines: m.dashboardSidebarMedicines({}, { locale }),
		queue: m.dashboardNurseQueueTitle({}, { locale }),
	};

	function renderSection() {
		switch (section) {
			case 'overview':
				return <OverviewSection />;
			case 'disponibilidad':
				return <DisponibilidadSection />;
			case 'medicines':
				return <MedicinesSection />;
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
