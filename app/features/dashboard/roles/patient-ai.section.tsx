import { ArrowUpTrayIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import { m } from '@/features/i18n/paraglide/messages';

const AI_API_URL = (
	import.meta.env.VITE_AI_API_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');
const MAX_FILE_MB = 10;

interface AiResult {
	version: string;
	clase_predicha: string;
	confianza: number;
	probabilidades: Record<string, number>;
	gradcam_png_base64: string;
}

function formatPercent(value: number) {
	return `${(value * 100).toFixed(2)}%`;
}

function formatMs(value: number | null) {
	if (!value) return '--';
	return `${Math.round(value)} ms`;
}

function resolveNetworkError(locale: 'es' | 'en') {
	return m.dashboardPatientAiNetworkError({}, { locale });
}

export function PatientAiSection({ locale }: { locale: 'es' | 'en' }) {
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [result, setResult] = useState<AiResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [elapsedMs, setElapsedMs] = useState<number | null>(null);

	useEffect(() => {
		if (!file) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);

	const probabilityEntries = useMemo(() => {
		if (!result) return [];
		return Object.entries(result.probabilidades).sort((a, b) => b[1] - a[1]);
	}, [result]);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const nextFile = event.target.files?.[0] ?? null;
		setFile(nextFile);
		setError('');
		setResult(null);
		setElapsedMs(null);
	};

	const handleReset = () => {
		setFile(null);
		setResult(null);
		setError('');
		setElapsedMs(null);
	};

	const handleSubmit = async () => {
		if (!file) {
			setError(m.dashboardPatientAiMissingFile({}, { locale }));
			return;
		}
		setLoading(true);
		setError('');
		setElapsedMs(null);
		try {
			const form = new FormData();
			form.append('file', file);
			const start = performance.now();
			const response = await fetch(`${AI_API_URL}/predict`, {
				method: 'POST',
				body: form,
			});
			const duration = performance.now() - start;
			if (!response.ok) {
				if (response.status === 415) {
					setError(m.dashboardPatientAiUnsupportedFile({}, { locale }));
					return;
				}
				if (response.status === 422) {
					setError(m.dashboardPatientAiInvalidImage({}, { locale }));
					return;
				}
				if (response.status === 503) {
					setError(m.dashboardPatientAiServiceUnavailable({}, { locale }));
					return;
				}
				setError(m.dashboardPatientAiRequestFailed({}, { locale }));
				return;
			}
			const payload = (await response.json()) as AiResult;
			setResult(payload);
			setElapsedMs(duration);
		} catch (err) {
			const message = err instanceof Error ? err.message.toLowerCase() : '';
			if (
				message.includes('failed to fetch') ||
				message.includes('networkerror') ||
				message.includes('load failed')
			) {
				setError(resolveNetworkError(locale));
				return;
			}
			setError(m.dashboardPatientAiRequestFailed({}, { locale }));
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-4">
			<div className="space-y-1">
				<h3 className="text-base font-semibold text-foreground">
					{m.dashboardPatientAiTitle({}, { locale })}
				</h3>
				<p className="text-xs text-muted-foreground">
					{m.dashboardPatientAiSubtitle({}, { locale })}
				</p>
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<div className="grid gap-4 lg:grid-cols-2">
				<div className="space-y-4">
					<Card className="border-border/70">
						<CardHeader className="space-y-1">
							<CardTitle className="text-sm">
								{m.dashboardPatientAiUploadTitle({}, { locale })}
							</CardTitle>
							<CardDescription>
								{m.dashboardPatientAiUploadDescription(
									{ maxSize: MAX_FILE_MB },
									{ locale },
								)}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<Input
								type="file"
								accept="image/png,image/jpeg"
								onChange={handleFileChange}
							/>
							{file && (
								<p className="text-xs text-muted-foreground">
									{file.name}
								</p>
							)}
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									onClick={handleSubmit}
									disabled={loading || !file}
									size="sm"
									className="gap-2"
								>
									<ArrowUpTrayIcon className="h-4 w-4" />
									{loading
										? m.dashboardPatientAiProcessing({}, { locale })
										: m.dashboardPatientAiUploadAction({}, { locale })}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleReset}
									disabled={!file && !result}
								>
									{m.dashboardPatientAiReset({}, { locale })}
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card className="border-border/70">
						<CardHeader className="space-y-1">
							<CardTitle className="text-sm">
								{m.dashboardPatientAiPredictionTitle({}, { locale })}
							</CardTitle>
							<CardDescription>
								{m.dashboardPatientAiPredictionSubtitle({}, { locale })}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{loading ? (
								<Skeleton className="h-20 w-full rounded-lg" />
							) : result ? (
								<div className="space-y-3">
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant="secondary">
											{m.dashboardPatientAiPredictionLabel({}, { locale })}:
										</Badge>
										<span className="text-sm font-semibold text-foreground">
											{result.clase_predicha}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant="outline">
											{m.dashboardPatientAiConfidenceLabel({}, { locale })}
										</Badge>
										<span className="text-sm text-foreground">
											{formatPercent(result.confianza)}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<span className="text-xs text-muted-foreground">
											{m.dashboardPatientAiVersionLabel({}, { locale })}
										</span>
										<span className="text-xs font-medium text-foreground">
											{result.version}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<span className="text-xs text-muted-foreground">
											{m.dashboardPatientAiResponseTimeLabel({}, { locale })}
										</span>
										<span className="text-xs font-medium text-foreground">
											{formatMs(elapsedMs)}
										</span>
									</div>
								</div>
							) : (
								<p className="text-xs text-muted-foreground">
									{m.dashboardPatientAiNoResult({}, { locale })}
								</p>
							)}
						</CardContent>
					</Card>

					<Card className="border-border/70">
						<CardHeader className="space-y-1">
							<CardTitle className="text-sm">
								{m.dashboardPatientAiProbabilitiesTitle({}, { locale })}
							</CardTitle>
							<CardDescription>
								{m.dashboardPatientAiProbabilitiesSubtitle({}, { locale })}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{loading ? (
								<Skeleton className="h-24 w-full rounded-lg" />
							) : probabilityEntries.length > 0 ? (
								<ul className="space-y-2">
									{probabilityEntries.map(([label, value]) => (
										<li
											key={label}
											className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2"
										>
											<span className="text-xs font-medium text-foreground">
												{label}
											</span>
											<span className="text-xs text-muted-foreground">
												{formatPercent(value)}
											</span>
										</li>
									))}
								</ul>
							) : (
								<p className="text-xs text-muted-foreground">
									{m.dashboardPatientAiNoResult({}, { locale })}
								</p>
							)}
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4">
					<Alert className="border-primary/30 bg-primary/5">
						<AlertDescription>
							{m.dashboardPatientAiNotice({}, { locale })}
						</AlertDescription>
					</Alert>

					<Card className="border-border/70">
						<CardHeader className="space-y-1">
							<CardTitle className="text-sm">
								{m.dashboardPatientAiPreviewLabel({}, { locale })}
							</CardTitle>
							<CardDescription>
								{m.dashboardPatientAiPreviewDescription({}, { locale })}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{previewUrl ? (
								<img
									src={previewUrl}
									alt={m.dashboardPatientAiPreviewLabel({}, { locale })}
									className="h-auto w-full rounded-lg border border-border/60 object-cover"
								/>
							) : (
								<div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-xs text-muted-foreground">
									<PhotoIcon className="mr-2 h-4 w-4" />
									{m.dashboardPatientAiNoResult({}, { locale })}
								</div>
							)}
						</CardContent>
					</Card>

					<Card className="border-border/70">
						<CardHeader className="space-y-1">
							<CardTitle className="text-sm">
								{m.dashboardPatientAiResultTitle({}, { locale })}
							</CardTitle>
							<CardDescription>
								{m.dashboardPatientAiResultDescription({}, { locale })}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{loading ? (
								<Skeleton className="h-44 w-full rounded-lg" />
							) : result?.gradcam_png_base64 ? (
								<img
									src={`data:image/png;base64,${result.gradcam_png_base64}`}
									alt={m.dashboardPatientAiResultTitle({}, { locale })}
									className="h-auto w-full rounded-lg border border-border/60 object-cover"
								/>
							) : (
								<div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-xs text-muted-foreground">
									<PhotoIcon className="mr-2 h-4 w-4" />
									{m.dashboardPatientAiNoResult({}, { locale })}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}
