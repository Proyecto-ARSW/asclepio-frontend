import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '@/components/ui/alert/alert.component';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import type { EyeHealthContent } from '@/features/eye-health/content/eye-health-content';
import type {
	EyeHealthClassification,
	IshiharaResult,
} from '@/features/eye-health/hooks/useEyeHealthTest';

interface ResultsStepProps {
	content: EyeHealthContent;
	classification: EyeHealthClassification;
	acuityCorrectCount: number;
	colorCorrectCount: number;
	colorResults: IshiharaResult[];
	astigmatismRisk: boolean;
	calibrationReady: boolean;
	saveState: {
		status: 'idle' | 'saving' | 'success' | 'error';
		errorMessage?: string;
	};
	onRetrySave: () => void;
	onRestart: () => void;
}

function interpretationText(
	content: EyeHealthContent,
	classification: EyeHealthClassification,
) {
	if (classification === 'excellent') {
		return {
			label: content.steps.results.levelExcellent,
			description: content.steps.results.excellentDescription,
		};
	}
	if (classification === 'good') {
		return {
			label: content.steps.results.levelGood,
			description: content.steps.results.goodDescription,
		};
	}
	return {
		label: content.steps.results.levelConsult,
		description: content.steps.results.consultDescription,
	};
}

export function ResultsStep({
	content,
	classification,
	acuityCorrectCount,
	colorCorrectCount,
	colorResults,
	astigmatismRisk,
	calibrationReady,
	saveState,
	onRetrySave,
	onRestart,
}: ResultsStepProps) {
	const interpretation = interpretationText(content, classification);
	const totalColorPlates = colorResults.length;

	return (
		<Card className="border-border/70 bg-card/90 shadow-sm backdrop-blur">
			<CardHeader className="space-y-2">
				<CardTitle className="text-xl">{content.steps.results.title}</CardTitle>
				<CardDescription>{content.steps.results.subtitle}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div className="rounded-xl border border-border/70 bg-background/65 p-3">
						<p className="text-muted-foreground text-xs uppercase tracking-wide">
							{content.steps.results.acuityScore}
						</p>
						<p className="mt-1 text-lg font-semibold">
							{acuityCorrectCount} / 2
						</p>
					</div>
					<div className="rounded-xl border border-border/70 bg-background/65 p-3">
						<p className="text-muted-foreground text-xs uppercase tracking-wide">
							{content.steps.results.colorScore}
						</p>
						<p className="mt-1 text-lg font-semibold">
							{colorCorrectCount} / {totalColorPlates}
						</p>
					</div>
					<div className="rounded-xl border border-border/70 bg-background/65 p-3">
						<p className="text-muted-foreground text-xs uppercase tracking-wide">
							{content.steps.results.astigmatismStatus}
						</p>
						<p className="mt-1 text-lg font-semibold">
							{astigmatismRisk
								? content.steps.results.astigmatismRisk
								: content.steps.results.astigmatismNoRisk}
						</p>
					</div>
					<div className="rounded-xl border border-border/70 bg-background/65 p-3">
						<p className="text-muted-foreground text-xs uppercase tracking-wide">
							{content.steps.results.calibrationStatus}
						</p>
						<p className="mt-1 text-lg font-semibold">
							{calibrationReady
								? content.steps.results.calibrationReady
								: content.common.required}
						</p>
					</div>
				</div>

				<div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
					<p className="text-muted-foreground text-xs uppercase tracking-wide">
						{content.steps.results.interpretationTitle}
					</p>
					<div className="mt-2 flex items-center gap-2">
						<Badge variant="secondary">{interpretation.label}</Badge>
					</div>
					<p className="mt-2 text-sm leading-relaxed">
						{interpretation.description}
					</p>
				</div>

				{saveState.status === 'saving' && (
					<Alert>
						<AlertTitle>{content.steps.results.saveLoading}</AlertTitle>
					</Alert>
				)}

				{saveState.status === 'success' && (
					<Alert>
						<AlertTitle>{content.steps.results.saveSuccess}</AlertTitle>
					</Alert>
				)}

				{saveState.status === 'error' && (
					<Alert variant="destructive">
						<AlertTitle>{content.steps.results.saveErrorTitle}</AlertTitle>
						<AlertDescription>
							{content.steps.results.saveErrorDescription}
							{saveState.errorMessage ? ` (${saveState.errorMessage})` : ''}
						</AlertDescription>
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={onRetrySave}
							className="mt-3"
						>
							{content.steps.results.retrySave}
						</Button>
					</Alert>
				)}

				<Button type="button" variant="outline" onClick={onRestart}>
					{content.steps.results.restart}
				</Button>
			</CardContent>
		</Card>
	);
}
