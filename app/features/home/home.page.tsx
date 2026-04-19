import {
	ArrowRightIcon,
	Bars3Icon,
	BeakerIcon,
	BellAlertIcon,
	BuildingOffice2Icon,
	CalendarDaysIcon,
	ChartBarSquareIcon,
	CheckBadgeIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ClipboardDocumentListIcon,
	ClockIcon,
	CpuChipIcon,
	DocumentTextIcon,
	LinkIcon,
	ListBulletIcon,
	MapPinIcon,
	MoonIcon,
	PlayCircleIcon,
	PuzzlePieceIcon,
	SunIcon,
	UserGroupIcon,
	XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, redirect, useLocation, useNavigate } from 'react-router';
import { Badge } from '@/components/ui/badge/badge.component';
import { buttonVariants } from '@/components/ui/button/button.component';
import { Card, CardContent } from '@/components/ui/card/card.component';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/dropdown-menu.component';
import { LanguageSwitcher } from '@/features/i18n/language-switcher';
import {
	type AppLocale,
	currentLocale,
	localePath,
} from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import {
	applyUiPreferences,
	readUiPreferences,
	saveUiPreferences,
	type ThemeMode,
} from '@/features/preferences/ui-preferences';
import {
	getStoredPreToken,
	hasValidAccessTokenInStorage,
} from '@/lib/auth-session';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export async function clientLoader() {
	if (typeof window === 'undefined') return null;
	const locale = currentLocale(window.location.pathname);
	if (getStoredPreToken()) {
		return redirect(localePath('/select-hospital', locale));
	}
	return null;
}

export function meta() {
	const locale = currentLocale();
	return [{ title: m.homeLandingMetaTitle({}, { locale }) }];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// IntersectionObserver hook: dispara solo la primera vez que el elemento entra
// al viewport. Más ligero que motion whileInView para secciones grandes.
function useInView(threshold = 0.15) {
	const ref = useRef<HTMLDivElement>(null);
	const [inView, setInView] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setInView(true);
					observer.disconnect();
				}
			},
			{ threshold },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [threshold]);
	return { ref, inView };
}

// Hook de efecto typewriter: revela el texto carácter a carácter.
// 'speed' controla el intervalo entre caracteres (ms). Se inicia solo cuando
// 'enabled' es true (usualmente cuando la sección entra al viewport).
function useTypewriter(text: string, speed = 45, enabled = true) {
	const [displayed, setDisplayed] = useState('');
	const [done, setDone] = useState(false);

	useEffect(() => {
		if (!enabled) return;
		setDisplayed('');
		setDone(false);
		let i = 0;
		const timer = setInterval(() => {
			i++;
			setDisplayed(text.slice(0, i));
			if (i >= text.length) {
				clearInterval(timer);
				setDone(true);
			}
		}, speed);
		return () => clearInterval(timer);
	}, [text, speed, enabled]);

	return { displayed, done };
}

// Componente de título con efecto typewriter + cursor parpadeante.
// Combina IntersectionObserver para activar la animación solo al entrar al viewport.
function TypewriterTitle({
	text,
	className,
	as: Tag = 'h1',
}: {
	text: string;
	className?: string;
	as?: 'h1' | 'h2' | 'h3' | 'p';
}) {
	const { ref, inView } = useInView(0.3);
	const prefersReduced = useReducedMotion();
	const { displayed, done } = useTypewriter(
		text,
		40,
		inView && !prefersReduced,
	);

	// Si prefiere movimiento reducido, muestra el texto completo inmediatamente
	const content = prefersReduced ? text : displayed;

	return (
		<Tag ref={ref} className={className}>
			{content}
			{/* Cursor blink: parpadeo discreto que desaparece al terminar la animación.
			    opacity [1,1,0,0] con linear simula un step de encendido/apagado. */}
			{!prefersReduced && inView && !done && (
				<motion.span
					className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-[0.1em] bg-primary"
					animate={{ opacity: [1, 1, 0, 0] }}
					transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
					aria-hidden="true"
				/>
			)}
		</Tag>
	);
}

// Wrapper de sección que revela su contenido con fade+slide al entrar al viewport.
// 'prefersReduced' suprime el desplazamiento y deja solo el fade.
function RevealSection({
	children,
	className,
	direction = 'up',
	delay = 0,
}: {
	children: React.ReactNode;
	className?: string;
	direction?: 'up' | 'left' | 'right';
	delay?: number;
}) {
	const { ref, inView } = useInView();
	const prefersReduced = useReducedMotion();
	const initial = prefersReduced
		? { opacity: 0 }
		: {
				opacity: 0,
				y: direction === 'up' ? 24 : 0,
				x: direction === 'left' ? -24 : direction === 'right' ? 24 : 0,
			};
	return (
		<motion.div
			ref={ref}
			className={className}
			initial={initial}
			animate={inView ? { opacity: 1, y: 0, x: 0 } : initial}
			transition={{ duration: 0.55, ease: 'easeOut', delay }}
		>
			{children}
		</motion.div>
	);
}

// ── Platform slide data ──────────────────────────────────────────────────────

function getSlideData(locale: AppLocale) {
	return [
		{
			tag: m.homeLandingPlatformSlide1Tag({}, { locale }),
			title: m.homeLandingPlatformSlide1Title({}, { locale }),
			description: m.homeLandingPlatformSlide1Description({}, { locale }),
			features: [
				m.homeLandingPlatformSlide1Feature1({}, { locale }),
				m.homeLandingPlatformSlide1Feature2({}, { locale }),
				m.homeLandingPlatformSlide1Feature3({}, { locale }),
			],
		},
		{
			tag: m.homeLandingPlatformSlide2Tag({}, { locale }),
			title: m.homeLandingPlatformSlide2Title({}, { locale }),
			description: m.homeLandingPlatformSlide2Description({}, { locale }),
			features: [
				m.homeLandingPlatformSlide2Feature1({}, { locale }),
				m.homeLandingPlatformSlide2Feature2({}, { locale }),
				m.homeLandingPlatformSlide2Feature3({}, { locale }),
			],
		},
		{
			tag: m.homeLandingPlatformSlide3Tag({}, { locale }),
			title: m.homeLandingPlatformSlide3Title({}, { locale }),
			description: m.homeLandingPlatformSlide3Description({}, { locale }),
			features: [
				m.homeLandingPlatformSlide3Feature1({}, { locale }),
				m.homeLandingPlatformSlide3Feature2({}, { locale }),
				m.homeLandingPlatformSlide3Feature3({}, { locale }),
			],
		},
		{
			tag: m.homeLandingPlatformSlide4Tag({}, { locale }),
			title: m.homeLandingPlatformSlide4Title({}, { locale }),
			description: m.homeLandingPlatformSlide4Description({}, { locale }),
			features: [
				m.homeLandingPlatformSlide4Feature1({}, { locale }),
				m.homeLandingPlatformSlide4Feature2({}, { locale }),
				m.homeLandingPlatformSlide4Feature3({}, { locale }),
			],
		},
		{
			tag: m.homeLandingPlatformSlide5Tag({}, { locale }),
			title: m.homeLandingPlatformSlide5Title({}, { locale }),
			description: m.homeLandingPlatformSlide5Description({}, { locale }),
			features: [
				m.homeLandingPlatformSlide5Feature1({}, { locale }),
				m.homeLandingPlatformSlide5Feature2({}, { locale }),
				m.homeLandingPlatformSlide5Feature3({}, { locale }),
			],
		},
	];
}

// ── Slide visuals ────────────────────────────────────────────────────────────

// Cada componente visual es el arte del lado derecho de cada slide.
// Usan solo CSS + heroicons para no depender de imágenes externas.

function AppointmentVisual() {
	const items = [
		{
			time: '10:00',
			label: 'Dr. Martín',
			color: 'text-emerald-500',
			Icon: CheckCircleIcon,
			bg: 'bg-emerald-500/10',
		},
		{
			time: '14:30',
			label: 'Dra. Laura',
			color: 'text-amber-500',
			Icon: ClockIcon,
			bg: 'bg-amber-500/10',
		},
		{
			time: '16:00',
			label: 'Dr. Pérez',
			color: 'text-rose-500',
			Icon: XCircleIcon,
			bg: 'bg-rose-500/10',
		},
	];
	return (
		<div className="relative flex h-full min-h-56 flex-col items-center justify-center overflow-hidden rounded-[1.75rem] bg-linear-to-br from-primary/8 via-background to-secondary/20 p-5">
			{/* Grid decorativo de fondo */}
			<div
				className="pointer-events-none absolute inset-0 opacity-[0.06]"
				style={{
					backgroundImage:
						'repeating-linear-gradient(0deg,transparent,transparent 28px,currentColor 28px,currentColor 29px),repeating-linear-gradient(90deg,transparent,transparent 28px,currentColor 28px,currentColor 29px)',
				}}
			/>
			<div className="relative w-full max-w-xs space-y-2.5">
				{items.map((item, i) => (
					// Cada tarjeta entra con stagger — se re-anima al cambiar de slide
					<motion.div
						key={item.time}
						className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 px-4 py-3 shadow-sm backdrop-blur"
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{
							delay: 0.15 + i * 0.09,
							duration: 0.35,
							ease: 'easeOut' as const,
						}}
					>
						<div
							className={cn(
								'grid h-8 w-8 shrink-0 place-items-center rounded-full',
								item.bg,
							)}
						>
							<item.Icon className={cn('h-4 w-4', item.color)} />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-xs font-semibold text-foreground">
								{item.time}
							</p>
							<p className="truncate text-[10px] text-muted-foreground">
								{item.label}
							</p>
						</div>
						<CalendarDaysIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
					</motion.div>
				))}
			</div>
		</div>
	);
}

function QueueVisual({ locale }: { locale: AppLocale }) {
	const prefersReducedMotion = useReducedMotion();
	const turns = [
		{
			code: 'T-001',
			type: m.dashboardReceptionistTipoUrgente({}, { locale }),
			borderColor: 'border-l-rose-500',
			badgeColor: 'bg-rose-500/10 text-rose-500',
		},
		{
			code: 'T-002',
			type: m.dashboardReceptionistTipoPrioritario({}, { locale }),
			borderColor: 'border-l-amber-500',
			badgeColor: 'bg-amber-500/10 text-amber-500',
		},
		{
			code: 'T-003',
			type: m.dashboardReceptionistTipoNormal({}, { locale }),
			borderColor: 'border-l-primary',
			badgeColor: 'bg-primary/10 text-primary',
		},
	];
	return (
		<div className="relative flex h-full min-h-56 flex-col items-center justify-center overflow-hidden rounded-[1.75rem] bg-linear-to-br from-secondary/15 via-background to-primary/8 p-5">
			{/* Campana animada en esquina superior derecha */}
			<motion.div
				className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-border bg-card/90 shadow-sm"
				animate={
					prefersReducedMotion
						? { rotate: 0 }
						: { rotate: [0, 12, -12, 8, -8, 0] }
				}
				transition={
					prefersReducedMotion
						? { duration: 0.2 }
						: { duration: 0.6, repeat: Infinity, repeatDelay: 2.5 }
				}
			>
				<BellAlertIcon className="h-5 w-5 text-primary" />
			</motion.div>
			<div className="relative w-full max-w-xs space-y-2.5">
				{turns.map((t, i) => (
					<motion.div
						key={t.code}
						className={cn(
							'flex items-center gap-3 rounded-2xl border-l-4 border border-border/60 bg-card/90 px-4 py-3 shadow-sm backdrop-blur',
							t.borderColor,
						)}
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{
							delay: 0.15 + i * 0.09,
							duration: 0.35,
							ease: 'easeOut' as const,
						}}
					>
						<ListBulletIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
						<p className="flex-1 text-xs font-semibold text-foreground">
							{t.code}
						</p>
						<span
							className={cn(
								'rounded-full px-2 py-0.5 text-[10px] font-semibold',
								t.badgeColor,
							)}
						>
							{t.type}
						</span>
					</motion.div>
				))}
			</div>
		</div>
	);
}

function AIVisual({ locale }: { locale: AppLocale }) {
	// Simula un visor de radiografía con mapa de calor GRAD-CAM
	const hotspots = [
		{
			id: 'left-upper',
			x: '38%',
			y: '30%',
			size: 'h-14 w-14',
			opacity: 'opacity-40',
			color: 'bg-amber-400',
		},
		{
			id: 'center',
			x: '55%',
			y: '45%',
			size: 'h-10 w-10',
			opacity: 'opacity-55',
			color: 'bg-rose-500',
		},
		{
			id: 'left-lower',
			x: '25%',
			y: '55%',
			size: 'h-8 w-8',
			opacity: 'opacity-30',
			color: 'bg-amber-300',
		},
	];
	return (
		<div className="relative flex h-full min-h-56 flex-col items-center justify-center overflow-hidden rounded-[1.75rem] bg-slate-900/90 p-5">
			{/* Panel de "radiografía" */}
			<motion.div
				className="relative h-44 w-52 overflow-hidden rounded-2xl bg-slate-800 shadow-inner"
				initial={{ opacity: 0, scale: 0.92 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' as const }}
			>
				{/* Textura de scan */}
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_40%_30%,rgba(148,163,184,0.18),transparent_60%),radial-gradient(ellipse_at_60%_70%,rgba(148,163,184,0.12),transparent_55%)]" />
				{/* Hotspots GRAD-CAM */}
				{hotspots.map((h, i) => (
					<motion.div
						key={h.id}
						className={cn(
							'absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl',
							h.size,
							h.opacity,
							h.color,
						)}
						style={{ left: h.x, top: h.y }}
						initial={{ opacity: 0 }}
						animate={{
							opacity: [
								0,
								(Number.parseFloat(h.opacity.replace('opacity-', '')) / 100) *
									0.9,
								Number.parseFloat(h.opacity.replace('opacity-', '')) / 100,
							],
						}}
						transition={{ delay: 0.3 + i * 0.12, duration: 0.6 }}
					/>
				))}
				{/* Etiqueta de clase */}
				<motion.div
					className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-emerald-500/40 bg-slate-900/80 px-3 py-1 text-[10px] font-semibold text-emerald-400"
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.55, duration: 0.3 }}
				>
					{m.homeLandingAiVisualPrediction({}, { locale })}
				</motion.div>
			</motion.div>
			{/* Indicador CNN */}
			<motion.div
				className="mt-3 flex items-center gap-2 rounded-full border border-border/30 bg-slate-800/80 px-3 py-1.5"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.65, duration: 0.3 }}
			>
				<CpuChipIcon className="h-3.5 w-3.5 text-primary" />
				<span className="text-[10px] font-semibold text-slate-300">
					{m.homeLandingAiVisualModelLabel({}, { locale })}
				</span>
			</motion.div>
		</div>
	);
}

function HistorialVisual({ locale }: { locale: AppLocale }) {
	const entries = [
		{
			date: '2024-03',
			label: m.homeLandingTimelineEntry1({}, { locale }),
			icon: DocumentTextIcon,
		},
		{
			date: '2024-06',
			label: m.homeLandingTimelineEntry2({}, { locale }),
			icon: ClipboardDocumentListIcon,
		},
		{
			date: '2024-11',
			label: m.homeLandingTimelineEntry3({}, { locale }),
			icon: CheckCircleIcon,
		},
	];
	return (
		<div className="relative flex h-full min-h-56 flex-col items-center justify-center overflow-hidden rounded-[1.75rem] bg-linear-to-br from-emerald-500/8 via-background to-primary/5 p-5">
			<div className="relative w-full max-w-xs">
				{entries.map((e, i) => (
					<motion.div
						key={e.date}
						className="flex items-start gap-3 pb-4 last:pb-0"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							delay: 0.12 + i * 0.1,
							duration: 0.35,
							ease: 'easeOut' as const,
						}}
					>
						{/* Línea de timeline + punto */}
						<div className="relative flex flex-col items-center">
							<div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-card/90 shadow-sm">
								<e.icon className="h-3.5 w-3.5 text-primary" />
							</div>
							{i < entries.length - 1 && (
								<div className="mt-1 h-7 w-px bg-border" />
							)}
						</div>
						<div className="pt-0.5">
							<p className="text-[10px] text-muted-foreground">{e.date}</p>
							<p className="text-xs font-semibold text-foreground">{e.label}</p>
						</div>
					</motion.div>
				))}
			</div>
		</div>
	);
}

function GameVisual() {
	const prefersReducedMotion = useReducedMotion();
	// Blobs del juego agar.io style
	const blobs = [
		{
			size: 'h-16 w-16',
			color: 'bg-primary/70',
			left: '15%',
			top: '30%',
			delay: 0,
		},
		{
			size: 'h-9 w-9',
			color: 'bg-secondary/80',
			left: '50%',
			top: '20%',
			delay: 0.4,
		},
		{
			size: 'h-6 w-6',
			color: 'bg-primary/40',
			left: '70%',
			top: '55%',
			delay: 0.2,
		},
		{
			size: 'h-5 w-5',
			color: 'bg-amber-400/70',
			left: '35%',
			top: '65%',
			delay: 0.6,
		},
		{
			size: 'h-3 w-3',
			color: 'bg-rose-400/60',
			left: '80%',
			top: '30%',
			delay: 0.8,
		},
		{
			size: 'h-3 w-3',
			color: 'bg-emerald-400/60',
			left: '25%',
			top: '45%',
			delay: 1,
		},
	];
	const leaderboard = [
		{ pos: '1', name: 'TuNick', pts: '420' },
		{ pos: '2', name: 'Jugador2', pts: '380' },
		{ pos: '3', name: 'Maria_M', pts: '295' },
	];
	const foodDots = Array.from({ length: 12 }, (_, i) => ({
		id: `dot-${(i * 37 + 10) % 90}-${(i * 23 + 15) % 80}`,
		left: `${(i * 37 + 10) % 90}%`,
		top: `${(i * 23 + 15) % 80}%`,
	}));
	return (
		<div className="relative flex h-full min-h-56 items-center justify-center overflow-hidden rounded-[1.75rem] bg-slate-900/85 p-5">
			{/* Puntos de "comida" en el fondo */}
			{foodDots.map((dot) => (
				<div
					key={dot.id}
					className="absolute h-1.5 w-1.5 rounded-full bg-primary/30"
					style={{ left: dot.left, top: dot.top }}
				/>
			))}
			{/* Blobs — animados con float */}
			{blobs.map((b, i) => (
				<motion.div
					key={`${b.left}-${b.top}-${b.size}`}
					className={cn('absolute rounded-full', b.size, b.color)}
					style={{ left: b.left, top: b.top }}
					animate={
						prefersReducedMotion
							? { y: 0, scale: 1 }
							: { y: [0, -5, 0], scale: [1, 1.04, 1] }
					}
					transition={
						prefersReducedMotion
							? { duration: 0.2 }
							: {
									duration: 2.8 + b.delay,
									repeat: Infinity,
									ease: 'easeInOut',
									delay: b.delay,
								}
					}
					initial={{ opacity: 0, scale: 0 }}
				>
					<motion.div
						className="h-full w-full rounded-full"
						initial={{ opacity: 0, scale: 0 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{
							delay: 0.1 + i * 0.07,
							duration: 0.4,
							ease: 'backOut' as const,
						}}
					/>
				</motion.div>
			))}
			{/* Mini leaderboard */}
			<motion.div
				className="absolute bottom-4 right-4 rounded-2xl border border-border/30 bg-slate-800/90 p-3 shadow-sm backdrop-blur"
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.5, duration: 0.35, ease: 'easeOut' as const }}
			>
				{leaderboard.map((row) => (
					<div key={row.pos} className="flex items-center gap-2 py-0.5">
						<span className="w-3 text-center text-[9px] font-bold text-muted-foreground">
							{row.pos}
						</span>
						<span className="flex-1 text-[10px] font-semibold text-slate-200">
							{row.name}
						</span>
						<span className="text-[9px] text-primary">{row.pts}</span>
					</div>
				))}
			</motion.div>
		</div>
	);
}

function SlideVisual({ index, locale }: { index: number; locale: AppLocale }) {
	if (index === 0) return <AppointmentVisual />;
	if (index === 1) return <QueueVisual locale={locale} />;
	if (index === 2) return <AIVisual locale={locale} />;
	if (index === 3) return <HistorialVisual locale={locale} />;
	return <GameVisual />;
}

// ── Platform Slider ──────────────────────────────────────────────────────────

function PlatformSlider({ locale }: { locale: AppLocale }) {
	const slides = getSlideData(locale);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [direction, setDirection] = useState(1);
	const prefersReducedMotion = useReducedMotion();

	const prev = useCallback(() => {
		setDirection(-1);
		setCurrentIndex((i) => (i - 1 + slides.length) % slides.length);
	}, [slides.length]);

	const next = useCallback(() => {
		setDirection(1);
		setCurrentIndex((i) => (i + 1) % slides.length);
	}, [slides.length]);

	const goTo = (index: number) => {
		setDirection(index > currentIndex ? 1 : -1);
		setCurrentIndex(index);
	};

	// Navegación por teclado — buena práctica de a11y
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'ArrowLeft') prev();
			if (e.key === 'ArrowRight') next();
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [prev, next]);

	// Variantes de transición: la dirección determina si entra por izquierda o derecha
	const slideVariants = {
		enter: (d: number) => ({
			x: prefersReducedMotion ? 0 : d > 0 ? '35%' : '-35%',
			opacity: 0,
		}),
		center: {
			x: 0,
			opacity: 1,
			transition: {
				duration: prefersReducedMotion ? 0.2 : 0.35,
				ease: 'easeOut' as const,
			},
		},
		exit: (d: number) => ({
			x: prefersReducedMotion ? 0 : d > 0 ? '-35%' : '35%',
			opacity: 0,
			transition: {
				duration: prefersReducedMotion ? 0.16 : 0.24,
				ease: 'easeIn' as const,
			},
		}),
	};

	const slide = slides[currentIndex];

	return (
		<section
			aria-label={m.a11yLandmarkPlatform({}, { locale })}
			className="px-4 pb-14 sm:px-6 lg:px-8"
		>
			<div className="mx-auto max-w-7xl rounded-[2rem] border border-border/60 bg-card/80 px-6 py-12 shadow-sm backdrop-blur lg:px-10">
				{/* Encabezado de la sección */}
				<RevealSection className="mx-auto mb-10 max-w-2xl text-center">
					<p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
						{m.homeLandingPlatformEyebrow({}, { locale })}
					</p>
					<TypewriterTitle
						text={m.homeLandingPlatformTitle({}, { locale })}
						as="h2"
						className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
					/>
				</RevealSection>

				{/* Área del slider — overflow-hidden evita que los slides salientes sean visibles */}
				<div className="relative h-136 overflow-hidden sm:h-124 lg:h-112">
					<AnimatePresence custom={direction} mode="wait">
						<motion.div
							key={currentIndex}
							custom={direction}
							variants={slideVariants}
							initial="enter"
							animate="center"
							exit="exit"
						>
							<div className="grid h-full items-center gap-8 lg:grid-cols-[1fr_1fr]">
								{/* Columna izquierda: texto */}
								<div className="space-y-5">
									<Badge variant="secondary" className="rounded-full px-3 py-1">
										{slide.tag}
									</Badge>
									<h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
										{slide.title}
									</h3>
									<p className="text-sm leading-relaxed text-muted-foreground">
										{slide.description}
									</p>
									<ul className="space-y-2">
										{slide.features.map((feature) => (
											<li
												key={feature}
												className="flex items-center gap-2 text-sm text-foreground"
											>
												{/* Checkmark verde — confirma que la feature es real */}
												<span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10">
													<CheckCircleIcon className="h-3.5 w-3.5 text-primary" />
												</span>
												{feature}
											</li>
										))}
									</ul>
								</div>

								{/* Columna derecha: arte visual */}
								<SlideVisual index={currentIndex} locale={locale} />
							</div>
						</motion.div>
					</AnimatePresence>
				</div>

				{/* Controles de navegación */}
				<div className="relative z-20 -mt-50 flex items-center justify-center gap-3 sm:-mt-40 lg:-mt-32">
					{/* Botón anterior — scale en hover y tap */}
					<motion.button
						type="button"
						onClick={prev}
						aria-label={m.homeLandingPlatformPrevSlideLabel({}, { locale })}
						className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
						whileHover={prefersReducedMotion ? undefined : { scale: 1.06 }}
						whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
					>
						<ChevronLeftIcon className="h-4 w-4" />
					</motion.button>

					{/* Indicadores de punto — el activo escala y cambia de color */}
					{slides.map((dotSlide, i) => (
						<motion.button
							key={dotSlide.title}
							type="button"
							onClick={() => goTo(i)}
							aria-label={m.homeLandingPlatformGoToSlide(
								{ number: String(i + 1) },
								{ locale },
							)}
							className="rounded-full"
							animate={{
								width: i === currentIndex ? 20 : 8,
								backgroundColor:
									i === currentIndex
										? 'hsl(var(--primary))'
										: 'hsl(var(--border))',
							}}
							style={{ height: 8 }}
							transition={{ duration: 0.3, ease: 'easeOut' }}
						/>
					))}

					{/* Botón siguiente */}
					<motion.button
						type="button"
						onClick={next}
						aria-label={m.homeLandingPlatformNextSlideLabel({}, { locale })}
						className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
						whileHover={prefersReducedMotion ? undefined : { scale: 1.06 }}
						whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
					>
						<ChevronRightIcon className="h-4 w-4" />
					</motion.button>
				</div>

				{/* Contador de diapositivas — accesibilidad */}
				<p
					className="mt-0 text-center text-xs text-muted-foreground"
					aria-live="polite"
				>
					{currentIndex + 1} / {slides.length}
				</p>
			</div>
		</section>
	);
}

// ── Services data ────────────────────────────────────────────────────────────

// 6 servicios con capacidades reales de la plataforma.
// Cada ítem incluye la clase de acento de color para animar.
function getServicesData(locale: AppLocale) {
	return [
		{
			icon: CalendarDaysIcon,
			title: m.homeLandingServiceCard1Title({}, { locale }),
			description: m.homeLandingServiceCard1Description({}, { locale }),
			badge: m.homeLandingServiceCard1Badge({}, { locale }),
			iconBg: 'bg-primary/10 group-hover:bg-primary/20',
			iconText: 'text-primary',
			iconHover: 'group-hover:rotate-12',
			topBar: 'from-primary to-blue-400',
			shadowHover: 'hover:shadow-primary/10',
		},
		{
			icon: ListBulletIcon,
			title: m.homeLandingServiceCard2Title({}, { locale }),
			description: m.homeLandingServiceCard2Description({}, { locale }),
			badge: m.homeLandingServiceCard2Badge({}, { locale }),
			iconBg: 'bg-amber-500/10 group-hover:bg-amber-500/20',
			iconText: 'text-amber-500',
			iconHover: 'group-hover:-rotate-12',
			topBar: 'from-amber-500 to-yellow-400',
			shadowHover: 'hover:shadow-amber-500/10',
		},
		{
			icon: CpuChipIcon,
			title: m.homeLandingServiceCard3Title({}, { locale }),
			description: m.homeLandingServiceCard3Description({}, { locale }),
			badge: m.homeLandingServiceCard3Badge({}, { locale }),
			iconBg: 'bg-violet-500/10 group-hover:bg-violet-500/20',
			iconText: 'text-violet-500',
			iconHover: 'group-hover:rotate-[20deg] group-hover:scale-110',
			topBar: 'from-violet-500 to-purple-400',
			shadowHover: 'hover:shadow-violet-500/10',
		},
		{
			icon: ClipboardDocumentListIcon,
			title: m.homeLandingServiceCard4Title({}, { locale }),
			description: m.homeLandingServiceCard4Description({}, { locale }),
			badge: m.homeLandingServiceCard4Badge({}, { locale }),
			iconBg: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
			iconText: 'text-emerald-500',
			iconHover: 'group-hover:scale-110',
			topBar: 'from-emerald-500 to-teal-400',
			shadowHover: 'hover:shadow-emerald-500/10',
		},
		{
			icon: PuzzlePieceIcon,
			title: m.homeLandingServiceCard5Title({}, { locale }),
			description: m.homeLandingServiceCard5Description({}, { locale }),
			badge: m.homeLandingServiceCard5Badge({}, { locale }),
			iconBg: 'bg-orange-500/10 group-hover:bg-orange-500/20',
			iconText: 'text-orange-500',
			iconHover: 'group-hover:-rotate-12 group-hover:scale-110',
			topBar: 'from-orange-500 to-amber-400',
			shadowHover: 'hover:shadow-orange-500/10',
		},
		{
			icon: BuildingOffice2Icon,
			title: m.homeLandingServiceCard6Title({}, { locale }),
			description: m.homeLandingServiceCard6Description({}, { locale }),
			badge: m.homeLandingServiceCard6Badge({}, { locale }),
			iconBg: 'bg-rose-500/10 group-hover:bg-rose-500/20',
			iconText: 'text-rose-500',
			iconHover: 'group-hover:scale-110 group-hover:rotate-6',
			topBar: 'from-rose-500 to-pink-400',
			shadowHover: 'hover:shadow-rose-500/10',
		},
	];
}

// ── Capacidades (badges) — reemplaza canales WhatsApp/Telegram ───────────────

function getCapabilities(locale: AppLocale) {
	return [
		{ Icon: CalendarDaysIcon, label: m.homeLandingCapability1({}, { locale }) },
		{ Icon: ListBulletIcon, label: m.homeLandingCapability2({}, { locale }) },
		{ Icon: CpuChipIcon, label: m.homeLandingCapability3({}, { locale }) },
		{ Icon: DocumentTextIcon, label: m.homeLandingCapability4({}, { locale }) },
		{ Icon: PuzzlePieceIcon, label: m.homeLandingCapability5({}, { locale }) },
		{
			Icon: BuildingOffice2Icon,
			label: m.homeLandingCapability6({}, { locale }),
		},
	];
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
	const navigate = useNavigate();
	const location = useLocation();
	const locale = currentLocale(location.pathname) as AppLocale;
	const prefersReducedMotion = useReducedMotion();
	const { user, selectedHospital, logout } = useAuthStore();
	const [isDarkMode, setIsDarkMode] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [authHydrated, setAuthHydrated] = useState(false);
	const [hasActiveSession, setHasActiveSession] = useState(false);

	const navItems = [
		{ id: 'home', label: m.homeLandingNavHome({}, { locale }) },
		{ id: 'about', label: m.homeLandingNavAbout({}, { locale }) },
		{ id: 'services', label: m.homeLandingNavServices({}, { locale }) },
	];

	const services = getServicesData(locale);

	const stats = [
		{ value: '30M+', label: m.homeLandingStatUsers({}, { locale }) },
		{ value: '30%', label: m.homeLandingStatSavings({}, { locale }) },
		{ value: '$100M', label: m.homeLandingStatCapital({}, { locale }) },
		{ value: '60+', label: m.homeLandingStatTeam({}, { locale }) },
	];

	const integrations = [
		{ icon: LinkIcon, label: m.homeLandingIntegrationFhir({}, { locale }) },
		{
			icon: ChartBarSquareIcon,
			label: m.homeLandingIntegrationAnalytics({}, { locale }),
		},
		{ icon: UserGroupIcon, label: m.homeLandingIntegrationEhr({}, { locale }) },
		{
			icon: CheckBadgeIcon,
			label: m.homeLandingIntegrationClaims({}, { locale }),
		},
	];

	const roles = [
		m.authRolePatient({}, { locale }),
		m.authRoleDoctor({}, { locale }),
		m.authRoleAdmin({}, { locale }),
		m.authRoleReceptionist({}, { locale }),
		m.authRoleNurse({}, { locale }),
	];

	const capabilities = getCapabilities(locale);
	const landingDashboardLabel = 'Dashboard';
	const isAuthenticated = authHydrated && hasActiveSession;
	const displayName = user
		? `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || user.email
		: '';
	const selectedHospitalName = selectedHospital?.nombre ?? '';
	const displayInitials =
		(user?.nombre?.[0] ?? '') + (user?.apellido?.[0] ?? '');

	const scrollToSection = (id: string) => {
		if (typeof document === 'undefined') return;
		document
			.getElementById(id)
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		setMobileMenuOpen(false);
	};

	useEffect(() => {
		if (typeof document === 'undefined') return;
		setIsDarkMode(document.documentElement.classList.contains('dark'));
	}, []);

	useEffect(() => {
		const rehydrateResult = useAuthStore.persist.rehydrate();
		const finalizeHydration = () => {
			setAuthHydrated(true);
			setHasActiveSession(hasValidAccessTokenInStorage());
		};

		if (rehydrateResult instanceof Promise) {
			void rehydrateResult.finally(finalizeHydration);
			return;
		}

		finalizeHydration();
	}, []);

	useEffect(() => {
		if (!authHydrated) return;
		setHasActiveSession(hasValidAccessTokenInStorage());
	}, [authHydrated]);

	function handleThemeToggle() {
		if (typeof document === 'undefined') return;
		const currentlyDark = document.documentElement.classList.contains('dark');
		const nextTheme: ThemeMode = currentlyDark ? 'light' : 'dark';
		const currentPrefs = readUiPreferences();
		applyUiPreferences({ ...currentPrefs, theme: nextTheme });
		saveUiPreferences({ ...currentPrefs, theme: nextTheme });
		setIsDarkMode(!currentlyDark);
	}

	function handleLandingLogout() {
		logout();
		setHasActiveSession(false);
		setMobileMenuOpen(false);
		navigate(localePath('/', locale));
	}

	return (
		<main
			aria-label={m.a11yLandmarkMain({}, { locale })}
			className="relative overflow-x-clip bg-background text-foreground selection:bg-primary/20"
		>
			{/* Imagen de cielo de fondo — la misma usada en selección de hospital.
			    opacity baja para no competir con el contenido, saturación sube
			    levemente para dar calidez al landing. */}
			<img
				src="/images/register-background.svg"
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-30 saturate-125"
			/>
			<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_oklch,var(--color-primary)_20%,transparent),transparent_34%),radial-gradient(circle_at_80%_18%,color-mix(in_oklch,var(--color-secondary)_35%,white),transparent_30%),linear-gradient(180deg,color-mix(in_oklch,var(--color-background)_96%,white)_0%,color-mix(in_oklch,var(--color-secondary)_20%,white)_52%,var(--color-background)_100%)]" />

			{/* ── NAVBAR ── */}
			<section
				id="home"
				className="sticky top-0 z-40 border-b border-border/50 bg-background/80 px-4 py-4 backdrop-blur-xl motion-safe:animate-step-in sm:px-6 lg:px-8"
			>
				<div className="mx-auto max-w-7xl rounded-[2rem] border border-border/60 bg-card/80 px-4 py-3 shadow-sm sm:px-6">
					<nav
						aria-label={m.a11yLandmarkNav({}, { locale })}
						className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
					>
						<div className="flex items-center justify-between gap-3">
							<div className="flex min-w-0 items-center gap-2">
								<img
									src="/favicon.png"
									alt={m.homeLandingBrand({}, { locale })}
									className="h-10 w-10 rounded-full border border-border/70 bg-card object-contain"
								/>
								<span className="truncate text-sm font-semibold tracking-tight">
									{m.homeLandingBrand({}, { locale })}
								</span>
							</div>

							<div className="flex items-center gap-2 md:hidden">
								<button
									type="button"
									onClick={handleThemeToggle}
									aria-label={m.homeLandingThemeToggle({}, { locale })}
									className={cn(
										buttonVariants({ variant: 'outline', size: 'sm' }),
										'h-8 w-8 shrink-0 rounded-full px-0',
									)}
								>
									{isDarkMode ? (
										<SunIcon className="h-4 w-4" />
									) : (
										<MoonIcon className="h-4 w-4" />
									)}
								</button>
								<LanguageSwitcher
									locale={locale}
									triggerClassName="h-8 shrink-0 rounded-full bg-card/90 px-2.5 text-xs font-semibold backdrop-blur"
								/>
								<button
									type="button"
									onClick={() => setMobileMenuOpen((prev) => !prev)}
									aria-label={
										mobileMenuOpen
											? m.dashboardSidebarCloseMenu({}, { locale })
											: m.dashboardSidebarOpenMenu({}, { locale })
									}
									className={cn(
										buttonVariants({ variant: 'outline', size: 'sm' }),
										'h-8 w-8 shrink-0 rounded-full px-0',
									)}
								>
									{mobileMenuOpen ? (
										<XMarkIcon className="h-4 w-4" />
									) : (
										<Bars3Icon className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>

						<ul className="hidden items-center gap-2 text-sm md:flex">
							{navItems.map((item) => (
								<li key={item.id}>
									<button
										type="button"
										onClick={() => scrollToSection(item.id)}
										className="rounded-full px-3 py-2 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
									>
										{item.label}
									</button>
								</li>
							))}
						</ul>

						<div className="hidden items-center gap-2 md:flex lg:gap-3">
							<button
								type="button"
								onClick={handleThemeToggle}
								aria-label={m.homeLandingThemeToggle({}, { locale })}
								className={cn(
									buttonVariants({ variant: 'outline', size: 'sm' }),
									'h-8 w-8 shrink-0 rounded-full px-0',
								)}
							>
								{isDarkMode ? (
									<SunIcon className="h-4 w-4" />
								) : (
									<MoonIcon className="h-4 w-4" />
								)}
							</button>
							<LanguageSwitcher
								locale={locale}
								triggerClassName="h-8 shrink-0 rounded-full bg-card/90 px-2.5 text-xs font-semibold backdrop-blur"
							/>
							{isAuthenticated ? (
								<>
									<div className="flex items-center gap-2">
										<div className="max-w-52 text-right">
											<p className="truncate text-xs font-semibold text-foreground">
												{displayName}
											</p>
											{selectedHospitalName && (
												<p className="truncate text-[11px] text-muted-foreground">
													{selectedHospitalName}
												</p>
											)}
										</div>
										<DropdownMenu>
											<DropdownMenuTrigger
												className={cn(
													buttonVariants({ variant: 'outline', size: 'sm' }),
													'h-9 w-9 shrink-0 rounded-full px-0 text-xs font-bold uppercase',
												)}
												aria-label={
													displayName || m.homeLandingBrand({}, { locale })
												}
											>
												{displayInitials || 'U'}
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="w-56">
												<DropdownMenuGroup>
													<DropdownMenuLabel className="space-y-0.5">
														<p className="truncate text-sm font-semibold text-foreground">
															{displayName}
														</p>
														{selectedHospitalName && (
															<p className="truncate text-xs text-muted-foreground">
																{selectedHospitalName}
															</p>
														)}
													</DropdownMenuLabel>
												</DropdownMenuGroup>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => {
														navigate(localePath('/dashboard', locale));
													}}
												>
													{landingDashboardLabel}
												</DropdownMenuItem>
												<DropdownMenuItem
													variant="destructive"
													onClick={handleLandingLogout}
												>
													{m.dashboardSidebarLogout({}, { locale })}
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</>
							) : (
								<>
									<Link
										to={localePath('/register', locale)}
										className={cn(
											buttonVariants({ variant: 'ghost', size: 'sm' }),
											'h-8 shrink-0 rounded-full px-3',
										)}
									>
										{m.homeLandingGetStarted({}, { locale })}
									</Link>
									<Link
										to={localePath('/login', locale)}
										className={cn(
											buttonVariants({ size: 'sm' }),
											'h-8 shrink-0 rounded-full px-3',
										)}
									>
										{m.homeLandingContactUs({}, { locale })}
										<ArrowRightIcon className="h-3.5 w-3.5" />
									</Link>
								</>
							)}
						</div>
					</nav>

					{/* Menú móvil — entra y sale con AnimatePresence + height collapse */}
					<AnimatePresence>
						{mobileMenuOpen && (
							<motion.div
								key="mobile-menu"
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ duration: 0.25, ease: 'easeInOut' }}
								className="overflow-hidden"
							>
								<div className="mt-1 space-y-4 border-t border-border/60 pt-4">
									<div className="flex flex-col gap-1.5">
										{navItems.map((item) => (
											<button
												key={item.id}
												type="button"
												onClick={() => scrollToSection(item.id)}
												className="w-full rounded-xl border border-border bg-background px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
											>
												{item.label}
											</button>
										))}
									</div>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										{isAuthenticated ? (
											<>
												<Link
													to={localePath('/dashboard', locale)}
													onClick={() => setMobileMenuOpen(false)}
													className={cn(
														buttonVariants({ size: 'sm' }),
														'justify-center rounded-full px-4',
													)}
												>
													{landingDashboardLabel}
													<ArrowRightIcon className="h-3.5 w-3.5" />
												</Link>
												<button
													type="button"
													onClick={handleLandingLogout}
													className={cn(
														buttonVariants({ variant: 'ghost', size: 'sm' }),
														'justify-center rounded-full px-4',
													)}
												>
													{m.dashboardSidebarLogout({}, { locale })}
												</button>
											</>
										) : (
											<>
												<Link
													to={localePath('/register', locale)}
													onClick={() => setMobileMenuOpen(false)}
													className={cn(
														buttonVariants({ variant: 'ghost', size: 'sm' }),
														'justify-center rounded-full px-4',
													)}
												>
													{m.homeLandingGetStarted({}, { locale })}
												</Link>
												<Link
													to={localePath('/login', locale)}
													onClick={() => setMobileMenuOpen(false)}
													className={cn(
														buttonVariants({ size: 'sm' }),
														'justify-center rounded-full px-4',
													)}
												>
													{m.homeLandingContactUs({}, { locale })}
													<ArrowRightIcon className="h-3.5 w-3.5" />
												</Link>
											</>
										)}
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</section>

			{/* ── HERO ── */}
			<section
				id="about"
				aria-label={m.a11yLandmarkHero({}, { locale })}
				className="scroll-mt-28 px-4 pb-10 pt-8 sm:px-6 lg:px-8"
			>
				<div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-xl lg:grid-cols-[1.08fr_0.92fr] lg:p-8">
					{/* Columna izquierda — desliza desde la izquierda */}
					<RevealSection direction="left" className="space-y-6">
						<Badge
							variant="secondary"
							className="rounded-full px-3 py-1 text-xs"
						>
							<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
							{m.homeLandingTrustedBadge({}, { locale })}
						</Badge>
						<TypewriterTitle
							text={m.homeLandingHeroTitle({}, { locale })}
							as="h1"
							className="max-w-xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
						/>
						<p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
							{m.homeLandingHeroSubtitle({}, { locale })}
						</p>

						{/* Capacidades reales de la plataforma — reemplaza WhatsApp/Telegram */}
						<div className="space-y-3">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
								{m.homeLandingPlatformCapabilitiesTitle({}, { locale })}
							</p>
							<div className="flex flex-wrap gap-2">
								{capabilities.map((cap, i) => (
									// Badges entran escalonados después de que el contenedor es visible
									<motion.span
										key={cap.label}
										initial={{ opacity: 0, scale: 0.85 }}
										whileInView={{ opacity: 1, scale: 1 }}
										viewport={{ once: true }}
										transition={{ duration: 0.25, delay: 0.08 + i * 0.06 }}
									>
										<Badge
											variant="outline"
											className="gap-1.5 rounded-full py-1"
										>
											<cap.Icon className="h-3 w-3" />
											{cap.label}
										</Badge>
									</motion.span>
								))}
							</div>
						</div>

						{/* Roles de la plataforma */}
						<div className="space-y-3">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
								{m.homeLandingRolesTitle({}, { locale })}
							</p>
							<div className="flex flex-wrap gap-2">
								{roles.map((role, i) => (
									<motion.span
										key={role}
										initial={{ opacity: 0, scale: 0.85 }}
										whileInView={{ opacity: 1, scale: 1 }}
										viewport={{ once: true }}
										transition={{ duration: 0.25, delay: 0.15 + i * 0.06 }}
									>
										<Badge variant="secondary" className="rounded-full">
											{role}
										</Badge>
									</motion.span>
								))}
							</div>
						</div>

						<div className="flex flex-wrap gap-3">
							<Link
								to={
									isAuthenticated
										? localePath('/dashboard', locale)
										: localePath('/register', locale)
								}
								className={cn(
									buttonVariants({ size: 'lg' }),
									'inline-flex rounded-full px-5 transition-all duration-300 hover:-translate-y-0.5',
								)}
							>
								{isAuthenticated
									? landingDashboardLabel
									: m.homeLandingHeroCta({}, { locale })}
								<ArrowRightIcon className="h-4 w-4" />
							</Link>
							{/* Botón de acceso rápido a hospitales cercanos — usa variant outline
							    para jerarquía visual secundaria respecto al CTA principal. */}
							<Link
								to={localePath('/nearby-hospitals', locale)}
								className={cn(
									buttonVariants({ variant: 'outline', size: 'lg' }),
									'inline-flex gap-2 rounded-full px-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/60 hover:text-primary',
								)}
							>
								<MapPinIcon className="h-4 w-4" />
								{m.nearbyHospitalsQuickAccess({}, { locale })}
							</Link>
						</div>
					</RevealSection>

					{/* Columna derecha — desliza desde la derecha */}
					<RevealSection
						direction="right"
						delay={0.1}
						className="relative min-h-100 rounded-[2rem] border border-border/50 bg-linear-to-br from-secondary via-background to-accent p-4 shadow-sm sm:min-h-105 sm:p-6"
					>
						<div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--color-primary)_35%,white)_0%,transparent_72%)]" />
						<img
							src="/images/doctor-image.webp"
							alt={m.homeLandingDoctorImageAlt({}, { locale })}
							loading="eager"
							decoding="async"
							fetchPriority="high"
							className="relative z-10 mx-auto mt-20 h-110 w-80 rounded-[1.75rem] object-cover object-top shadow-md sm:mt-8"
						/>

						{/* Tarjeta flotante izquierda — loop de float */}
						<motion.div
							className="absolute left-4 top-4 rounded-2xl border border-border bg-card/90 p-3 shadow-sm backdrop-blur md:left-6 md:top-6"
							animate={prefersReducedMotion ? { y: 0 } : { y: [0, -6, 0] }}
							transition={
								prefersReducedMotion
									? { duration: 0.2 }
									: {
											duration: 3.5,
											repeat: Infinity,
											ease: 'easeInOut',
										}
							}
						>
							<div className="mb-2 flex items-center gap-2">
								<BeakerIcon className="h-4 w-4 text-primary" />
								<p className="text-xs font-semibold text-foreground">
									{m.homeLandingTestCardTitle({}, { locale })}
								</p>
							</div>
							<div className="h-10 w-32 rounded-xl bg-linear-to-r from-secondary via-background to-accent p-2">
								<div className="h-full w-full rounded-md bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-primary)_24%,transparent)_20%,transparent_20%)] bg-size-[10px_10px]" />
							</div>
						</motion.div>

						{/* Tarjeta flotante derecha — flota con fase opuesta */}
						<motion.div
							className="absolute bottom-4 right-4 flex items-center gap-3 rounded-full border border-border bg-card/90 px-4 py-2 shadow-sm backdrop-blur md:bottom-6 md:right-6"
							animate={prefersReducedMotion ? { y: 0 } : { y: [0, 6, 0] }}
							transition={
								prefersReducedMotion
									? { duration: 0.2 }
									: {
											duration: 3.5,
											repeat: Infinity,
											ease: 'easeInOut',
											delay: 0.8,
										}
							}
						>
							<PlayCircleIcon className="h-6 w-6 text-primary" />
							<div>
								<p className="text-[10px] uppercase tracking-wide text-muted-foreground">
									{m.homeLandingIncomingCall({}, { locale })}
								</p>
								<p className="text-xs font-semibold text-foreground">
									{m.homeLandingIncomingDoctor({}, { locale })}
								</p>
							</div>
							<span className="h-2.5 w-2.5 rounded-full bg-primary" />
						</motion.div>
					</RevealSection>
				</div>
			</section>

			{/* ── PLATFORM FEATURE SLIDER ── */}
			<PlatformSlider locale={locale} />

			{/* ── SERVICIOS ── */}
			<section
				id="services"
				aria-label={m.a11yLandmarkServices({}, { locale })}
				className="scroll-mt-28 px-4 pb-14 sm:px-6 lg:px-8"
			>
				<div className="mx-auto max-w-7xl rounded-[2rem] border border-border/60 bg-card/85 px-6 py-12 shadow-sm backdrop-blur">
					{/* Encabezado con eyebrow + título + descripción — entra desde abajo */}
					<RevealSection className="mx-auto max-w-2xl text-center">
						<p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
							{m.homeLandingServicesBuiltEyebrow({}, { locale })}
						</p>
						<TypewriterTitle
							text={m.homeLandingServicesBuiltTitle({}, { locale })}
							as="h2"
							className="mt-3 text-4xl font-bold tracking-tight text-foreground"
						/>
						<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
							{m.homeLandingServicesBuiltDescription({}, { locale })}
						</p>
					</RevealSection>

					{/* Bento grid 3×2: cada tarjeta tiene color de acento único y animaciones ricas */}
					<div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{services.map((service, i) => (
							// backOut da un leve rebote al entrar — más llamativo que easeOut
							<motion.div
								key={service.title}
								className="group"
								initial={{ opacity: 0, y: 48, scale: 0.93 }}
								whileInView={{ opacity: 1, y: 0, scale: 1 }}
								viewport={{ once: true, margin: '-50px' }}
								transition={{
									duration: 0.55,
									ease: 'backOut',
									delay: i * 0.07,
								}}
								// Levitación suave al hacer hover
								whileHover={{
									y: -10,
									transition: { duration: 0.22, ease: 'easeOut' as const },
								}}
							>
								<Card
									className={cn(
										'relative h-full overflow-hidden rounded-3xl border-border/60 bg-background/95 transition-all duration-300 motion-reduce:transition-none',
										'hover:shadow-xl',
										service.shadowHover,
									)}
								>
									{/* Línea de color en la parte superior — se ensancha al hacer hover */}
									<div
										className={cn(
											'h-1 w-full bg-linear-to-r transition-all duration-300 group-hover:h-0.75',
											service.topBar,
										)}
									/>

									<CardContent className="p-6">
										{/* Cabecera: ícono + badge */}
										<div className="flex items-start justify-between">
											{/* Contenedor del ícono — escala y rota al hacer hover en la tarjeta */}
											<div
												className={cn(
													'grid h-12 w-12 place-items-center rounded-2xl transition-all duration-300',
													service.iconBg,
												)}
											>
												<service.icon
													className={cn(
														'h-5 w-5 transition-transform duration-300',
														service.iconText,
														service.iconHover,
													)}
												/>
											</div>

											{/* Badge de tecnología o dato — aparece con delay al entrar al viewport */}
											<motion.span
												className="rounded-full border border-border/60 bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
												initial={{ opacity: 0, scale: 0.7 }}
												whileInView={{ opacity: 1, scale: 1 }}
												viewport={{ once: true }}
												transition={{
													duration: 0.3,
													ease: 'backOut',
													delay: 0.2 + i * 0.06,
												}}
											>
												{service.badge}
											</motion.span>
										</div>

										<h3 className="mt-5 text-base font-semibold leading-snug tracking-tight text-foreground transition-colors duration-200 group-hover:text-foreground sm:text-lg">
											{service.title}
										</h3>
										<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
											{service.description}
										</p>

										{/* Flecha decorativa — entra desde la izquierda al hacer hover */}
										<div className="mt-4 flex items-center gap-1 overflow-hidden">
											<motion.span
												className={cn(
													'text-xs font-semibold',
													service.iconText,
												)}
												initial={{ x: -8, opacity: 0 }}
												whileInView={{ x: 0, opacity: 1 }}
												viewport={{ once: true }}
												transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
											>
												{m.homeLandingServicesIncludedLabel({}, { locale })}
											</motion.span>
											<ArrowRightIcon
												className={cn(
													'h-3 w-3 transition-transform duration-300 group-hover:translate-x-1',
													service.iconText,
												)}
											/>
										</div>
									</CardContent>

									{/* Destello de fondo al hacer hover — radial gradient sutil */}
									<div
										className={cn(
											'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100',
											'bg-[radial-gradient(ellipse_at_top_right,var(--glow-color,transparent)_0%,transparent_65%)]',
										)}
										style={
											{
												'--glow-color': `color-mix(in oklch, ${
													i === 0
														? 'hsl(var(--primary))'
														: i === 1
															? '#f59e0b'
															: i === 2
																? '#8b5cf6'
																: i === 3
																	? '#10b981'
																	: i === 4
																		? '#f97316'
																		: '#f43f5e'
												} 12%, transparent)`,
											} as React.CSSProperties
										}
									/>
								</Card>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* ── INTEGRACIONES ── */}
			<section
				aria-label={m.a11yLandmarkIntegrations({}, { locale })}
				className="px-4 pb-14 sm:px-6 lg:px-8"
			>
				<div className="mx-auto max-w-7xl rounded-[2rem] border border-border/60 bg-card px-6 py-12 shadow-sm">
					<RevealSection>
						<h2 className="mx-auto max-w-xl text-center text-4xl font-bold tracking-tight text-foreground">
							{m.homeLandingIntegrationsTitle({}, { locale })}
						</h2>
					</RevealSection>

					<div className="relative mt-12 grid place-items-center">
						<div className="absolute h-60 w-60 rounded-full border border-border" />
						<div className="absolute h-84 w-84 max-w-full rounded-full border border-border/40" />
						<div className="grid h-20 w-20 place-items-center rounded-full border border-border bg-background shadow-sm">
							<span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
								M
							</span>
						</div>
						<div className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
							{integrations.map((item, i) => (
								<motion.div
									key={item.label}
									className="relative flex flex-col items-center gap-2 rounded-2xl border border-border bg-background/80 p-4"
									initial={{ opacity: 0, scale: 0.85 }}
									whileInView={{ opacity: 1, scale: 1 }}
									viewport={{ once: true }}
									transition={{
										duration: 0.35,
										ease: 'backOut',
										delay: 0.05 + i * 0.08,
									}}
									whileHover={{ scale: 1.05 }}
								>
									<div className="absolute -top-6 left-1/2 h-6 w-px -translate-x-1/2 bg-border" />
									<div className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card">
										<item.icon className="h-5 w-5 text-primary" />
									</div>
									<p className="text-xs font-semibold text-muted-foreground">
										{item.label}
									</p>
								</motion.div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* ── CTA BANNER ── */}
			<section
				aria-label={m.a11yLandmarkCta({}, { locale })}
				className="px-4 pb-14 sm:px-6 lg:px-8"
			>
				<RevealSection>
					<div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-linear-to-r from-primary via-secondary to-primary px-6 py-16 text-center shadow-md">
						<div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.45)_1.5px,transparent_2px)] bg-size-[14px_14px] opacity-45" />
						<h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-foreground dark:text-primary-foreground sm:text-4xl">
							{m.homeLandingCtaTitle({}, { locale })}
						</h2>
						<Link
							to={
								isAuthenticated
									? localePath('/dashboard', locale)
									: localePath('/register', locale)
							}
							className={cn(
								buttonVariants({ variant: 'secondary', size: 'lg' }),
								'mt-6 inline-flex rounded-full border border-white/30 bg-white/90 px-5 text-primary transition-all duration-500 motion-reduce:transition-none hover:-translate-y-0.5 hover:bg-white',
							)}
						>
							{isAuthenticated
								? landingDashboardLabel
								: m.homeLandingCtaButton({}, { locale })}
							<ArrowRightIcon className="h-4 w-4" />
						</Link>
					</div>
				</RevealSection>
			</section>

			{/* ── STATS + TESTIMONIAL ── */}
			<section
				aria-label={m.a11yLandmarkStats({}, { locale })}
				className="px-4 pb-20 sm:px-6 lg:px-8"
			>
				<div className="mx-auto max-w-7xl space-y-8 rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
					{/* Stats: cada número entra escalonado */}
					<div className="mx-auto grid max-w-4xl grid-cols-2 justify-items-center gap-6 text-center sm:grid-cols-4">
						{stats.map((stat, i) => (
							<motion.div
								key={stat.label}
								className="flex flex-col items-center"
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.4, ease: 'easeOut', delay: i * 0.08 }}
							>
								<p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
									{stat.value}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{stat.label}
								</p>
							</motion.div>
						))}
					</div>

					<RevealSection direction="up" delay={0.05}>
						<div className="grid items-center gap-6 rounded-3xl border border-border/60 bg-background p-5 md:grid-cols-2">
							<div>
								<p className="text-sm font-semibold text-muted-foreground">
									{m.homeLandingTestimonialName({}, { locale })}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{m.homeLandingTestimonialRole({}, { locale })}
								</p>
								<blockquote className="mt-4 max-w-lg text-lg font-medium leading-relaxed tracking-tight text-foreground">
									{m.homeLandingTestimonialQuote({}, { locale })}
								</blockquote>
							</div>
							<img
								src="/images/doctor-image-2.webp"
								alt={m.homeLandingTestimonialImageAlt({}, { locale })}
								loading="lazy"
								decoding="async"
								className="h-56 w-full rounded-3xl object-cover md:h-64"
							/>
						</div>
					</RevealSection>
				</div>
			</section>
		</main>
	);
}

// Daniel Useche
