import {
	ArrowPathIcon,
	BellAlertIcon,
	ChartBarIcon,
	ClockIcon,
	ExclamationTriangleIcon,
	UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import {
	getTriageToken,
	NIVEL_COLOR_CLASS,
	NIVEL_LABEL,
	triageApi,
	type TriageAlerta,
	type TriageLevel,
	type TriageTurno,
} from './triage-api';

// ─── Barra por nivel ──────────────────────────────────────────────────────────

const NIVEL_BAR_COLOR: Record<TriageLevel, string> = {
	1: 'bg-red-500',
	2: 'bg-orange-500',
	3: 'bg-yellow-500',
	4: 'bg-green-500',
	5: 'bg-blue-500',
};

function LevelBar({
	level,
	count,
	total,
}: {
	level: TriageLevel;
	count: number;
	total: number;
}) {
	const pct = total > 0 ? Math.round((count / total) * 100) : 0;
	return (
		<div className="flex items-center gap-3 text-sm">
			<span
				className={`shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-bold ${NIVEL_COLOR_CLASS[level]}`}
			>
				N{level}
			</span>
			<div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
				<div
					className={`h-full rounded-full transition-all duration-500 ${NIVEL_BAR_COLOR[level]}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="tabular-nums text-xs text-muted-foreground w-8 text-right">
				{count}
			</span>
		</div>
	);
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────

function KpiTile({
	label,
	value,
	highlight,
}: {
	label: string;
	value: string | number;
	highlight?: 'ok' | 'warn' | 'crit';
}) {
	const valueClass =
		highlight === 'crit'
			? 'text-red-400'
			: highlight === 'warn'
				? 'text-amber-400'
				: highlight === 'ok'
					? 'text-green-400'
					: 'text-foreground';
	return (
		<div className="rounded-xl border border-border/70 bg-background/80 px-4 py-3">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className={`text-2xl font-bold tabular-nums mt-1 ${valueClass}`}>
				{value}
			</p>
		</div>
	);
}

// ─── Fila alerta ──────────────────────────────────────────────────────────────

function AlertRow({ alerta }: { alerta: TriageAlerta }) {
	const isCritical = alerta.tipo_alerta === 'CRITICO';
	return (
		<div
			className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${
				isCritical
					? 'border-red-500/40 bg-red-500/5'
					: 'border-amber-500/40 bg-amber-500/10'
			}`}
		>
			{isCritical ? (
				<BellAlertIcon className="size-4 text-red-400 shrink-0" />
			) : (
				<ClockIcon className="size-4 text-amber-400 shrink-0" />
			)}
			<div className="flex-1 min-w-0">
				<span className="font-medium text-xs text-foreground">
					Turno …{alerta.turno_id.slice(-6)}
				</span>
				<span className="text-muted-foreground ml-1.5 text-xs">
					· {isCritical ? 'Crítico' : 'Espera prolongada'}
				</span>
			</div>
			<span
				className={`text-xs px-2 py-0.5 rounded-full border ${NIVEL_COLOR_CLASS[alerta.nivel_triage as TriageLevel]}`}
			>
				N{alerta.nivel_triage}
			</span>
		</div>
	);
}

const ESTADO_SHORT: Record<string, string> = {
	CLASIFICACION_PENDIENTE: 'Clasificando',
	ESPERANDO_CONFIRMACION: 'Esperando confirm.',
	EN_ESPERA: 'En espera',
	EN_CONSULTA: 'En consulta',
	ATENDIDO: 'Atendido',
	CANCELADO: 'Cancelado',
};

interface Stats {
	turns: TriageTurno[];
	alertasCriticas: TriageAlerta[];
	alertasEspera: TriageAlerta[];
	byLevel: Record<TriageLevel, number>;
	totalActive: number;
	totalToday: number;
	pendingConfirmation: number;
	inConsultation: number;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AdminTriageSection({
	hospitalId,
}: {
	hospitalId?: number;
}) {
	const [stats, setStats] = useState<Stats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const load = useCallback(async () => {
		if (!hospitalId) return;
		const token = getTriageToken();
		if (!token) return;
		try {
			const [turnsRes, alertasRes] = await Promise.all([
				triageApi.turnos.porHospital(hospitalId, token),
				triageApi.alertas.porHospital(hospitalId, token),
			]);

			const turns = turnsRes.data ?? [];
			const today = new Date().toDateString();
			const todayTurns = turns.filter(
				(t) => new Date(t.creado_en).toDateString() === today,
			);

			const ACTIVE_STATES = [
				'EN_ESPERA',
				'CLASIFICACION_PENDIENTE',
				'ESPERANDO_CONFIRMACION',
				'EN_CONSULTA',
			];
			const activeTurns = turns.filter((t) =>
				ACTIVE_STATES.includes(t.estado),
			);

			const byLevel: Record<number, number> = {
				1: 0,
				2: 0,
				3: 0,
				4: 0,
				5: 0,
			};
			for (const t of activeTurns) {
				if (
					t.nivel_triage_id != null &&
					byLevel[t.nivel_triage_id] !== undefined
				) {
					byLevel[t.nivel_triage_id]++;
				}
			}

			setStats({
				turns: activeTurns,
				alertasCriticas: alertasRes.data?.alertas_criticas ?? [],
				alertasEspera: alertasRes.data?.alertas_tiempo_espera ?? [],
				byLevel: byLevel as Record<TriageLevel, number>,
				totalActive: activeTurns.length,
				totalToday: todayTurns.length,
				pendingConfirmation: turns.filter(
					(t) =>
						t.estado === 'CLASIFICACION_PENDIENTE' ||
						t.estado === 'ESPERANDO_CONFIRMACION',
				).length,
				inConsultation: turns.filter((t) => t.estado === 'EN_CONSULTA')
					.length,
			});
			setLastUpdated(new Date());
			setError(null);
		} catch (e: unknown) {
			setError(
				e instanceof Error ? e.message : 'Error cargando datos de triage.',
			);
		} finally {
			setLoading(false);
		}
	}, [hospitalId]);

	useEffect(() => {
		void load();
		intervalRef.current = setInterval(() => void load(), 15_000);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [load]);

	if (!hospitalId) {
		return (
			<Alert>
				<AlertDescription>No hay hospital seleccionado.</AlertDescription>
			</Alert>
		);
	}

	const allAlertas = [
		...(stats?.alertasCriticas ?? []),
		...(stats?.alertasEspera ?? []),
	];

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold text-foreground">
						Monitoreo de Triage
					</h2>
					<p className="text-sm text-muted-foreground mt-0.5">
						Estado en tiempo real del sistema de triage
					</p>
				</div>
				<div className="flex items-center gap-2">
					{lastUpdated && (
						<span className="text-xs text-muted-foreground hidden sm:block">
							Act.{' '}
							{lastUpdated.toLocaleTimeString('es-CO', {
								hour: '2-digit',
								minute: '2-digit',
							})}
						</span>
					)}
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void load()}
						disabled={loading}
						className="gap-1.5"
					>
						<ArrowPathIcon
							className={`size-4 ${loading ? 'animate-spin' : ''}`}
						/>
						Actualizar
					</Button>
				</div>
			</div>

			{(stats?.alertasCriticas.length ?? 0) > 0 && (
				<Alert variant="destructive">
					<ExclamationTriangleIcon className="size-4" />
					<AlertDescription>
						{stats!.alertasCriticas.length} alerta
						{stats!.alertasCriticas.length > 1 ? 's' : ''} crítica
						{stats!.alertasCriticas.length > 1 ? 's' : ''} requieren
						atención médica inmediata.
					</AlertDescription>
				</Alert>
			)}

			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{loading && !stats ? (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-[76px] rounded-xl" />
					))}
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<KpiTile label="Turnos activos" value={stats?.totalActive ?? 0} />
					<KpiTile
						label="Pend. confirmación"
						value={stats?.pendingConfirmation ?? 0}
						highlight={
							(stats?.pendingConfirmation ?? 0) > 5 ? 'warn' : undefined
						}
					/>
					<KpiTile
						label="En consulta"
						value={stats?.inConsultation ?? 0}
						highlight="ok"
					/>
					<KpiTile
						label="Alertas activas"
						value={allAlertas.length}
						highlight={allAlertas.length > 0 ? 'crit' : undefined}
					/>
				</div>
			)}

			<div className="grid gap-6 lg:grid-cols-[1fr_300px]">
				<div className="space-y-6">
					<Card className="border-border/70">
						<CardHeader className="pb-3">
							<CardTitle className="text-base flex items-center gap-2">
								<ChartBarIcon className="size-4" />
								Cola por nivel de triage
								{stats && (
									<Badge variant="secondary">
										{stats.totalActive} activos
									</Badge>
								)}
							</CardTitle>
						</CardHeader>
						<CardContent>
							{loading && !stats ? (
								<div className="space-y-3">
									{[1, 2, 3, 4, 5].map((i) => (
										<Skeleton key={i} className="h-6 rounded-lg" />
									))}
								</div>
							) : (
								<div className="space-y-3">
									{([1, 2, 3, 4, 5] as TriageLevel[]).map((l) => (
										<LevelBar
											key={l}
											level={l}
											count={stats?.byLevel[l] ?? 0}
											total={stats?.totalActive ?? 0}
										/>
									))}
									{stats?.totalActive === 0 && (
										<p className="text-sm text-muted-foreground text-center py-4">
											No hay turnos activos en este momento
										</p>
									)}
								</div>
							)}
						</CardContent>
					</Card>

					<Card className="border-border/70">
						<CardHeader className="pb-3">
							<CardTitle className="text-base flex items-center gap-2">
								<UserGroupIcon className="size-4" />
								Turnos activos
							</CardTitle>
						</CardHeader>
						<CardContent>
							{loading && !stats ? (
								<div className="space-y-2">
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton key={i} className="h-10 rounded-lg" />
									))}
								</div>
							) : (stats?.turns.length ?? 0) === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-6">
									No hay turnos activos
								</p>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead>
											<tr className="border-b border-border text-xs text-muted-foreground">
												<th className="text-left pb-2 pr-4 font-medium">
													Turno
												</th>
												<th className="text-left pb-2 pr-4 font-medium">
													Nivel
												</th>
												<th className="text-left pb-2 pr-4 font-medium">
													Estado
												</th>
												<th className="text-left pb-2 font-medium">
													Espera
												</th>
											</tr>
										</thead>
										<tbody>
											{stats!.turns.slice(0, 20).map((t) => (
												<tr
													key={t.id}
													className="border-b border-border/50 last:border-0"
												>
													<td className="py-2.5 pr-4 font-mono font-semibold text-sm text-foreground">
														#{t.numero_turno}
													</td>
													<td className="py-2.5 pr-4">
														{t.nivel_triage_id != null ? (
															<span
																className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${NIVEL_COLOR_CLASS[t.nivel_triage_id as TriageLevel]}`}
															>
																N{t.nivel_triage_id} ·{' '}
																{NIVEL_LABEL[t.nivel_triage_id]}
															</span>
														) : (
															<span className="text-xs text-muted-foreground">
																Sin clasificar
															</span>
														)}
													</td>
													<td className="py-2.5 pr-4 text-xs text-muted-foreground">
														{ESTADO_SHORT[t.estado] ?? t.estado}
													</td>
													<td className="py-2.5 text-xs text-muted-foreground tabular-nums">
														{t.tiempo_espera_minutos != null
															? `${t.tiempo_espera_minutos} min`
															: '—'}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4">
					<Card className="border-border/70">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm flex items-center gap-2">
								<BellAlertIcon className="size-4" />
								Alertas activas
								{allAlertas.length > 0 && (
									<Badge variant="destructive" className="ml-auto">
										{allAlertas.length}
									</Badge>
								)}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{loading && !stats ? (
								<Skeleton className="h-16 rounded-lg" />
							) : allAlertas.length === 0 ? (
								<p className="text-xs text-muted-foreground text-center py-3">
									Sin alertas activas
								</p>
							) : (
								allAlertas
									.slice(0, 8)
									.map((a) => <AlertRow key={a.id} alerta={a} />)
							)}
						</CardContent>
					</Card>

					<Card className="border-border/70">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm">Resumen del día</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2.5 text-sm">
							{loading && !stats ? (
								<div className="space-y-2">
									{Array.from({ length: 4 }).map((_, i) => (
										<Skeleton key={i} className="h-5 rounded" />
									))}
								</div>
							) : (
								<>
									{(
										[
											['Total ingresos hoy', stats?.totalToday ?? 0, ''],
											['Activos ahora', stats?.totalActive ?? 0, ''],
											[
												'Nivel 1 activos',
												stats?.byLevel[1] ?? 0,
												(stats?.byLevel[1] ?? 0) > 0 ? 'text-red-400' : '',
											],
											[
												'Nivel 2 activos',
												stats?.byLevel[2] ?? 0,
												(stats?.byLevel[2] ?? 0) > 0 ? 'text-orange-400' : '',
											],
										] as [string, number, string][]
									).map(([label, value, cls]) => (
										<div key={label} className="flex justify-between">
											<span className="text-muted-foreground">{label}</span>
											<span
												className={`font-semibold tabular-nums ${cls || 'text-foreground'}`}
											>
												{value}
											</span>
										</div>
									))}
								</>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}