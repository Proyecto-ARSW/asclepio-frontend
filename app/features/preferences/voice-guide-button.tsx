import {
	PauseIcon,
	PlayIcon,
	SpeakerWaveIcon,
	SpeakerXMarkIcon,
} from '@heroicons/react/24/solid';
import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { Button } from '@/components/ui/button/button.component';
import type { AppLocale } from '@/features/i18n/locale-path';
import { cn } from '@/lib/utils';
import { readUiPreferences, saveUiPreferences } from './ui-preferences';

type SupportedLocale = AppLocale;

function getLocalizedText(locale: SupportedLocale) {
	if (locale === 'en') {
		return {
			activate: 'Enable voice guidance',
			deactivate: 'Disable voice guidance',
			pause: 'Pause voice guidance',
			resume: 'Resume voice guidance',
			replay: 'Repeat guidance',
			activeState: 'Voice guidance enabled',
			inactiveState: 'Voice guidance disabled',
			unsupported:
				'Voice guidance is not available in this browser. You can continue using the interface with keyboard and screen reader.',
			activatedAnnouncement:
				'Voice guidance enabled. Use Alt + Shift + V to toggle quickly.',
			routeIntro: 'Current section:',
		};
	}

	if (locale === 'pt') {
		return {
			activate: 'Ativar guia por voz',
			deactivate: 'Desativar guia por voz',
			pause: 'Pausar guia por voz',
			resume: 'Retomar guia por voz',
			replay: 'Repetir guia',
			activeState: 'Guia por voz ativada',
			inactiveState: 'Guia por voz desativada',
			unsupported:
				'O guia por voz nao esta disponivel neste navegador. Voce pode continuar com teclado e leitor de tela.',
			activatedAnnouncement:
				'Guia por voz ativada. Use Alt + Shift + V para alternar rapidamente.',
			routeIntro: 'Secao atual:',
		};
	}

	if (locale === 'fr') {
		return {
			activate: 'Activer le guidage vocal',
			deactivate: 'Desactiver le guidage vocal',
			pause: 'Mettre en pause le guidage vocal',
			resume: 'Reprendre le guidage vocal',
			replay: 'Repeter le guidage',
			activeState: 'Guidage vocal active',
			inactiveState: 'Guidage vocal desactive',
			unsupported:
				'Le guidage vocal n est pas disponible sur ce navigateur. Vous pouvez continuer avec clavier et lecteur d ecran.',
			activatedAnnouncement:
				'Guidage vocal active. Utilisez Alt + Shift + V pour basculer rapidement.',
			routeIntro: 'Section actuelle:',
		};
	}

	return {
		activate: 'Activar guia por voz',
		deactivate: 'Desactivar guia por voz',
		pause: 'Pausar guia por voz',
		resume: 'Reanudar guia por voz',
		replay: 'Repetir guia',
		activeState: 'Guia por voz activada',
		inactiveState: 'Guia por voz desactivada',
		unsupported:
			'La guia por voz no esta disponible en este navegador. Puedes continuar con teclado y lector de pantalla.',
		activatedAnnouncement:
			'Guia por voz activada. Usa Alt + Shift + V para alternar rapidamente.',
		routeIntro: 'Seccion actual:',
	};
}

function getRouteLabel(pathname: string, locale: SupportedLocale): string {
	const isEnglish = locale === 'en';
	const isPortuguese = locale === 'pt';
	const isFrench = locale === 'fr';

	if (pathname.includes('/dashboard')) {
		if (isPortuguese) return 'Painel principal e acoes rapidas.';
		if (isFrench) return 'Tableau de bord et actions rapides.';
		return isEnglish
			? 'Dashboard and quick actions.'
			: 'Panel principal y acciones rapidas.';
	}
	if (pathname.includes('/login')) {
		if (isPortuguese) {
			return 'Login. Informe suas credenciais para continuar.';
		}
		if (isFrench) {
			return 'Connexion. Entrez vos identifiants pour continuer.';
		}
		return isEnglish
			? 'Login. Enter your credentials to continue.'
			: 'Inicio de sesion. Ingresa tus credenciales para continuar.';
	}
	if (pathname.includes('/register')) {
		if (isPortuguese) {
			return 'Formulario de cadastro. Complete os dados da conta.';
		}
		if (isFrench) {
			return 'Formulaire d inscription. Completez les informations du compte.';
		}
		return isEnglish
			? 'Registration form. Complete your account information.'
			: 'Formulario de registro. Completa tu informacion de cuenta.';
	}
	if (pathname.includes('/hospitals/select')) {
		if (isPortuguese) {
			return 'Seletor de hospitais. Escolha um hospital para continuar.';
		}
		if (isFrench) {
			return 'Selection d hopital. Choisissez un hopital pour continuer.';
		}
		return isEnglish
			? 'Hospital selector. Choose a hospital to continue.'
			: 'Selector de hospitales. Elige un hospital para continuar.';
	}

	if (isPortuguese) return 'Navegacao geral disponivel nesta pagina.';
	if (isFrench) return 'Navigation generale disponible sur cette page.';

	return isEnglish
		? 'General navigation available on this page.'
		: 'Navegacion general disponible en esta pagina.';
}

export function VoiceGuideButton({ locale }: { locale: SupportedLocale }) {
	const location = useLocation();
	const shouldReduceMotion = useReducedMotion();
	const [enabled, setEnabled] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [isSupported, setIsSupported] = useState(true);
	const [liveMessage, setLiveMessage] = useState('');
	const hasMounted = useRef(false);
	const skipAutoRouteNarration = useRef(false);

	const text = useMemo(() => getLocalizedText(locale), [locale]);

	const selectVoice = useCallback(
		(utterance: SpeechSynthesisUtterance) => {
			const voices = window.speechSynthesis.getVoices();
			const preferred = voices.find((voice) =>
				voice.lang.toLowerCase().startsWith(locale),
			);
			if (preferred) {
				utterance.voice = preferred;
			}
		},
		[locale],
	);

	const speak = useCallback(
		(message: string, interrupt = true) => {
			if (!isSupported || typeof window === 'undefined') {
				return;
			}

			if (interrupt) {
				window.speechSynthesis.cancel();
			}

			if (window.speechSynthesis.paused) {
				window.speechSynthesis.resume();
			}

			const utterance = new SpeechSynthesisUtterance(message);
			utterance.lang =
				locale === 'en'
					? 'en-US'
					: locale === 'pt'
						? 'pt-BR'
						: locale === 'fr'
							? 'fr-FR'
							: 'es-CO';
			utterance.rate = 1;
			utterance.pitch = 1;
			utterance.volume = 1;
			selectVoice(utterance);

			const emit = () => window.speechSynthesis.speak(utterance);

			if (interrupt) {
				// Algunos navegadores requieren un pequeño delay entre cancel y speak.
				window.setTimeout(emit, 40);
				return;
			}

			emit();
		},
		[isSupported, locale, selectVoice],
	);

	const updatePreference = useCallback((nextEnabled: boolean) => {
		const current = readUiPreferences();
		saveUiPreferences({ ...current, voiceGuideEnabled: nextEnabled });
	}, []);

	const toggleVoiceGuide = useCallback(
		(nextEnabled: boolean) => {
			if (nextEnabled && !isSupported) {
				setLiveMessage(text.unsupported);
				setEnabled(false);
				setIsPaused(false);
				updatePreference(false);
				return;
			}

			setEnabled(nextEnabled);
			setIsPaused(false);
			updatePreference(nextEnabled);

			const nextMessage = nextEnabled ? text.activeState : text.inactiveState;
			setLiveMessage(nextMessage);

			if (!nextEnabled && typeof window !== 'undefined') {
				window.speechSynthesis.cancel();
				return;
			}

			skipAutoRouteNarration.current = true;
			speak(text.activatedAnnouncement, true);
		},
		[
			isSupported,
			speak,
			text.activatedAnnouncement,
			text.activeState,
			text.inactiveState,
			text.unsupported,
			updatePreference,
		],
	);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const supported =
			typeof window.speechSynthesis !== 'undefined' &&
			typeof SpeechSynthesisUtterance !== 'undefined';
		setIsSupported(supported);

		const prefs = readUiPreferences();
		setEnabled(Boolean(prefs.voiceGuideEnabled) && supported);
		hasMounted.current = true;

		const loadVoices = () => {
			window.speechSynthesis.getVoices();
		};
		loadVoices();
		window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

		return () => {
			window.speechSynthesis.cancel();
			window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
		};
	}, []);

	useEffect(() => {
		if (!enabled || !hasMounted.current) {
			return;
		}

		if (skipAutoRouteNarration.current) {
			skipAutoRouteNarration.current = false;
			return;
		}

		// Narramos cambios de ruta de forma acotada para guiar sin saturar.
		const routeMessage = `${text.routeIntro} ${getRouteLabel(location.pathname, locale)}`;
		setLiveMessage(routeMessage);
		speak(routeMessage, true);
	}, [enabled, locale, location.pathname, speak, text.routeIntro]);

	useEffect(() => {
		function handleShortcut(event: KeyboardEvent) {
			if (
				!(event.altKey && event.shiftKey && event.key.toLowerCase() === 'v')
			) {
				return;
			}
			event.preventDefault();
			toggleVoiceGuide(!enabled);
		}

		window.addEventListener('keydown', handleShortcut);
		return () => window.removeEventListener('keydown', handleShortcut);
	}, [enabled, toggleVoiceGuide]);

	function handlePauseResume() {
		if (typeof window === 'undefined' || !enabled) {
			return;
		}

		if (isPaused) {
			window.speechSynthesis.resume();
			setIsPaused(false);
			setLiveMessage(text.resume);
			return;
		}

		window.speechSynthesis.pause();
		setIsPaused(true);
		setLiveMessage(text.pause);
	}

	function handleReplay() {
		if (!enabled) {
			return;
		}
		const message = `${text.routeIntro} ${getRouteLabel(location.pathname, locale)}`;
		setLiveMessage(message);
		speak(message, true);
	}

	const entryAnimation = shouldReduceMotion
		? undefined
		: {
				initial: { opacity: 0, y: 20 },
				animate: { opacity: 1, y: 0 },
				transition: { duration: 0.4 },
			};

	return (
		<motion.div
			className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6"
			{...entryAnimation}
		>
			<span className="sr-only" aria-live="polite" aria-atomic="true">
				{liveMessage}
			</span>

			{enabled && (
				<div className="rounded-2xl border border-primary/25 bg-card/95 p-2 shadow-xl backdrop-blur">
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							onClick={handlePauseResume}
							aria-label={isPaused ? text.resume : text.pause}
							disabled={!isSupported}
						>
							{isPaused ? <PlayIcon /> : <PauseIcon />}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleReplay}
							disabled={!isSupported}
						>
							{text.replay}
						</Button>
					</div>
				</div>
			)}

			<Button
				type="button"
				size="icon-lg"
				variant={enabled ? 'default' : 'outline'}
				aria-pressed={enabled}
				aria-label={enabled ? text.deactivate : text.activate}
				onClick={() => toggleVoiceGuide(!enabled)}
				className={cn(
					'rounded-2xl border border-primary/30 shadow-2xl transition-all',
					enabled
						? 'bg-primary text-primary-foreground hover:bg-primary/90'
						: 'bg-card/95 text-foreground hover:bg-accent',
				)}
			>
				{enabled ? <SpeakerWaveIcon /> : <SpeakerXMarkIcon />}
			</Button>

			{!isSupported && (
				<p className="max-w-xs rounded-xl border border-border bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-md">
					{text.unsupported}
				</p>
			)}
		</motion.div>
	);
}

// Daniel Useche
