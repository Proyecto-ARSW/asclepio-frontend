import {
	BeakerIcon,
	BellIcon,
	CheckCircleIcon,
	ClockIcon,
	ExclamationCircleIcon,
	InformationCircleIcon,
	XMarkIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
} from '@/components/ui/card/card.component';
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import {
	getTriageToken,
	NIVEL_COLOR_CLASS,
	NIVEL_LABEL,
	triageApi,
	type PatientDashboardData,
	type TurnoEstado,
} from './triage-api';

// ─── Estado badge ─────────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<TurnoEstado, string> = {
	CLASIFICACION_PENDIENTE: 'Clasificando…',
	ESPERANDO_CONFIRMACION: 'Esperando confirmación del enfermero',
	EN_ESPERA: 'En cola de espera',
	EN_CONSULTA: 'En consulta',
	ATENDIDO: 'Atendido',
	CANCELADO: 'Cancelado',
};

const ESTADO_CLASS: Record<TurnoEstado, string> = {
	CLASIFICACION_PENDIENTE:
		'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
	ESPERANDO_CONFIRMACION:
		'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
	EN_ESPERA: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
	EN_CONSULTA: 'border-green-500/40 bg-green-500/10 text-green-400',
	ATENDIDO: 'border-border bg-muted/20 text-muted-foreground',
	CANCELADO: 'border-red-500/40 bg-red-500/10 text-red-400',
};

function EstadoBadge({ estado }: { estado: TurnoEstado }) {
	return (
		<span
			className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ESTADO_CLASS[estado]}`}
		>
			{ESTADO_LABEL[estado]}
		</span>
	);
}

// ─── Banner llamado ───────────────────────────────────────────────────────────

function CalledBanner({ turnoNum }: { turnoNum: number }) {
	return (
		<div className="rounded-xl border border-green-500/40 bg-green-500/10 px-5 py-4 flex items-center gap-3">
			<span className="flex size-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
			<div className="flex-1">
				<p className="font-semibold text-green-400">¡Te están llamando!</p>
				<p className="text-sm text-muted-foreground">
					Dirígete a la sala de consulta. Turno #{turnoNum}
				</p>
			</div>
			<BellIcon className="size-6 text-green-400 animate-bounce shrink-0" />
		</div>
	);
}

// ─── Vista turno activo ───────────────────────────────────────────────────────

function ActiveTurnView({
	data,
	onCancel,
	cancelling,
}: {
	data: PatientDashboardData;
	onCancel: () => void;
	cancelling: boolean;
}) {
	const { turno_info, queue_position, triage_level, wait_time } = data;
	const isWaiting =
		turno_info.estado === 'EN_ESPERA' ||
		turno_info.estado === 'ESPERANDO_CONFIRMACION' ||
		turno_info.estado === 'CLASIFICACION_PENDIENTE';
	const isCalled = turno_info.estado === 'EN_CONSULTA';
	const isDone =
		turno_info.estado === 'ATENDIDO' || turno_info.estado === 'CANCELADO';

	return (
		<div className="space-y-4">
			{isCalled && <CalledBanner turnoNum={turno_info.numero_turno} />}

			<Card className="border-border/70">
				<CardContent className="pt-8 pb-8">
					<div className="flex flex-col items-center text-center gap-3">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							Tu turno
						</p>
						<p className="text-8xl font-black tracking-tight tabular-nums leading-none text-foreground">
							#{turno_info.numero_turno}
						</p>

						<EstadoBadge estado={turno_info.estado} />

						{triage_level != null && (
							<span
								className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${NIVEL_COLOR_CLASS[triage_level]}`}
							>
								Nivel {triage_level} · {NIVEL_LABEL[triage_level]}
							</span>
						)}

						{turno_info.estado === 'EN_ESPERA' && (
							<div className="grid grid-cols-2 gap-4 mt-3 w-full max-w-xs">
								<div className="rounded-xl bg-muted/30 border border-border p-3 text-center">
									<p className="text-xs text-muted-foreground">Posición</p>
									<p className="text-3xl font-bold tabular-nums text-foreground">
										{queue_position ?? '—'}
									</p>
								</div>
								<div className="rounded-xl bg-muted/30 border border-border p-3 text-center">
									<p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
										<ClockIcon className="size-3" />
										Espera est.
									</p>
									<p className="text-3xl font-bold tabular-nums text-foreground">
										{wait_time != null ? (
											<>
												{wait_time}
												<span className="text-base font-normal text-muted-foreground ml-1">
													min
												</span>
											</>
										) : (
											'—'
										)}
									</p>
								</div>
							</div>
						)}

						{turno_info.estado === 'EN_ESPERA' && queue_position != null && (
							<div className="w-full max-w-xs mt-1">
								<div className="h-2 rounded-full bg-muted overflow-hidden">
									<div
										className="h-full rounded-full bg-primary transition-all duration-1000"
										style={{
											width: `${Math.max(6, Math.min(95, 100 - (queue_position - 1) * 18))}%`,
										}}
									/>
								</div>
								<p className="text-xs text-muted-foreground mt-1.5 text-center">
									{queue_position === 1
										? '¡Eres el siguiente en ser atendido!'
										: `${queue_position - 1} paciente${queue_position > 2 ? 's' : ''} antes que tú`}
								</p>
							</div>
						)}

						{isDone && (
							<div className="flex items-center gap-2 mt-2">
								{turno_info.estado === 'ATENDIDO' ? (
									<>
										<CheckCircleIcon className="size-5 text-green-400" />
										<p className="text-sm text-green-400 font-medium">
											¡Fuiste atendido! Que te mejores pronto.
										</p>
									</>
								) : (
									<>
										<XMarkIcon className="size-5 text-red-400" />
										<p className="text-sm text-muted-foreground">
											Este turno fue cancelado.
										</p>
									</>
								)}
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{isWaiting && (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{(
						[
							{
								Icon: BellIcon,
								title: 'Mantente cerca',
								desc: 'Permanece en la sala de espera para escuchar tu número.',
							},
							{
								Icon: InformationCircleIcon,
								title: 'Orden por prioridad',
								desc: 'Se atiende según nivel de urgencia, no por orden de llegada.',
							},
							{
								Icon: ExclamationCircleIcon,
								title: '¿Te sientes peor?',
								desc: 'Avisa al enfermero de inmediato si tus síntomas empeoran.',
							},
							{
								Icon: CheckCircleIcon,
								title: 'Documentos listos',
								desc: 'Ten a mano tu documento de identidad y carnet de salud.',
							},
						] as const
					).map(({ Icon, title, desc }) => (
						<div
							key={title}
							className="flex gap-3 rounded-xl border border-border/70 bg-background/80 px-4 py-3"
						>
							<Icon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
							<div>
								<p className="text-xs font-semibold text-foreground">{title}</p>
								<p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
							</div>
						</div>
					))}
				</div>
			)}

			{isWaiting && !isCalled && (
				<div className="flex justify-center pt-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onCancel}
						disabled={cancelling}
						className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
					>
						<XMarkIcon className="size-4" />
						{cancelling ? 'Cancelando…' : 'Cancelar turno'}
					</Button>
				</div>
			)}
		</div>
	);
}

// ─── Sin turno activo ─────────────────────────────────────────────────────────

function NoTurnView({ onGoToTriage }: { onGoToTriage: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center text-center gap-4 py-16">
			<div className="rounded-full bg-muted/40 p-5">
				<InformationCircleIcon className="size-10 text-muted-foreground/40" />
			</div>
			<div>
				<h3 className="font-semibold text-foreground">
					No tienes un turno de triage activo
				</h3>
				<p className="text-sm text-muted-foreground mt-1 max-w-xs">
					Cuando inicies el proceso de triage, aquí verás tu posición en la
					cola y el tiempo de espera estimado en tiempo real.
				</p>
			</div>
			<Button type="button" onClick={onGoToTriage} className="gap-2">
				<BeakerIcon className="size-4" />
				Iniciar triage
			</Button>
		</div>
	);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PatientTriageSection({
	hospitalId,
	userId,
	onNavigateToTriage,
}: {
	hospitalId?: number;
	userId?: string;
	onNavigateToTriage?: () => void;
}) {
	const [activeTurnData, setActiveTurnData] =
		useState<PatientDashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [cancelling, setCancelling] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const findActiveTurn = useCallback(async () => {
		if (!hospitalId || !userId) return;
		const token = getTriageToken();
		if (!token) return;
		try {
			const res = await triageApi.turnos.porHospital(hospitalId, token);
			const mine = res.data.find((t) => t.paciente_id === userId);
			if (mine) {
				const detail = await triageApi.dashboard.paciente(mine.id, token);
				setActiveTurnData(detail.data);
			} else {
				setActiveTurnData(null);
			}
			setError(null);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error cargando tu turno.');
		} finally {
			setLoading(false);
		}
	}, [hospitalId, userId]);

	useEffect(() => {
		void findActiveTurn();
		intervalRef.current = setInterval(() => void findActiveTurn(), 8_000);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [findActiveTurn]);

	async function handleCancel() {
		if (!activeTurnData?.turno_info.id) return;
		const token = getTriageToken();
		if (!token) return;
		setCancelling(true);
		try {
			await triageApi.turnos.cancelar(activeTurnData.turno_info.id, token);
			setActiveTurnData(null);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : 'Error al cancelar el turno.');
		} finally {
			setCancelling(false);
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold text-foreground">
						Mi turno de triage
					</h2>
					<p className="text-sm text-muted-foreground mt-0.5">
						Estado en tiempo real de tu posición en la cola
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void findActiveTurn()}
					disabled={loading}
				>
					Actualizar
				</Button>
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{loading && !activeTurnData ? (
				<div className="space-y-3">
					<Skeleton className="h-52 rounded-xl" />
					<div className="grid grid-cols-2 gap-3">
						<Skeleton className="h-20 rounded-xl" />
						<Skeleton className="h-20 rounded-xl" />
					</div>
				</div>
			) : activeTurnData ? (
				<ActiveTurnView
					data={activeTurnData}
					onCancel={handleCancel}
					cancelling={cancelling}
				/>
			) : (
				<NoTurnView onGoToTriage={onNavigateToTriage ?? (() => {})} />
			)}
		</div>
	);
}