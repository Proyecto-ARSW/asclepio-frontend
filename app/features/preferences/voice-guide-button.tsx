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
import { localeFromPathname } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { cn } from '@/lib/utils';
import { readUiPreferences, saveUiPreferences } from './ui-preferences';

type SupportedLocale = AppLocale;

// Mapeo de locale → código BCP-47 para SpeechSynthesisUtterance.lang.
// Usar el código exacto mejora la selección de voz del sistema operativo.
const LOCALE_TO_BCP47: Record<SupportedLocale, string> = {
	es: 'es-CO',
	en: 'en-US',
	pt: 'pt-BR',
	fr: 'fr-FR',
	de: 'de-DE',
};

// Selecciona la ruta label localizada usando el sistema i18n centralizado.
// Antes estaba hardcodeado aquí — buena práctica: un solo lugar de verdad para los textos.
function getRouteLabel(pathname: string, locale: SupportedLocale): string {
	if (pathname.includes('/dashboard')) {
		return m.a11yRouteDashboard({}, { locale });
	}
	if (pathname.includes('/login')) {
		return m.a11yRouteLogin({}, { locale });
	}
	if (pathname.includes('/register')) {
		return m.a11yRouteRegister({}, { locale });
	}
	if (
		pathname.includes('/hospitals/select') ||
		pathname.includes('/select-hospital')
	) {
		return m.a11yRouteSelectHospital({}, { locale });
	}
	return m.a11yRouteDefault({}, { locale });
}

export function VoiceGuideButton({
	locale: localeProp,
}: {
	locale: SupportedLocale;
}) {
	const location = useLocation();
	// Derivamos el locale reactivamente desde la URL para que el botón
	// siempre hable en el idioma correcto sin depender de que el componente
	// padre se re-renderice tras un cambio de idioma por navegación.
	const locale =
		(localeFromPathname(location.pathname) as SupportedLocale) || localeProp;

	const shouldReduceMotion = useReducedMotion();
	const [enabled, setEnabled] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [isSupported, setIsSupported] = useState(true);
	const [liveMessage, setLiveMessage] = useState('');
	const hasMounted = useRef(false);
	const skipAutoRouteNarration = useRef(false);

	// Memoizamos los textos del locale actual para no recalcular en cada render.
	// useMemo con [locale] se invalida sólo cuando cambia el idioma.
	const text = useMemo(
		() => ({
			activate: m.a11yVoiceGuideActivate({}, { locale }),
			deactivate: m.a11yVoiceGuideDeactivate({}, { locale }),
			pause: m.a11yVoiceGuidePause({}, { locale }),
			resume: m.a11yVoiceGuideResume({}, { locale }),
			replay: m.a11yVoiceGuideReplay({}, { locale }),
			activeState: m.a11yVoiceGuideActiveState({}, { locale }),
			inactiveState: m.a11yVoiceGuideInactiveState({}, { locale }),
			unsupported: m.a11yVoiceGuideUnsupported({}, { locale }),
			activatedAnnouncement: m.a11yVoiceGuideActivatedAnnouncement(
				{},
				{ locale },
			),
			routeIntro: m.a11yVoiceGuideRouteIntro({}, { locale }),
		}),
		[locale],
	);

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
			// BCP-47 del locale activo → el navegador selecciona la voz correcta
			utterance.lang = LOCALE_TO_BCP47[locale] ?? 'es-CO';
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

	// Escucha eventos de cambio de sección del dashboard (sidebar nav).
	// El sidebar los despacha con el label localizado listo para narrar,
	// así el guía no necesita resolver traducciones por su cuenta.
	useEffect(() => {
		function onSectionChange(event: Event) {
			if (!enabled) return;
			const detail = (event as CustomEvent<{ label: string }>).detail;
			if (!detail?.label) return;
			const msg = `${text.routeIntro} ${detail.label}`;
			setLiveMessage(msg);
			speak(msg, true);
		}

		window.addEventListener('asclepio:section-change', onSectionChange);
		return () =>
			window.removeEventListener('asclepio:section-change', onSectionChange);
	}, [enabled, speak, text.routeIntro]);

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
			{/* aria-live="polite" anuncia cambios de estado al lector de pantalla
			    sin interrumpir la narración en curso. aria-atomic="true" garantiza
			    que el mensaje completo se lea, no solo la parte modificada. */}
			<span className="sr-only" aria-live="polite" aria-atomic="true">
				{liveMessage}
			</span>

			{enabled && (
				<div className="voice-guide-fab-panel rounded-2xl border border-primary/25 bg-card/95 p-2 shadow-xl backdrop-blur">
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
					// size-12 = 48×48 px: supera el mínimo WCAG 2.5.8 (44px táctil recomendado)
					// y mejora el área de toque para usuarios con motor grueso o pantalla táctil.
					'voice-guide-fab size-12 rounded-2xl border border-primary/30 shadow-2xl transition-all',
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
