import {
	ArrowPathIcon,
	DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
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
import type { AppLocale } from '@/features/i18n/locale-path';
import { NewTriageForm } from '@/features/triage/forms/new-triage.form';
import {
	downloadTriagePdf,
	getTriageProcedure,
	sendTriageTextInput,
	sendTriageVoiceInput,
} from '@/features/triage/triage.api';
import { getTriageContent } from '@/features/triage/triage-content';
import { mapTriageErrorToMessage } from '@/features/triage/triage-errors';

interface PatientTriageSectionProps {
	locale: AppLocale;
}

export function PatientTriageSection({ locale }: PatientTriageSectionProps) {
	const content = getTriageContent(locale);

	const [procedureId, setProcedureId] = useState('');
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [detailError, setDetailError] = useState('');
	const [actionFeedback, setActionFeedback] = useState('');
	const [procedure, setProcedure] = useState<Awaited<
		ReturnType<typeof getTriageProcedure>
	> | null>(null);

	const procedureIsClosed = procedure?.status?.toLowerCase() === 'closed';

	async function loadProcedure(nextProcedureId: string) {
		if (!nextProcedureId.trim()) return;
		setLoadingDetail(true);
		setDetailError('');
		setActionFeedback('');
		try {
			const data = await getTriageProcedure(nextProcedureId.trim());
			setProcedure(data);
			setProcedureId(nextProcedureId.trim());
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

	const vitals = procedure?.vital_signs;

	return (
		<div className="space-y-4">
			<Card className="border-border/70 bg-card/95">
				<CardHeader>
					<CardTitle>{content.title}</CardTitle>
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
										{procedure.triage_data.sections.map((s) => (
											<li key={`${s.title}-${s.content}`}>
												<p className="text-sm font-medium text-foreground">
													{s.title}
												</p>
												<p className="text-sm text-muted-foreground">
													{s.content}
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
													{new Date(comment.created_at).toLocaleString(locale)}
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
								<Alert>
									<AlertDescription>
										{content.detail.closedLabel}
									</AlertDescription>
								</Alert>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

// Daniel Useche
