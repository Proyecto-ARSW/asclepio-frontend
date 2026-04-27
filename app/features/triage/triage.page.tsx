import {
	ArrowPathIcon,
	DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { Link, redirect, useNavigate, useParams } from 'react-router';
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
import { Field, FieldLabel } from '@/components/ui/field/field.component';
import { Input } from '@/components/ui/input/input.component';
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import { currentLocale, localePath } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { CloseTriageForm } from '@/features/triage/forms/close-triage.form';
import { NewTriageForm } from '@/features/triage/forms/new-triage.form';
import { TriageCommentForm } from '@/features/triage/forms/triage-comment.form';
import { VitalSignsForm } from '@/features/triage/forms/vital-signs.form';
import {
	addTriageComment,
	closeTriageProcedure,
	downloadTriagePdf,
	getTriageProcedure,
	sendTriageTextInput,
	sendTriageVoiceInput,
	updateTriageVitalSigns,
} from '@/features/triage/triage.api';
import type { TriageVitalSigns } from '@/features/triage/triage.types';
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
	if (!status) return false;
	return status.toLowerCase() === 'closed';
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

export default function TriagePage() {
	const locale = currentLocale();
	const content = getTriageContent(locale);
	const navigate = useNavigate();
	const { procedureId: routeProcedureId } = useParams();
	const { user } = useAuthStore();

	const [procedureId, setProcedureId] = useState(routeProcedureId ?? '');
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [detailError, setDetailError] = useState('');
	const [actionFeedback, setActionFeedback] = useState('');
	const [procedure, setProcedure] = useState<Awaited<
		ReturnType<typeof getTriageProcedure>
	> | null>(null);

	if (!user || !isAllowedRole(user.rol)) {
		return null;
	}

	const role = user.rol;
	const procedureIsClosed = isClosed(procedure?.status);
	const canEditVitals = role === 'ENFERMERO' && !procedureIsClosed;
	const canComment =
		(role === 'ENFERMERO' || role === 'MEDICO') && !procedureIsClosed;
	const canClose = role === 'MEDICO' && !procedureIsClosed;

	async function loadProcedure(nextProcedureId: string) {
		if (!nextProcedureId.trim()) return;
		setLoadingDetail(true);
		setDetailError('');
		setActionFeedback('');
		try {
			const data = await getTriageProcedure(nextProcedureId.trim());
			setProcedure(data);
			setProcedureId(nextProcedureId.trim());
			navigate(localePath(`/triage/${nextProcedureId.trim()}`, locale), {
				replace: true,
			});
		} catch (error) {
			setDetailError(mapTriageErrorToMessage(error, locale));
		} finally {
			setLoadingDetail(false);
		}
	}

	async function handleTextSubmit(payload: {
		patient_id: string;
		text: string;
	}) {
		const response = await sendTriageTextInput(payload);
		setActionFeedback(content.patient.successTitle);
		await loadProcedure(response.procedure_id);
	}

	async function handleVoiceSubmit(payload: {
		patient_id: string;
		audio: File;
	}) {
		const response = await sendTriageVoiceInput(payload);
		setActionFeedback(content.patient.successTitle);
		await loadProcedure(response.procedure_id);
	}

	async function handleDownloadPdf() {
		if (!procedureId) return;
		setActionFeedback('');
		setDetailError('');
		try {
			const blob = await downloadTriagePdf(procedureId);
			const objectUrl = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = objectUrl;
			anchor.download = `triage-${procedureId}.pdf`;
			anchor.click();
			URL.revokeObjectURL(objectUrl);
		} catch (error) {
			setDetailError(mapTriageErrorToMessage(error, locale));
		}
	}

	async function handleSaveVitals(vitals: TriageVitalSigns) {
		if (!procedure) return;
		if (!canEditVitals) {
			setDetailError(content.errors.actionNotAllowed);
			return;
		}

		setDetailError('');
		await updateTriageVitalSigns(procedure.procedure_id, {
			patient_id: procedure.patient_id,
			vital_signs: vitals,
		});
		await loadProcedure(procedure.procedure_id);
	}

	async function handleComment(comment: string) {
		if (!procedure) return;
		if (!canComment) {
			setDetailError(content.errors.actionNotAllowed);
			return;
		}
		setDetailError('');
		await addTriageComment(procedure.procedure_id, {
			patient_id: procedure.patient_id,
			comment,
		});
		await loadProcedure(procedure.procedure_id);
	}

	async function handleClose(closeReason: string) {
		if (!procedure) return;
		if (!canClose) {
			setDetailError(content.errors.actionNotAllowed);
			return;
		}
		setDetailError('');
		await closeTriageProcedure(procedure.procedure_id, {
			patient_id: procedure.patient_id,
			close_reason: closeReason,
		});
		await loadProcedure(procedure.procedure_id);
	}

	const vitals = procedure?.vital_signs;

	return (
		<div className="min-h-screen bg-background px-4 py-4 sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-6xl space-y-4">
				<header className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<h1 className="text-xl font-semibold text-foreground sm:text-2xl">
								{content.title}
							</h1>
							<p className="text-sm text-muted-foreground">
								{content.subtitle}
							</p>
						</div>
						<Link to={localePath('/dashboard', locale)}>
							<Button variant="outline">
								{m.dashboardSidebarOverview({}, { locale })}
							</Button>
						</Link>
					</div>
				</header>

				{role === 'PACIENTE' && (
					<Card className="border-border/70 bg-card/95">
						<CardHeader>
							<CardTitle>{content.newTriageMenu}</CardTitle>
							<CardDescription>{content.subtitle}</CardDescription>
						</CardHeader>
						<CardContent>
							<NewTriageForm
								content={content}
								onSubmitText={handleTextSubmit}
								onSubmitVoice={handleVoiceSubmit}
							/>
						</CardContent>
					</Card>
				)}

				<Card className="border-border/70 bg-card/95">
					<CardHeader>
						<CardTitle>{content.detail.heading}</CardTitle>
						<CardDescription>{content.detail.status}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
							<Field className="w-full">
								<FieldLabel htmlFor="procedure-id-input">
									{content.patient.procedureId}
								</FieldLabel>
								<Input
									id="procedure-id-input"
									value={procedureId}
									onChange={(event) => setProcedureId(event.target.value)}
								/>
							</Field>
							<Button
								type="button"
								onClick={() => {
									void loadProcedure(procedureId);
								}}
								disabled={loadingDetail || !procedureId.trim()}
							>
								<ArrowPathIcon className="mr-2 h-4 w-4" />
								{content.detail.refresh}
							</Button>
							<Button
								type="button"
								variant="outline"
								aria-label={m.a11yTriagePdfDownload({}, { locale })}
								onClick={() => {
									void handleDownloadPdf();
								}}
								disabled={!procedure}
							>
								<DocumentArrowDownIcon className="mr-2 h-4 w-4" />
								{content.patient.downloadPdf}
							</Button>
						</div>

						{actionFeedback && (
							<Alert>
								<AlertDescription>{actionFeedback}</AlertDescription>
							</Alert>
						)}
						{detailError && (
							<Alert variant="destructive">
								<AlertDescription>{detailError}</AlertDescription>
							</Alert>
						)}

						{loadingDetail ? (
							<div className="space-y-3">
								<Skeleton className="h-24 rounded-xl" />
								<Skeleton className="h-24 rounded-xl" />
							</div>
						) : !procedure ? (
							<p className="text-sm text-muted-foreground">
								{content.detail.empty}
							</p>
						) : (
							<div className="space-y-4">
								<div className="flex flex-wrap gap-2">
									<Badge variant="outline">
										{content.patient.procedureId}: {procedure.procedure_id}
									</Badge>
									<Badge
										variant={procedureIsClosed ? 'destructive' : 'secondary'}
									>
										{content.detail.status}: {procedure.status}
									</Badge>
								</div>

								<section className="space-y-2 rounded-xl border border-border/70 p-3">
									<h2 className="text-sm font-semibold text-foreground">
										{content.detail.triageData}
									</h2>
									{procedure.triage_data.sections?.length ? (
										<ul className="space-y-2">
											{procedure.triage_data.sections.map((section) => (
												<li key={`${section.title}-${section.content}`}>
													<p className="text-sm font-medium text-foreground">
														{section.title}
													</p>
													<p className="text-sm text-muted-foreground">
														{section.content}
													</p>
												</li>
											))}
										</ul>
									) : (
										<p className="text-sm text-muted-foreground">
											{procedure.triage_data.summary ?? content.detail.empty}
										</p>
									)}
								</section>

								<section className="space-y-2 rounded-xl border border-border/70 p-3">
									<h2 className="text-sm font-semibold text-foreground">
										{content.detail.vitalSigns}
									</h2>
									{vitals ? (
										<div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
											{Object.entries(vitals).map(([key, value]) => (
												<p key={key}>
													<span className="font-medium text-foreground">
														{key}
													</span>
													: {String(value)}
												</p>
											))}
										</div>
									) : (
										<p className="text-sm text-muted-foreground">
											{content.detail.empty}
										</p>
									)}
								</section>

								<section className="space-y-2 rounded-xl border border-border/70 p-3">
									<h2 className="text-sm font-semibold text-foreground">
										{content.detail.comments}
									</h2>
									{procedure.comments?.length ? (
										<ul className="space-y-2">
											{procedure.comments.map((comment) => (
												<li
													key={comment.id}
													className="rounded-lg bg-muted/40 p-2"
												>
													<p className="text-xs text-muted-foreground">
														{comment.author_role} -{' '}
														{new Date(comment.created_at).toLocaleString(
															locale,
														)}
													</p>
													<p className="text-sm text-foreground">
														{comment.comment}
													</p>
												</li>
											))}
										</ul>
									) : (
										<p className="text-sm text-muted-foreground">
											{content.detail.empty}
										</p>
									)}
								</section>

								{procedureIsClosed && (
									<Alert role="alert" aria-label={m.a11yTriageStatusClosed({}, { locale })}>
										<AlertDescription>
											{content.detail.closedLabel}
										</AlertDescription>
									</Alert>
								)}

								{role === 'ENFERMERO' && (
									<section className="space-y-3 rounded-xl border border-border/70 p-3">
										<h2 className="text-sm font-semibold text-foreground">
											{content.detail.vitalSigns}
										</h2>
										<VitalSignsForm
											content={content}
											initialValues={procedure.vital_signs}
											disabled={!canEditVitals}
											onSubmit={async (nextVitals) => {
												try {
													await handleSaveVitals(nextVitals);
												} catch (error) {
													setDetailError(
														mapTriageErrorToMessage(error, locale),
													);
												}
											}}
										/>
										<TriageCommentForm
											content={content}
											disabled={!canComment}
											onSubmit={async (comment) => {
												try {
													await handleComment(comment);
												} catch (error) {
													setDetailError(
														mapTriageErrorToMessage(error, locale),
													);
												}
											}}
										/>
									</section>
								)}

								{role === 'MEDICO' && (
									<section className="space-y-3 rounded-xl border border-border/70 p-3">
										<TriageCommentForm
											content={content}
											disabled={!canComment}
											onSubmit={async (comment) => {
												try {
													await handleComment(comment);
												} catch (error) {
													setDetailError(
														mapTriageErrorToMessage(error, locale),
													);
												}
											}}
										/>
										<CloseTriageForm
											content={content}
											disabled={!canClose}
											onSubmit={async (reason) => {
												try {
													await handleClose(reason);
												} catch (error) {
													setDetailError(
														mapTriageErrorToMessage(error, locale),
													);
												}
											}}
										/>
									</section>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

// Daniel Useche
