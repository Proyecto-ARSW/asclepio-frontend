import {
	BeakerIcon,
	BellAlertIcon,
	CheckCircleIcon,
	ClockIcon,
	ExclamationTriangleIcon,
	XMarkIcon,
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
	type ConfirmacionEnfermero,
	type TriageAlerta,
	type TriageLevel,
	type TriageTurno,
} from './triage-api';

// ─── Level badge ──────────────────────────────────────────────────────────────

function NivelBadge({ level }: { level: number }) {
	const cls =
		NIVEL_COLOR_CLASS[level] ??
		'border-border bg-muted text-muted-foreground';
	return (
		<span
			className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}
		>
			N{level} · {NIVEL_LABEL[level] ?? '?'}
		</span>
	);
}

// ─── Modal de confirmación ────────────────────────────────────────────────────

interface ConfirmModalProps {
	turn: TriageTurno;
	enfermeroId: string;
	onConfirmed: () => void;
	onClose: () => void;
}

function ConfirmTriageModal({
	turn,
	enfermeroId,
	onConfirmed,
	onClose,
}: ConfirmModalProps) {
	const history = turn.registro_triage?.preliminary_history;
	const vitals = turn.registro_triage?.vital_signs;
	const aiLevel = history?.nivelPrioridad ?? 3;
	const confidence = turn.registro_triage?.confidence_score;

	const [selectedLevel, setSelectedLevel] = useState<number>(aiLevel);
	const [reason, setReason] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const modified = selectedLevel !== aiLevel;

	async function handleConfirm() {
		if (!turn.registro_triage_id) {
			setError('Este turno no tiene registro de triage asociado.');
			return;
		}
		if (modified && !reason.trim()) return;
		const token = getTriageToken();
		if (!token) {
			setError('No hay sesión activa.');
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await triageApi.confirmaciones.confirmar(
				{
					registro_triage_id: turn.registro_triage_id,
					enfermero_id: enfermeroId,
					nivel_final: selectedLevel,
					razon_modificacion: modified ? reason.trim() : undefined,
				},
				token,
			);
			onConfirmed();
		} catch (e: unknown) {
			setError(
				e instanceof Error ? e.message : 'Error al confirmar el triage.',
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirm-triage-title"
		>
			<div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
					<div>
						<h2
							id="confirm-triage-title"
							className="font-semibold text-base text-foreground"
						>
							Confirmar nivel de triage
						</h2>
						<p className="text-sm text-muted-foreground">
							Turno #{turn.numero_turno}
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={onClose}
						aria-label="Cerrar"
					>
						<XMarkIcon className="size-5" />
					</Button>
				</div>

				<div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
					{/* Sugerencia IA */}
					<div className="rounded-lg bg-muted/40 border border-border p-4">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
							Sugerencia de la IA
						</p>
						<div className="flex items-center gap-3 flex-wrap">
							<NivelBadge level={aiLevel} />
							{confidence != null && (
								<span className="text-xs text-muted-foreground">
									Confianza: {(confidence * 100).toFixed(0)}%
								</span>
							)}
						</div>
						{history?.comentariosIA && (
							<p className="mt-2 text-sm text-muted-foreground">
								{history.comentariosIA}
							</p>
						)}
						{history?.advertenciaIA && (
							<p className="mt-1.5 text-xs text-amber-400/90 flex items-start gap-1.5">
								<ExclamationTriangleIcon className="size-3.5 mt-0.5 shrink-0" />
								{history.advertenciaIA}
							</p>
						)}
					</div>

					{/* Síntomas */}
					{(history?.sintomas?.length ?? 0) > 0 && (
						<div>
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
								Síntomas reportados
							</p>
							<div className="flex flex-wrap gap-1.5">
								{history!.sintomas.map((s, i) => (
									<Badge key={i} variant="outline" className="text-xs">
										{s}
									</Badge>
								))}
							</div>
						</div>
					)}

					{/* Signos vitales */}
					{vitals && (
						<div>
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
								Signos vitales
							</p>
							<div className="grid grid-cols-3 gap-2">
								{(
									[
										['T°', `${vitals.temperature_c} °C`],
										['FC', `${vitals.heart_rate_bpm} lpm`],
										['FR', `${vitals.respiratory_rate_bpm} rpm`],
										[
											'PA',
											`${vitals.systolic_bp_mmhg}/${vitals.diastolic_bp_mmhg}`,
										],
										['SpO₂', `${vitals.oxygen_saturation_pct} %`],
									] as [string, string][]
								).map(([label, value]) => (
									<div
										key={label}
										className="rounded-md border border-border bg-muted/30 px-3 py-2 text-center"
									>
										<p className="text-[10px] text-muted-foreground">{label}</p>
										<p className="font-mono text-sm font-semibold text-foreground">
											{value}
										</p>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Selector de nivel */}
					<div>
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
							Nivel confirmado
						</p>
						<div className="grid grid-cols-5 gap-2">
							{([1, 2, 3, 4, 5] as TriageLevel[]).map((l) => {
								const active = selectedLevel === l;
								const base = NIVEL_COLOR_CLASS[l];
								return (
									<button
										key={l}
										type="button"
										onClick={() => setSelectedLevel(l)}
										aria-pressed={active}
										className={`rounded-lg border py-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
											active
												? `${base} ring-2 ring-offset-2 ring-offset-background`
												: 'border-border hover:bg-muted/50'
										}`}
									>
										{l}
									</button>
								);
							})}
						</div>
						<p className="text-xs text-center text-muted-foreground mt-1.5">
							{NIVEL_LABEL[selectedLevel]}
						</p>
					</div>

					{/* Razón si fue modificado */}
					{modified && (
						<div>
							<label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Razón de modificación{' '}
								<span className="text-destructive">*</span>
							</label>
							<textarea
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								rows={2}
								placeholder="Explica por qué modificaste la sugerencia de la IA..."
								className="mt-1.5 w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
					)}

					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={saving}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						onClick={handleConfirm}
						disabled={saving || (modified && !reason.trim())}
						className="gap-1.5"
					>
						<CheckCircleIcon className="size-4" />
						{saving
							? 'Confirmando…'
							: modified
								? 'Confirmar modificado'
								: 'Aceptar sugerencia IA'}
					</Button>
				</div>
			</div>
		</div>
	);
}

// ─── Tarjeta de turno pendiente ───────────────────────────────────────────────

function PendingTurnCard({
	turn,
	onReview,
}: {
	turn: TriageTurno;
	onReview: () => void;
}) {
	const history = turn.registro_triage?.preliminary_history;
	const aiLevel = history?.nivelPrioridad ?? 3;
	const isCritical = aiLevel <= 2;

	return (
		<div
			className={`rounded-xl border px-4 py-3 transition-colors ${
				isCritical
					? 'border-red-500/40 bg-red-500/5'
					: 'border-border/70 bg-background/90'
			}`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="font-semibold text-sm text-foreground">
							Turno #{turn.numero_turno}
						</span>
						<NivelBadge level={aiLevel} />
						{isCritical && (
							<span className="flex size-2 rounded-full bg-red-500 animate-pulse" />
						)}
					</div>
					{(history?.sintomas?.length ?? 0) > 0 && (
						<p className="text-xs text-muted-foreground mt-1 truncate">
							{history!.sintomas.slice(0, 3).join(' · ')}
							{history!.sintomas.length > 3 &&
								` +${history!.sintomas.length - 3}`}
						</p>
					)}
					{turn.tiempo_espera_minutos != null && (
						<p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
							<ClockIcon className="size-3" />
							{turn.tiempo_espera_minutos} min en espera
						</p>
					)}
				</div>
				<Button
					type="button"
					size="sm"
					onClick={onReview}
					className="shrink-0"
				>
					Revisar
				</Button>
			</div>
		</div>
	);
}

// ─── Fila historial ───────────────────────────────────────────────────────────

function HistoryRow({ c }: { c: ConfirmacionEnfermero }) {
	const aiLevel = c.nivel_sugerido_ollama || c.nivel_sugerido_ia_preliminar;
	const finalLevel = c.nivel_final_enfermero;
	return (
		<tr className="border-b border-border/50 last:border-0">
			<td className="py-2.5 pr-4">
				<NivelBadge level={aiLevel} />
			</td>
			<td className="py-2.5 pr-4">
				<NivelBadge level={finalLevel} />
			</td>
			<td className="py-2.5 pr-4">
				{c.acepto_sugerencia ? (
					<Badge
						variant="outline"
						className="text-green-400 border-green-500/30 bg-green-500/10 text-xs"
					>
						Aceptado
					</Badge>
				) : (
					<Badge
						variant="outline"
						className="text-amber-400 border-amber-500/30 bg-amber-500/10 text-xs"
					>
						Modificado
					</Badge>
				)}
			</td>
			<td className="py-2.5 text-xs text-muted-foreground">
				{new Date(c.creado_en).toLocaleTimeString('es-CO', {
					hour: '2-digit',
					minute: '2-digit',
				})}
			</td>
		</tr>
	);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function NurseTriageSection({
	hospitalId,
	userId,
}: {
	hospitalId?: number;
	userId?: string;
}) {
	const enfermeroId = userId ?? '';

	const [pendingTurns, setPendingTurns] = useState<TriageTurno[]>([]);
	const [criticalAlertas, setCriticalAlertas] = useState<TriageAlerta[]>([]);
	const [timeAlertas, setTimeAlertas] = useState<TriageAlerta[]>([]);
	const [history, setHistory] = useState<ConfirmacionEnfermero[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedTurn, setSelectedTurn] = useState<TriageTurno | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const load = useCallback(async () => {
		if (!hospitalId) return;
		const token = getTriageToken();
		if (!token) return;
		try {
			const [turnsRes, alertasRes, histRes] = await Promise.all([
				triageApi.turnos.porHospital(
					hospitalId,
					token,
					'CLASIFICACION_PENDIENTE',
				),
				triageApi.alertas.porHospital(hospitalId, token),
				enfermeroId
					? triageApi.confirmaciones.porEnfermero(enfermeroId, token)
					: Promise.resolve({ success: true, data: [] }),
			]);
			setPendingTurns(turnsRes.data ?? []);
			setCriticalAlertas(alertasRes.data?.alertas_criticas ?? []);
			setTimeAlertas(alertasRes.data?.alertas_tiempo_espera ?? []);
			setHistory(histRes.data ?? []);
			setError(null);
		} catch (e: unknown) {
			setError(
				e instanceof Error ? e.message : 'Error cargando datos de triage.',
			);
		} finally {
			setLoading(false);
		}
	}, [hospitalId, enfermeroId]);

	useEffect(() => {
		void load();
		intervalRef.current = setInterval(() => void load(), 10_000);
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

	const todayHistory = history.slice(0, 20);

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold text-foreground">
						Triage · Confirmaciones
					</h2>
					<p className="text-sm text-muted-foreground mt-0.5">
						Revisa y confirma los niveles de triage sugeridos por la IA
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void load()}
					disabled={loading}
				>
					Actualizar
				</Button>
			</div>

			{criticalAlertas.length > 0 && (
				<Alert variant="destructive">
					<BellAlertIcon className="size-4" />
					<AlertDescription>
						{criticalAlertas.length} alerta
						{criticalAlertas.length > 1 ? 's' : ''} crítica
						{criticalAlertas.length > 1 ? 's' : ''} pendiente
						{criticalAlertas.length > 1 ? 's' : ''} de confirmación médica
					</AlertDescription>
				</Alert>
			)}

			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<div className="grid gap-6 lg:grid-cols-[1fr_300px]">
				<div className="space-y-6">
					{/* Pendientes */}
					<Card className="border-border/70">
						<CardHeader className="pb-3">
							<CardTitle className="text-base flex items-center gap-2">
								<BeakerIcon className="size-4" />
								Pendientes de confirmación
								{!loading && (
									<Badge variant="secondary">{pendingTurns.length}</Badge>
								)}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{loading ? (
								Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={i} className="h-[72px] rounded-xl" />
								))
							) : pendingTurns.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-10 text-center gap-2">
									<CheckCircleIcon className="size-10 text-muted-foreground/40" />
									<p className="text-sm text-muted-foreground">
										No hay turnos pendientes de confirmación
									</p>
								</div>
							) : (
								pendingTurns.map((turn) => (
									<PendingTurnCard
										key={turn.id}
										turn={turn}
										onReview={() => setSelectedTurn(turn)}
									/>
								))
							)}
						</CardContent>
					</Card>

					{/* Historial del día */}
					{todayHistory.length > 0 && (
						<Card className="border-border/70">
							<CardHeader className="pb-3">
								<CardTitle className="text-base">
									Mis confirmaciones hoy
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="overflow-x-auto">
									<table className="w-full text-sm">
										<thead>
											<tr className="border-b border-border text-xs text-muted-foreground">
												<th className="text-left pb-2 pr-4 font-medium">
													Sugerencia IA
												</th>
												<th className="text-left pb-2 pr-4 font-medium">
													Nivel final
												</th>
												<th className="text-left pb-2 pr-4 font-medium">
													Decisión
												</th>
												<th className="text-left pb-2 font-medium">Hora</th>
											</tr>
										</thead>
										<tbody>
											{todayHistory.map((c) => (
												<HistoryRow key={c.id} c={c} />
											))}
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Lateral */}
				<div className="space-y-4">
					{timeAlertas.length > 0 && (
						<Card className="border-border/70">
							<CardHeader className="pb-3">
								<CardTitle className="text-sm flex items-center gap-2">
									<ClockIcon className="size-4" />
									Alertas por espera prolongada
									<Badge variant="secondary">{timeAlertas.length}</Badge>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{timeAlertas.map((a) => (
									<div
										key={a.id}
										className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs"
									>
										<ClockIcon className="size-3.5 text-amber-400 shrink-0" />
										<span className="flex-1 truncate font-medium text-foreground">
											Turno …{a.turno_id.slice(-6)}
										</span>
										<NivelBadge level={a.nivel_triage} />
									</div>
								))}
							</CardContent>
						</Card>
					)}

					<Card className="border-border/70">
						<CardHeader className="pb-3">
							<CardTitle className="text-sm">
								Resumen de confirmaciones
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2.5 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Pendientes</span>
								<span className="font-semibold text-foreground">
									{loading ? '—' : pendingTurns.length}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Confirmadas hoy</span>
								<span className="font-semibold text-foreground">
									{loading ? '—' : todayHistory.length}
								</span>
							</div>
							{todayHistory.length > 0 && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Match IA</span>
									<span className="font-semibold text-foreground">
										{Math.round(
											(todayHistory.filter((c) => c.acepto_sugerencia).length /
												todayHistory.length) *
												100,
										)}
										%
									</span>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{selectedTurn && (
				<ConfirmTriageModal
					turn={selectedTurn}
					enfermeroId={enfermeroId}
					onConfirmed={() => {
						setSelectedTurn(null);
						void load();
					}}
					onClose={() => setSelectedTurn(null)}
				/>
			)}
		</div>
	);
}