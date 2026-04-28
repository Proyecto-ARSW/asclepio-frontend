import {
	ArrowLeftIcon,
	ArrowPathIcon,
	BeakerIcon,
	CheckBadgeIcon,
	ClipboardDocumentListIcon,
	ClockIcon,
	ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, redirect, useNavigate, useParams } from 'react-router';
import type { AppLocale } from '@/features/i18n/locale-path';
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
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import { currentLocale, localePath } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { CloseTriageForm } from '@/features/triage/forms/close-triage.form';
import { PatientTriageForm } from '@/features/triage/forms/patient-triage.form';
import { TriageCommentForm } from '@/features/triage/forms/triage-comment.form';
import { VitalSignsForm } from '@/features/triage/forms/vital-signs.form';
import {
	addTriageCommentToISIS,
	closeTriageProcedureToISIS,
	getMyProceduresFromISIS,
	getTriageProcedureFromISIS,
	getTriageRecordsFromISIS,
	sendTriageTextInputToISIS,
	sendTriageVoiceInputToISIS,
	updateTriageVitalSignsToISIS,
} from '@/features/triage/triage.api';
import type {
	ISISTriageIntakeResponse,
	TriageProcedure,
	TriageVitalSigns,
} from '@/features/triage/triage.types';
import { getTriageContent } from '@/features/triage/triage-content';
import { mapTriageErrorToMessage } from '@/features/triage/triage-errors';
import { useAuthStore } from '@/store/auth.store';
import type { Route } from './+types/triage.page';

const ALLOWED_ROLES = ['PACIENTE', 'ENFERMERO', 'MEDICO'] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

function isAllowedRole(role: string | undefined): role is AllowedRole {
	return ALLOWED_ROLES.includes(role as AllowedRole);
}

function isClosed(status: string | undefined): boolean {
	return status?.toLowerCase() === 'closed';
}

export async function clientLoader() {
	if (typeof window === 'undefined') return null;
	const locale = currentLocale(window.location.pathname);
	const raw = localStorage.getItem('asclepio-auth');
	if (!raw) return redirect(localePath('/login', locale));

	try {
		const parsed = JSON.parse(raw);
		const token = parsed.state?.accessToken;
		const role = parsed.state?.user?.rol as string | undefined;
		if (!token) return redirect(localePath('/login', locale));
		if (!isAllowedRole(role)) return redirect(localePath('/dashboard', locale));
	} catch {
		return redirect(localePath('/login', locale));
	}

	return null;
}

export function meta(_: Route.MetaArgs) {
	const locale = currentLocale();
	return [{ title: m.pageTitleTriage({}, { locale }) }];
}

/* ─── PRIORIDAD BADGE ────────────────────────────────────────────────────────── */

const NIVEL_COLOR: Record<number, string> = {
	1: 'border-red-500/40 bg-red-500/10 text-red-400',
	2: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
	3: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
	4: 'border-green-500/40 bg-green-500/10 text-green-400',
	5: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
};
const NIVEL_LABEL: Record<number, string> = {
	1: 'Crítico',
	2: 'Muy urgente',
	3: 'Urgente',
	4: 'Poco urgente',
	5: 'No urgente',
};

function PriorityBadge({ level }: { level: number }) {
	const cls = NIVEL_COLOR[level] ?? 'border-border bg-muted text-muted-foreground';
	return (
		<span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>
			N{level} · {NIVEL_LABEL[level] ?? '?'}
		</span>
	);
}

/* ─── CARD DE PROCEDIMIENTO EN COLA ─────────────────────────────────────────── */

function ProcedureCard({
	procedure,
	isSelected,
	onSelect,
	locale,
}: {
	procedure: TriageProcedure;
	isSelected: boolean;
	onSelect: () => void;
	locale: AppLocale;
}) {
	const ph = procedure.preliminary_history;
	const nivel = ph?.nivelPrioridad ?? 3;
	const isCritical = nivel <= 2;

	return (
		<button
			type="button"
			onClick={onSelect}
			className={`w-full text-left rounded-xl border px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
				isSelected
					? 'border-primary bg-primary/10'
					: isCritical
						? 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10'
						: 'border-border/70 bg-background/90 hover:bg-muted/40'
			}`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<PriorityBadge level={nivel} />
						{isCritical && <span className="flex size-2 rounded-full bg-red-500 animate-pulse" />}
						<Badge variant="outline" className="text-xs font-mono">
							{procedure.procedure_id.slice(-8)}
						</Badge>
					</div>
					{ph?.sintomas?.length ? (
						<p className="text-xs text-muted-foreground mt-1 truncate">
							{ph.sintomas.slice(0, 3).join(' · ')}
							{ph.sintomas.length > 3 && ` +${ph.sintomas.length - 3}`}
						</p>
					) : null}
					<div className="flex items-center gap-2 mt-1 flex-wrap">
						<Badge
							variant={isClosed(procedure.status) ? 'destructive' : 'secondary'}
							className="text-xs"
						>
							{procedure.status}
						</Badge>
						{procedure.created_at && (
							<span className="text-xs text-muted-foreground flex items-center gap-1">
								<ClockIcon className="size-3" />
								{new Date(procedure.created_at).toLocaleTimeString(locale, {
									hour: '2-digit',
									minute: '2-digit',
								})}
							</span>
						)}
					</div>
				</div>
			</div>
		</button>
	);
}

/* ─── DETALLE DEL PROCEDIMIENTO ──────────────────────────────────────────────── */

function ProcedureDetail({
	procedure,
	role,
	content,
	locale,
	onRefresh,
}: {
	procedure: TriageProcedure;
	role: AllowedRole;
	content: ReturnType<typeof getTriageContent>;
	locale: AppLocale;
	onRefresh: () => void;
}) {
	const [error, setError] = useState('');
	const [feedback, setFeedback] = useState('');
	const procedureIsClosed = isClosed(procedure.status);
	const canEditVitals = role === 'ENFERMERO' && !procedureIsClosed;
	const canComment = (role === 'ENFERMERO' || role === 'MEDICO') && !procedureIsClosed;
	const canClose = role === 'MEDICO' && !procedureIsClosed;

	const ph = procedure.preliminary_history;
	const vitals = procedure.vital_signs;

	async function handleSaveVitals(nextVitals: TriageVitalSigns) {
		setError('');
		setFeedback('');
		try {
			await updateTriageVitalSignsToISIS(procedure.procedure_id, {
				vital_signs: nextVitals,
			});
			setFeedback(content.detail.refresh);
			onRefresh();
		} catch (e) {
			setError(mapTriageErrorToMessage(e, locale));
		}
	}

	async function handleComment(comment: string) {
		setError('');
		setFeedback('');
		try {
			await addTriageCommentToISIS(procedure.procedure_id, { comment });
			onRefresh();
		} catch (e) {
			setError(mapTriageErrorToMessage(e, locale));
		}
	}

	async function handleClose(closeReason: string) {
		setError('');
		try {
			await closeTriageProcedureToISIS(procedure.procedure_id, {
				close_reason: closeReason,
			});
			onRefresh();
		} catch (e) {
			setError(mapTriageErrorToMessage(e, locale));
		}
	}

	return (
		<div className="space-y-4">
			{feedback && (
				<Alert>
					<AlertDescription>{feedback}</AlertDescription>
				</Alert>
			)}
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Header del procedimiento */}
			<div className="flex flex-wrap gap-2 items-center">
				<Badge variant="outline" className="font-mono text-xs">
					{content.patient.procedureId}: {procedure.procedure_id}
				</Badge>
				<Badge variant={procedureIsClosed ? 'destructive' : 'secondary'}>
					{procedure.status}
				</Badge>
				{ph?.nivelPrioridad && <PriorityBadge level={ph.nivelPrioridad} />}
			</div>

			{procedureIsClosed && (
				<Alert role="alert">
					<CheckBadgeIcon className="size-4" />
					<AlertDescription>{content.detail.closedLabel}</AlertDescription>
				</Alert>
			)}

			{/* Historial preliminar */}
			{ph && (
				<section
					aria-label={content.detail.triageData}
					className="rounded-xl border border-border/70 p-4 space-y-3"
				>
					<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
						<ClipboardDocumentListIcon className="size-4 text-muted-foreground" />
						{content.detail.triageData}
					</h3>

					{ph.sintomas?.length > 0 && (
						<div>
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
								{content.queue.symptoms}
							</p>
							<div className="flex flex-wrap gap-1.5">
								{ph.sintomas.map((s, i) => (
									<Badge key={i} variant="outline" className="text-xs">
										{s}
									</Badge>
								))}
							</div>
						</div>
					)}

					{ph.posiblesCausas?.length > 0 && (
						<div>
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
								{content.queue.possibleCauses}
							</p>
							<div className="flex flex-wrap gap-1.5">
								{ph.posiblesCausas.map((c, i) => (
									<Badge key={i} variant="secondary" className="text-xs">
										{c}
									</Badge>
								))}
							</div>
						</div>
					)}

					{ph.comentariosIA && (
						<div>
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
								{content.queue.aiComments}
							</p>
							<p className="text-sm text-muted-foreground">{ph.comentariosIA}</p>
						</div>
					)}

					{ph.advertenciaIA && (
						<p className="text-xs text-amber-400/90 flex items-start gap-1.5 mt-1">
							<ExclamationTriangleIcon className="size-3.5 mt-0.5 shrink-0" />
							{ph.advertenciaIA}
						</p>
					)}

					{procedure.confidence_score != null && (
						<p className="text-xs text-muted-foreground">
							{content.queue.confidence}: {(procedure.confidence_score * 100).toFixed(0)}%
						</p>
					)}

					{procedure.transcript && (
						<div>
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
								{content.detail.transcript}
							</p>
							<p className="text-sm text-muted-foreground italic">&ldquo;{procedure.transcript}&rdquo;</p>
						</div>
					)}
				</section>
			)}

			{/* Signos vitales (solo lectura si ya existen) */}
			{vitals && (
				<section
					aria-label={content.detail.vitalSigns}
					className="rounded-xl border border-border/70 p-4 space-y-2"
				>
					<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
						<BeakerIcon className="size-4 text-muted-foreground" />
						{content.detail.vitalSigns}
					</h3>
					<div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
						{(
							[
								['T°', vitals.temperature_c, '°C'],
								['FC', vitals.heart_rate_bpm, 'lpm'],
								['FR', vitals.respiratory_rate_bpm, 'rpm'],
								['TAS', vitals.systolic_bp_mmhg, 'mmHg'],
								['TAD', vitals.diastolic_bp_mmhg, 'mmHg'],
								['SpO₂', vitals.oxygen_saturation_pct, '%'],
								['Peso', vitals.weight_kg, 'kg'],
								['Talla', vitals.height_cm, 'cm'],
							] as [string, number | undefined, string][]
						)
							.filter(([, v]) => v != null)
							.map(([label, value, unit]) => (
								<div
									key={label}
									className="rounded-lg border border-border/60 bg-muted/30 px-2 py-2 text-center"
								>
									<p className="text-[10px] text-muted-foreground">{label}</p>
									<p className="font-mono text-sm font-semibold text-foreground">
										{value}
										<span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span>
									</p>
								</div>
							))}
					</div>
				</section>
			)}

			{/* Comentarios existentes */}
			{(procedure.comments?.length ?? 0) > 0 && (
				<section
					aria-label={content.detail.comments}
					className="rounded-xl border border-border/70 p-4 space-y-2"
				>
					<h3 className="text-sm font-semibold text-foreground">{content.detail.comments}</h3>
					<ul className="space-y-2">
						{procedure.comments!.map((c) => (
							<li key={c.id} className="rounded-lg bg-muted/40 px-3 py-2">
								<p className="text-xs text-muted-foreground">
									{c.author_role} · {new Date(c.created_at).toLocaleString(locale)}
								</p>
								<p className="text-sm text-foreground mt-0.5">{c.comment}</p>
							</li>
						))}
					</ul>
				</section>
			)}

			{/* Formularios según rol */}
			{role === 'ENFERMERO' && (
				<section className="space-y-4 rounded-xl border border-border/70 p-4">
					<VitalSignsForm
						content={content}
						initialValues={procedure.vital_signs}
						disabled={!canEditVitals}
						onSubmit={handleSaveVitals}
					/>
					<TriageCommentForm
						content={content}
						disabled={!canComment}
						onSubmit={handleComment}
					/>
				</section>
			)}

			{role === 'MEDICO' && (
				<section className="space-y-4 rounded-xl border border-border/70 p-4">
					<TriageCommentForm
						content={content}
						disabled={!canComment}
						onSubmit={handleComment}
					/>
					<CloseTriageForm
						content={content}
						disabled={!canClose}
						onSubmit={handleClose}
					/>
				</section>
			)}
		</div>
	);
}

/* ─── RECOMMENDATION CARD (paciente post-submit) ─────────────────────────────── */

function RecommendationCard({
	intake,
	content,
}: {
	intake: ISISTriageIntakeResponse;
	content: ReturnType<typeof getTriageContent>;
}) {
	return (
		<Card className="border-primary/40 bg-primary/5">
			<CardHeader className="pb-2">
				<CardTitle className="text-base flex items-center gap-2">
					<CheckBadgeIcon className="size-5 text-primary" />
					{content.patient.recommendationTitle}
				</CardTitle>
				<CardDescription className="font-mono text-xs">
					ID: {intake.procedure_id}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-foreground whitespace-pre-wrap">{intake.recommendation}</p>
			</CardContent>
		</Card>
	);
}

/* ─── VISTA PACIENTE ─────────────────────────────────────────────────────────── */

function PatientView({
	content,
	locale,
}: {
	content: ReturnType<typeof getTriageContent>;
	locale: AppLocale;
}) {
	const navigate = useNavigate();
	const { procedureId: routeProcedureId } = useParams();

	const [intake, setIntake] = useState<ISISTriageIntakeResponse | null>(null);
	const [procedure, setProcedure] = useState<TriageProcedure | null>(null);
	const [myProcedures, setMyProcedures] = useState<TriageProcedure[]>([]);
	const [loadingProcedure, setLoadingProcedure] = useState(false);
	const [loadingList, setLoadingList] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		setLoadingList(true);
		getMyProceduresFromISIS(10)
			.then(setMyProcedures)
			.catch(() => setMyProcedures([]))
			.finally(() => setLoadingList(false));
	}, []);

	useEffect(() => {
		if (routeProcedureId) {
			setLoadingProcedure(true);
			getTriageProcedureFromISIS(routeProcedureId)
				.then(setProcedure)
				.catch(() => {})
				.finally(() => setLoadingProcedure(false));
		}
	}, [routeProcedureId]);

	async function handleTextSubmit(payload: { text: string }) {
		setError('');
		const response = await sendTriageTextInputToISIS({ text: payload.text });
		setIntake(response);
		navigate(localePath(`/triage/${response.procedure_id}`, locale), { replace: true });
		setLoadingProcedure(true);
		try {
			const detail = await getTriageProcedureFromISIS(response.procedure_id);
			setProcedure(detail);
		} catch {
			/* el intake ya tiene la recomendación */
		} finally {
			setLoadingProcedure(false);
		}
		setMyProcedures((prev) => {
			const already = prev.find((p) => p.procedure_id === response.procedure_id);
			if (already) return prev;
			return [
				{
					procedure_id: response.procedure_id,
					patient_id: response.patient_id,
					status: response.status,
					triage_data: {},
				} as TriageProcedure,
				...prev,
			];
		});
	}

	async function handleVoiceSubmit(payload: {
		audio_base64: string;
		file_name: string;
		mime_type: string;
	}) {
		setError('');
		const response = await sendTriageVoiceInputToISIS(payload);
		setIntake(response);
		navigate(localePath(`/triage/${response.procedure_id}`, locale), { replace: true });
		setLoadingProcedure(true);
		try {
			const detail = await getTriageProcedureFromISIS(response.procedure_id);
			setProcedure(detail);
		} catch {
			/* ok */
		} finally {
			setLoadingProcedure(false);
		}
	}

	async function handleSelectProcedure(id: string) {
		setLoadingProcedure(true);
		setIntake(null);
		setError('');
		navigate(localePath(`/triage/${id}`, locale), { replace: true });
		try {
			setProcedure(await getTriageProcedureFromISIS(id));
		} catch (e) {
			setError(mapTriageErrorToMessage(e, locale));
		} finally {
			setLoadingProcedure(false);
		}
	}

	return (
		<div className="space-y-4">
			{/* Formulario de entrada */}
			<Card className="border-border/70 bg-card/95">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">{content.newTriageMenu}</CardTitle>
					<CardDescription>{content.subtitle}</CardDescription>
				</CardHeader>
				<CardContent>
					<PatientTriageForm
						content={content}
						onSubmitText={handleTextSubmit}
						onSubmitVoice={handleVoiceSubmit}
					/>
					{error && (
						<Alert variant="destructive" className="mt-3">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>

			{/* Recomendación post-submit */}
			{intake && <RecommendationCard intake={intake} content={content} />}

			{/* Detalle del procedimiento actual */}
			{loadingProcedure ? (
				<div className="space-y-3">
					<Skeleton className="h-24 rounded-xl" />
					<Skeleton className="h-24 rounded-xl" />
				</div>
			) : procedure ? (
				<Card className="border-border/70 bg-card/95">
					<CardHeader className="pb-3">
						<CardTitle className="text-base">{content.detail.heading}</CardTitle>
					</CardHeader>
					<CardContent>
						<ProcedureDetail
							procedure={procedure}
							role="PACIENTE"
							content={content}
							locale={locale}
							onRefresh={() => {
								setLoadingProcedure(true);
								getTriageProcedureFromISIS(procedure.procedure_id)
									.then(setProcedure)
									.catch(() => {})
									.finally(() => setLoadingProcedure(false));
							}}
						/>
					</CardContent>
				</Card>
			) : null}

			{/* Mis procedimientos recientes */}
			<Card className="border-border/70 bg-card/95">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">{content.patient.myProceduresTitle}</CardTitle>
				</CardHeader>
				<CardContent>
					{loadingList ? (
						<div className="space-y-2">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className="h-16 rounded-xl" />
							))}
						</div>
					) : myProcedures.length === 0 ? (
						<p className="text-sm text-muted-foreground">{content.patient.myProceduresEmpty}</p>
					) : (
						<ul className="space-y-2">
							{myProcedures.map((p) => (
								<li key={p.procedure_id}>
									<ProcedureCard
										procedure={p}
										isSelected={p.procedure_id === procedure?.procedure_id}
										onSelect={() => void handleSelectProcedure(p.procedure_id)}
										locale={locale}
									/>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

/* ─── VISTA ENFERMERO / MÉDICO ───────────────────────────────────────────────── */

function StaffView({
	role,
	content,
	locale,
}: {
	role: 'ENFERMERO' | 'MEDICO';
	content: ReturnType<typeof getTriageContent>;
	locale: AppLocale;
}) {
	const navigate = useNavigate();
	const { procedureId: routeProcedureId } = useParams();

	const [tab, setTab] = useState<'pending' | 'attended'>('pending');
	const [pending, setPending] = useState<TriageProcedure[]>([]);
	const [attended, setAttended] = useState<TriageProcedure[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(
		routeProcedureId ?? null,
	);
	const [procedure, setProcedure] = useState<TriageProcedure | null>(null);
	const [loadingList, setLoadingList] = useState(true);
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [listError, setListError] = useState('');
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const loadLists = useCallback(async () => {
		try {
			const attendedStatus = role === 'MEDICO' ? 'closed' : 'resolved';
			const [pend, att] = await Promise.all([
				getTriageRecordsFromISIS(100, 'pending'),
				getTriageRecordsFromISIS(50, attendedStatus),
			]);
			setPending(pend);
			setAttended(att);
			setListError('');
		} catch (e) {
			setListError(mapTriageErrorToMessage(e, locale));
		} finally {
			setLoadingList(false);
		}
	}, [locale, role]);

	useEffect(() => {
		void loadLists();
		intervalRef.current = setInterval(() => void loadLists(), 15_000);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [loadLists]);

	useEffect(() => {
		if (selectedId) {
			setLoadingDetail(true);
			getTriageProcedureFromISIS(selectedId)
				.then(setProcedure)
				.catch(() => setProcedure(null))
				.finally(() => setLoadingDetail(false));
		}
	}, [selectedId]);

	function selectProcedure(id: string) {
		setSelectedId(id);
		navigate(localePath(`/triage/${id}`, locale), { replace: true });
	}

	function clearSelection() {
		setSelectedId(null);
		setProcedure(null);
		navigate(localePath('/triage', locale), { replace: true });
	}

	const displayList = tab === 'pending' ? pending : attended;

	/* Layout split: lista + detalle */
	if (selectedId && (loadingDetail || procedure)) {
		return (
			<div className="space-y-3">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={clearSelection}
					className="gap-1.5"
				>
					<ArrowLeftIcon className="size-4" />
					{content.queue.title}
				</Button>

				{loadingDetail ? (
					<div className="space-y-3">
						<Skeleton className="h-32 rounded-xl" />
						<Skeleton className="h-48 rounded-xl" />
					</div>
				) : procedure ? (
					<Card className="border-border/70 bg-card/95">
						<CardHeader className="pb-3">
							<CardTitle className="text-base">{content.detail.heading}</CardTitle>
						</CardHeader>
						<CardContent>
							<ProcedureDetail
								procedure={procedure}
								role={role}
								content={content}
								locale={locale}
								onRefresh={() => {
									setLoadingDetail(true);
									getTriageProcedureFromISIS(selectedId)
										.then((p) => {
											setProcedure(p);
											void loadLists();
										})
										.catch(() => {})
										.finally(() => setLoadingDetail(false));
								}}
							/>
						</CardContent>
					</Card>
				) : null}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Tabs + refresh */}
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="flex gap-1 rounded-xl border border-border/70 bg-muted/30 p-1">
					<button
						type="button"
						onClick={() => setTab('pending')}
						className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
							tab === 'pending'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						{content.queue.pending}
						{!loadingList && (
							<span className="ml-1.5 rounded-full bg-primary/20 px-1.5 text-xs text-primary">
								{pending.length}
							</span>
						)}
					</button>
					<button
						type="button"
						onClick={() => setTab('attended')}
						className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
							tab === 'attended'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						{content.queue.attended}
						{!loadingList && (
							<span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
								{attended.length}
							</span>
						)}
					</button>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void loadLists()}
					disabled={loadingList}
					className="gap-1.5"
				>
					<ArrowPathIcon className={`size-4 ${loadingList ? 'animate-spin' : ''}`} />
					{content.detail.refresh}
				</Button>
			</div>

			{listError && (
				<Alert variant="destructive">
					<AlertDescription>{listError}</AlertDescription>
				</Alert>
			)}

			<div className="lg:grid lg:grid-cols-[1fr_380px] gap-4">
				{/* Lista */}
				<Card className="border-border/70 bg-card/95">
					<CardContent className="p-3 space-y-2">
						{loadingList ? (
							Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-20 rounded-xl" />
							))
						) : displayList.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center gap-2">
								<ClipboardDocumentListIcon className="size-10 text-muted-foreground/30" />
								<p className="text-sm text-muted-foreground">
									{tab === 'pending'
										? content.queue.empty
										: content.queue.emptyAttended}
								</p>
							</div>
						) : (
							displayList.map((p) => (
								<ProcedureCard
									key={p.procedure_id}
									procedure={p}
									isSelected={p.procedure_id === selectedId}
									onSelect={() => selectProcedure(p.procedure_id)}
									locale={locale}
								/>
							))
						)}
					</CardContent>
				</Card>

				{/* Panel de selección (desktop) */}
				<div className="hidden lg:flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10 p-8 text-center gap-3">
					<ClipboardDocumentListIcon className="size-10 text-muted-foreground/30" />
					<p className="text-sm text-muted-foreground">{content.queue.selectProcedure}</p>
				</div>
			</div>
		</div>
	);
}

/* ─── PÁGINA PRINCIPAL ───────────────────────────────────────────────────────── */

export default function TriagePage() {
	const locale = currentLocale();
	const content = getTriageContent(locale);
	const { user } = useAuthStore();

	if (!user || !isAllowedRole(user.rol)) return null;

	const role = user.rol;

	return (
		<div className="min-h-screen bg-background px-4 py-4 sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-6xl space-y-4">
				{/* Header */}
				<header className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<h1 className="text-xl font-semibold text-foreground sm:text-2xl">
								{content.title}
							</h1>
							<p className="text-sm text-muted-foreground">
								{role === 'PACIENTE'
									? content.subtitle
									: content.queue.title}
							</p>
						</div>
						<Link to={localePath('/dashboard', locale)}>
							<Button variant="outline">
								{m.dashboardSidebarOverview({}, { locale })}
							</Button>
						</Link>
					</div>
				</header>

				{/* Vista según rol */}
				{role === 'PACIENTE' && (
					<PatientView content={content} locale={locale} />
				)}

				{(role === 'ENFERMERO' || role === 'MEDICO') && (
					<StaffView role={role} content={content} locale={locale} />
				)}
			</div>
		</div>
	);
}
