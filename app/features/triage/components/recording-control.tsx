import { Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import { Badge } from '@/components/ui/badge/badge.component';

interface RecordingControlProps {
	isRecording: boolean;
	recordingTime: number;
	hasAudio: boolean;
	onStart: () => void;
	onStop: () => void;
	onClear: () => void;
	isDisabled?: boolean;
	labels: {
		title: string;
		description: string;
		start: string;
		stop: string;
		clear: string;
		recordingActive: string;
		recordedLabel: string;
	};
}

/**
 * Componente de controles para grabar audio.
 * Muestra estado de grabación, tiempo transcurrido y botones de acción.
 * Responsive y accesible con soporte para teclado.
 */
export function RecordingControl({
	isRecording,
	recordingTime,
	hasAudio,
	onStart,
	onStop,
	onClear,
	isDisabled = false,
	labels,
}: RecordingControlProps) {
	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
	};

	return (
		<Card className="w-full border-0 bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm dark:from-slate-900 dark:to-slate-800">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1">
						<CardTitle className="text-lg">{labels.title}</CardTitle>
						<CardDescription className="mt-1">
							{labels.description}
						</CardDescription>
					</div>
					{isRecording && (
						<Badge variant="destructive" className="animate-pulse">
							<span className="mr-1 inline-block h-2 w-2 rounded-full bg-current" />
							{formatTime(recordingTime)}
						</Badge>
					)}
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				{/* Controles de grabación */}
				<div className="flex flex-col gap-2 sm:flex-row">
					<Button
						type="button"
						onClick={onStart}
						disabled={isRecording || isDisabled}
						variant={isRecording ? 'secondary' : 'default'}
						className="gap-2 flex-1 sm:flex-none"
						aria-pressed={isRecording}
					>
						<Mic className="h-4 w-4" />
						<span className="hidden sm:inline">{labels.start}</span>
						<span className="sm:hidden">{labels.start}</span>
					</Button>

					<Button
						type="button"
						onClick={onStop}
						disabled={!isRecording || isDisabled}
						variant="outline"
						className="gap-2 flex-1 sm:flex-none"
					>
						<Square className="h-4 w-4" />
						<span className="hidden sm:inline">{labels.stop}</span>
						<span className="sm:hidden">{labels.stop}</span>
					</Button>

					{hasAudio && (
						<Button
							type="button"
							onClick={onClear}
							disabled={isRecording || isDisabled}
							variant="ghost"
							className="gap-2 flex-1 sm:flex-none"
						>
							{labels.clear}
						</Button>
					)}
				</div>

				{/* Indicador visual de grabación activa */}
				{isRecording && (
					<div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 dark:bg-blue-950">
						<div className="flex gap-1">
							<span className="inline-block h-2 w-2 animate-bounce rounded-full bg-blue-500" />
							<span className="inline-block h-2 w-2 animate-bounce rounded-full bg-blue-500 animation-delay-100" />
							<span className="inline-block h-2 w-2 animate-bounce rounded-full bg-blue-500 animation-delay-200" />
						</div>
						<span className="text-sm font-medium text-blue-900 dark:text-blue-100">
							{labels.recordingActive}
						</span>
					</div>
				)}

				{/* Estado de audio grabado */}
				{hasAudio && !isRecording && (
					<div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 dark:bg-green-950">
						<span className="inline-block h-2 w-2 rounded-full bg-green-500" />
						<span className="text-sm font-medium text-green-900 dark:text-green-100">
							{labels.recordedLabel} ({formatTime(recordingTime)})
						</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
