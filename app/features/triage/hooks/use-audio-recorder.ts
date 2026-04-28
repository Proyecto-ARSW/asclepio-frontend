import { useCallback, useRef, useState } from 'react';

export interface AudioRecorderState {
	isRecording: boolean;
	recordedAudio: File | null;
	isSupported: boolean;
	recordingTime: number;
}

export interface UseAudioRecorderReturn extends AudioRecorderState {
	startRecording: () => Promise<void>;
	stopRecording: () => Promise<void>;
	clearAudio: () => void;
	getBase64: () => Promise<string>;
}

/**
 * Hook personalizado para gestionar grabación de audio en el navegador.
 * Soporta grabación continua, pausa, y exportación a Base64 o File.
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
	const [isRecording, setIsRecording] = useState(false);
	const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
	const [recordingTime, setRecordingTime] = useState(0);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<BlobPart[]>([]);
	const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

	const isSupported =
		typeof navigator !== 'undefined' &&
		!!navigator.mediaDevices?.getUserMedia;

	const clearAudio = useCallback(() => {
		setRecordedAudio(null);
		setRecordingTime(0);
		chunksRef.current = [];
	}, []);

	const startRecording = useCallback(async () => {
		if (!isSupported || isRecording) {
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});

			mediaStreamRef.current = stream;
			chunksRef.current = [];

			const recorder = new MediaRecorder(stream, {
				mimeType: MediaRecorder.isTypeSupported('audio/webm')
					? 'audio/webm'
					: 'audio/mp4',
			});

			mediaRecorderRef.current = recorder;

			recorder.addEventListener('dataavailable', (event) => {
				if (event.data.size > 0) {
					chunksRef.current.push(event.data);
				}
			});

			recorder.addEventListener('stop', () => {
				const blob = new Blob(chunksRef.current, {
					type: recorder.mimeType || 'audio/webm',
				});

				const ext = recorder.mimeType?.includes('webm') ? 'webm' : 'mp4';
				const file = new File([blob], `triage-audio-${Date.now()}.${ext}`, {
					type: blob.type,
				});

				setRecordedAudio(file);

				// Limpiar stream
				mediaStreamRef.current?.getTracks().forEach((track) => {
					track.stop();
				});
				mediaStreamRef.current = null;

				// Detener contador de tiempo
				if (timerIntervalRef.current) {
					clearInterval(timerIntervalRef.current);
					timerIntervalRef.current = null;
				}
			});

			recorder.start();
			setIsRecording(true);

			// Iniciar contador de tiempo
			let elapsed = 0;
			timerIntervalRef.current = setInterval(() => {
				elapsed += 1;
				setRecordingTime(elapsed);
			}, 1000);
		} catch (error) {
			console.error('Error al iniciar grabación:', error);
			throw new Error(
				error instanceof Error
					? error.message
					: 'No se pudo iniciar la grabación de audio',
			);
		}
	}, [isSupported, isRecording]);

	const stopRecording = useCallback(async () => {
		if (!isRecording || !mediaRecorderRef.current) {
			return;
		}

		mediaRecorderRef.current.stop();
		setIsRecording(false);

		if (timerIntervalRef.current) {
			clearInterval(timerIntervalRef.current);
			timerIntervalRef.current = null;
		}
	}, [isRecording]);

	const getBase64 = useCallback(async (): Promise<string> => {
		if (!recordedAudio) {
			throw new Error('No audio grabado');
		}

		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				// Extraer parte Base64 si es data:audio/...;base64,...
				const base64 = result.includes(',')
					? result.split(',')[1]
					: result;
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(recordedAudio);
		});
	}, [recordedAudio]);

	return {
		isRecording,
		recordedAudio,
		isSupported,
		recordingTime,
		startRecording,
		stopRecording,
		clearAudio,
		getBase64,
	};
}
