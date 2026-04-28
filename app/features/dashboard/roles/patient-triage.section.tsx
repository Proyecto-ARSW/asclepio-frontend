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
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import type { AppLocale } from '@/features/i18n/locale-path';
import { PatientTriageForm } from '@/features/triage/forms/patient-triage.form';
import {
	downloadTriagePdf,
	getTriageProcedureFromISIS,
	sendTriageTextInputToISIS,
	sendTriageVoiceInputToISIS,
} from '@/features/triage/triage.api';
import { getTriageContent } from '@/features/triage/triage-content';
import { mapTriageErrorToMessage } from '@/features/triage/triage-errors';
import type { TriageProcedure } from '@/features/triage/triage.types';

interface PatientTriageSectionProps {
	locale: AppLocale;
	onNavigateToTriage?: () => void;
}

export function PatientTriageSection({
	locale,
	onNavigateToTriage,
}: PatientTriageSectionProps) {
	const content = getTriageContent(locale);

	const [loadingDetail, setLoadingDetail] = useState(false);
	const [detailError, setDetailError] = useState('');
	const [actionFeedback, setActionFeedback] = useState('');
	const [procedure, setProcedure] = useState<TriageProcedure | null>(null);

	const procedureIsClosed = procedure?.status?.toLowerCase() === 'closed';

	async function loadProcedure(procedureId: string) {
		if (!procedureId.trim()) return;
		setLoadingDetail(true);
		setDetailError('');
		setActionFeedback('');
		try {
			const data = await getTriageProcedureFromISIS(procedureId.trim());
			setProcedure(data);
		} catch (error) {
			setDetailError(mapTriageErrorToMessage(error, locale));
		} finally {
			setLoadingDetail(false);
		}
	}

	async function handleTextSubmit(payload: { text: string }) {
		setDetailError('');
		const response = await sendTriageTextInputToISIS({ text: payload.text });
		setActionFeedback(content.patient.successTitle);
		await loadProcedure(response.procedure_id);
	}

	async function handleVoiceSubmit(payload: {
		audio_base64: string;
		file_name: string;
		mime_type: string;
	}) {
		setDetailError('');
		const response = await sendTriageVoiceInputToISIS(payload);
		setActionFeedback(content.patient.successTitle);
		await loadProcedure(response.procedure_id);
	}

	async function handleDownloadPdf() {
		if (!procedure) return;
		setActionFeedback('');
		setDetailError('');
		try {
			const blob = await downloadTriagePdf(procedure.procedure_id);
			const objectUrl = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = objectUrl;
			anchor.download = `triage-${procedure.procedure_id}.pdf`;
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
					<div className="flex items-start justify-between gap-2">
						<div>
							<CardTitle>{content.title}</CardTitle>
							<CardDescription>{content.subtitle}</CardDescription>
						</div>
						{onNavigateToTriage && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={onNavigateToTriage}
							>
								{content.newTriageMenu}
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<PatientTriageForm
						content={content}
						onSubmitText={handleTextSubmit}
						onSubmitVoice={handleVoiceSubmit}
					/>
				</CardContent>
			</Card>

			{(actionFeedback || detailError) && (
				<div className="space-y-2">
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
				</div>
			)}

			{loadingDetail && (
				<div className="space-y-3">
					<Skeleton className="h-24 rounded-xl" />
					<Skeleton className="h-24 rounded-xl" />
				</div>
			)}

			{!loadingDetail && procedure && (
				<Card className="border-border/70 bg-card/95">
					<CardHeader className="pb-3">
						<CardTitle className="text-base">{content.detail.heading}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap gap-2 items-center">
							<Badge variant="outline" className="font-mono text-xs">
								{content.patient.procedureId}: {procedure.procedure_id}
							</Badge>
							<Badge variant={procedureIsClosed ? 'destructive' : 'secondary'}>
								{procedure.status}
							</Badge>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => void handleDownloadPdf()}
								disabled={!procedure}
							>
								{content.patient.downloadPdf}
							</Button>
						</div>

						<section className="space-y-2 rounded-xl border border-border/70 p-3">
							<h2 className="text-sm font-semibold text-foreground">
								{content.detail.triageData}
							</h2>
							{procedure.triage_data.sections?.length ? (
								<ul className="space-y-2">
									{procedure.triage_data.sections.map((s) => (
										<li key={`${s.title}-${s.content}`}>
											<p className="text-sm font-medium text-foreground">{s.title}</p>
											<p className="text-sm text-muted-foreground">{s.content}</p>
										</li>
									))}
								</ul>
							) : (
								<p className="text-sm text-muted-foreground">
									{procedure.triage_data.summary ?? content.detail.empty}
								</p>
							)}
						</section>

						{vitals && (
							<section className="space-y-2 rounded-xl border border-border/70 p-3">
								<h2 className="text-sm font-semibold text-foreground">
									{content.detail.vitalSigns}
								</h2>
								<div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
									{Object.entries(vitals).map(([key, value]) => (
										<p key={key}>
											<span className="font-medium text-foreground">{key}</span>
											: {String(value)}
										</p>
									))}
								</div>
							</section>
						)}

						{(procedure.comments?.length ?? 0) > 0 && (
							<section className="space-y-2 rounded-xl border border-border/70 p-3">
								<h2 className="text-sm font-semibold text-foreground">
									{content.detail.comments}
								</h2>
								<ul className="space-y-2">
									{procedure.comments!.map((comment) => (
										<li key={comment.id} className="rounded-lg bg-muted/40 p-2">
											<p className="text-xs text-muted-foreground">
												{comment.author_role} -{' '}
												{new Date(comment.created_at).toLocaleString(locale)}
											</p>
											<p className="text-sm text-foreground">{comment.comment}</p>
										</li>
									))}
								</ul>
							</section>
						)}

						{procedureIsClosed && (
							<Alert>
								<AlertDescription>{content.detail.closedLabel}</AlertDescription>
							</Alert>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
