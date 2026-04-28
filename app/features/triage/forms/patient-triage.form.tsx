import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field/field.component';
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/components/ui/tabs/tabs.component';
import { Textarea } from '@/components/ui/textarea/textarea.component';
import type { TriageContent } from '@/features/triage/triage-content';
import { RecordingControl } from '@/features/triage/components/recording-control';
import { useAudioRecorder } from '@/features/triage/hooks/use-audio-recorder';

interface PatientTriageFormProps {
	content: TriageContent;
	onSubmitText: (payload: { text: string }) => Promise<void>;
	onSubmitVoice: (payload: {
		audio_base64: string;
		file_name: string;
		mime_type: string;
	}) => Promise<void>;
}

/**
 * Formulario específico para pacientes que permite iniciar triage por texto o voz.
 * No solicita cédula ni permite subir archivo de audio; solo grabación directa.
 * El JWT autenticado se envía automáticamente en las cabeceras a ISISvoice.
 */
export function PatientTriageForm({
	content,
	onSubmitText,
	onSubmitVoice,
}: PatientTriageFormProps) {
	const [activeMode, setActiveMode] = useState<'text' | 'voice'>('text');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const {
		isRecording,
		recordedAudio,
		recordingTime,
		startRecording,
		stopRecording,
		clearAudio,
		isSupported,
		getBase64,
	} = useAudioRecorder();

	const form = useForm({
		defaultValues: {
			text: '',
			submitError: '',
		},
		onSubmit: async ({ value }) => {
			setIsSubmitting(true);
			form.setFieldValue('submitError', '');

			try {
				if (activeMode === 'text') {
					await onSubmitText({
						text: value.text,
					});
				} else {
					if (!recordedAudio) {
						form.setFieldValue('submitError', content.errors.required);
						return;
					}
					const audioBase64 = await getBase64();
					await onSubmitVoice({
						audio_base64: audioBase64,
						file_name: recordedAudio.name,
						mime_type: recordedAudio.type,
					});
				}
			} catch (error) {
				form.setFieldValue(
					'submitError',
					error instanceof Error ? error.message : content.errors.required,
				);
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	const handleStartRecording = async () => {
		try {
			await startRecording();
		} catch (error) {
			form.setFieldValue(
				'submitError',
				error instanceof Error ? error.message : content.errors.required,
			);
		}
	};

	const handleStopRecording = async () => {
		try {
			await stopRecording();
		} catch (error) {
			form.setFieldValue(
				'submitError',
				error instanceof Error ? error.message : content.errors.required,
			);
		}
	};

	const handleClearAudio = () => {
		clearAudio();
		form.setFieldValue('submitError', '');
	};

	return (
		<form
			aria-label={content.formTitle}
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
			className="space-y-6"
		>
			{/* Modos de entrada */}
			<Tabs
				value={activeMode}
				onValueChange={(value) => setActiveMode(value as 'text' | 'voice')}
			>
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="text">{content.modes.text}</TabsTrigger>
					<TabsTrigger value="voice" disabled={!isSupported}>
						{content.modes.voice}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="text" className="space-y-4">
					<form.Field
						name="text"
						validators={{
							onChange: ({ value }) =>
								activeMode !== 'text' || value.trim().length > 0
									? undefined
									: content.errors.required,
						}}
					>
						{(field) => (
							<Field data-invalid={Boolean(field.state.meta.errors.length)}>
								<FieldLabel htmlFor={field.name}>
									{content.patient.textLabel}
								</FieldLabel>
								<Textarea
									id={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									placeholder={content.patient.textPlaceholder}
									required={activeMode === 'text'}
									className="min-h-[120px]"
								/>
								<FieldDescription>
									{content.patient.textDesc}
								</FieldDescription>
								<FieldError
									errors={field.state.meta.errors.map((message) => ({
										message,
									}))}
								/>
							</Field>
						)}
					</form.Field>
				</TabsContent>

				<TabsContent value="voice" className="space-y-4">
					{!isSupported ? (
						<Alert variant="destructive">
							<AlertDescription>
								{content.patient.browserNotSupported}
							</AlertDescription>
						</Alert>
					) : (
						<RecordingControl
							isRecording={isRecording}
							recordingTime={recordingTime}
							hasAudio={!!recordedAudio}
							onStart={handleStartRecording}
							onStop={handleStopRecording}
							onClear={handleClearAudio}
							isDisabled={isSubmitting}
							labels={{
								title: content.patient.audioLabel,
								description: content.patient.audioDesc,
								start: content.patient.startRecording,
								stop: content.patient.stopRecording,
								clear: content.patient.audioClear,
								recordingActive: content.patient.recordingActive,
								recordedLabel: content.patient.recordedLabel,
							}}
						/>
					)}
				</TabsContent>
			</Tabs>

			{/* Botón de envío */}
			<div className="flex justify-end">
				<Button
					type="submit"
					disabled={
						isSubmitting ||
						(activeMode === 'voice' && !recordedAudio) ||
						(activeMode === 'text' && !form.state.values.text.trim())
					}
					className="min-w-[120px]"
				>
					{isSubmitting ? content.patient.sending : content.patient.send}
				</Button>
			</div>

			{/* Errores de envío */}
			<form.Field name="submitError">
				{(field) =>
					field.state.value ? (
						<Alert variant="destructive">
							<AlertDescription>{field.state.value}</AlertDescription>
						</Alert>
					) : null
				}
			</form.Field>
		</form>
	);
}
