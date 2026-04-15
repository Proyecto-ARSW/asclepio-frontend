import { useForm } from '@tanstack/react-form';
import { useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field/field.component';
import { Input } from '@/components/ui/input/input.component';
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/components/ui/tabs/tabs.component';
import { Textarea } from '@/components/ui/textarea/textarea.component';
import type { TriageContent } from '@/features/triage/triage-content';

interface NewTriageFormProps {
	content: TriageContent;
	onSubmitText: (payload: {
		patient_id: string;
		text: string;
	}) => Promise<void>;
	onSubmitVoice: (payload: {
		patient_id: string;
		audio: File;
	}) => Promise<void>;
}

export function NewTriageForm({
	content,
	onSubmitText,
	onSubmitVoice,
}: NewTriageFormProps) {
	const [activeMode, setActiveMode] = useState<'text' | 'voice'>('text');
	const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
	const [isRecording, setIsRecording] = useState(false);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);

	const form = useForm({
		defaultValues: {
			patientId: '',
			text: '',
			audio: null as File | null,
			submitError: '',
		},
		onSubmit: async ({ value }) => {
			form.setFieldValue('submitError', '');
			try {
				if (activeMode === 'text') {
					await onSubmitText({
						patient_id: value.patientId,
						text: value.text,
					});
					return;
				}

				const audio = value.audio ?? recordedAudio;
				if (!audio) {
					form.setFieldValue('submitError', content.errors.required);
					return;
				}
				await onSubmitVoice({
					patient_id: value.patientId,
					audio,
				});
			} catch (error) {
				form.setFieldValue(
					'submitError',
					error instanceof Error ? error.message : content.errors.required,
				);
			}
		},
	});

	async function startRecording() {
		if (!navigator.mediaDevices?.getUserMedia || isRecording) {
			return;
		}
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		mediaStreamRef.current = stream;
		const chunks: BlobPart[] = [];
		const recorder = new MediaRecorder(stream);
		mediaRecorderRef.current = recorder;

		recorder.addEventListener('dataavailable', (event) => {
			if (event.data.size > 0) {
				chunks.push(event.data);
			}
		});

		recorder.addEventListener('stop', () => {
			const blob = new Blob(chunks, {
				type: recorder.mimeType || 'audio/webm',
			});
			const ext = recorder.mimeType.includes('ogg') ? 'ogg' : 'webm';
			const file = new File([blob], `triage-audio.${ext}`, {
				type: blob.type,
			});
			setRecordedAudio(file);
			form.setFieldValue('audio', file);
			mediaStreamRef.current?.getTracks().forEach((track) => {
				track.stop();
			});
			mediaStreamRef.current = null;
		});

		recorder.start();
		setIsRecording(true);
	}

	function stopRecording() {
		if (!isRecording) return;
		mediaRecorderRef.current?.stop();
		setIsRecording(false);
	}

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
			className="space-y-4"
		>
			<form.Field
				name="patientId"
				validators={{
					onBlur: ({ value }) =>
						value.trim().length > 0 ? undefined : content.errors.required,
				}}
			>
				{(field) => (
					<Field data-invalid={Boolean(field.state.meta.errors.length)}>
						<FieldLabel htmlFor={field.name}>
							{content.patient.patientIdLabel}
						</FieldLabel>
						<Input
							id={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							required
						/>
						<FieldError
							errors={field.state.meta.errors.map((message) => ({ message }))}
						/>
					</Field>
				)}
			</form.Field>

			<Tabs
				value={activeMode}
				onValueChange={(value) => setActiveMode(value as 'text' | 'voice')}
			>
				<TabsList>
					<TabsTrigger value="text">{content.modes.text}</TabsTrigger>
					<TabsTrigger value="voice">{content.modes.voice}</TabsTrigger>
				</TabsList>

				<TabsContent value="text" className="space-y-3">
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
								/>
								<FieldError
									errors={field.state.meta.errors.map((message) => ({
										message,
									}))}
								/>
							</Field>
						)}
					</form.Field>
				</TabsContent>

				<TabsContent value="voice" className="space-y-3">
					<form.Field name="audio">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>
									{content.patient.audioLabel}
								</FieldLabel>
								<Input
									id={field.name}
									type="file"
									accept="audio/*"
									onChange={(event) => {
										const file = event.target.files?.[0] ?? null;
										field.handleChange(file);
										setRecordedAudio(file);
									}}
								/>
								<FieldDescription>{content.patient.audioHint}</FieldDescription>
							</Field>
						)}
					</form.Field>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								void startRecording();
							}}
							disabled={isRecording}
						>
							{content.patient.startRecording}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={stopRecording}
							disabled={!isRecording}
						>
							{content.patient.stopRecording}
						</Button>
					</div>
				</TabsContent>
			</Tabs>

			<form.Field name="submitError">
				{(field) =>
					field.state.value ? (
						<Alert variant="destructive">
							<AlertDescription>{field.state.value}</AlertDescription>
						</Alert>
					) : null
				}
			</form.Field>

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<Button
						type="submit"
						className="w-full"
						disabled={!canSubmit || isSubmitting}
					>
						{isSubmitting ? content.patient.sending : content.patient.send}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
