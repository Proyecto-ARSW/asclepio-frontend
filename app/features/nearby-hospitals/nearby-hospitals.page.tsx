import {
	ArrowLeftIcon,
	BuildingOffice2Icon,
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ExclamationTriangleIcon,
	MapPinIcon,
	MoonIcon,
	SunIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { Link, useLocation } from 'react-router';
import { Badge } from '@/components/ui/badge/badge.component';
import {
	Button,
	buttonVariants,
} from '@/components/ui/button/button.component';
import { ScrollArea } from '@/components/ui/scroll-area/scroll-area.component';
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
import { MAPS_API_URL } from '@/lib/env';
import { cn } from '@/lib/utils';
import type { HospitalResult } from './nearby-hospitals-map.client';

// ── Lazy-load del mapa ─────────────────────────────────────────────────────
// Leaflet accede a `window` al importarse, lo que rompe SSR.
// React.lazy + import() garantiza que el módulo solo se carga en el navegador.
const NearbyHospitalsMap = lazy(() => import('./nearby-hospitals-map.client'));

// ── Types ──────────────────────────────────────────────────────────────────

type GeoState =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'denied' }
	| { status: 'error'; message: string }
	| { status: 'ready'; lat: number; lng: number; accuracy: number };

// Número de hospitales por página en el listado lateral
const ITEMS_PER_PAGE = 8;

// ── Distance formatter ─────────────────────────────────────────────────────

function formatDistance(meters: number): string {
	if (meters < 1000) return `${Math.round(meters)} m`;
	return `${(meters / 1000).toFixed(1)} km`;
}

// ── Page metadata ──────────────────────────────────────────────────────────

export function meta() {
	const locale = currentLocale();
	return [{ title: m.nearbyHospitalsMetaTitle({}, { locale }) }];
}

// ── Map skeleton ───────────────────────────────────────────────────────────
// Fallback mientras carga el chunk de Leaflet. Llena todo el contenedor padre.

function MapSkeleton() {
	return (
		<div className="flex h-full w-full items-center justify-center bg-muted/20">
			<motion.div
				className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
				animate={{ rotate: 360 }}
				transition={{
					duration: 0.8,
					repeat: Number.POSITIVE_INFINITY,
					ease: 'linear',
				}}
			/>
		</div>
	);
}

// ── Geo status overlay ────────────────────────────────────────────────────
// Se muestra centrado sobre todo el viewport cuando no tenemos ubicación.

function GeoStatusOverlay({
	geo,
	locale,
	onRetry,
}: {
	geo: GeoState;
	locale: AppLocale;
	onRetry: () => void;
}) {
	if (geo.status === 'ready') return null;

	return (
		<motion.div
			key="geo-overlay"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.3 }}
			className="absolute inset-0 z-30 flex items-center justify-center bg-background"
		>
			<div className="flex flex-col items-center gap-5 px-6 text-center">
				{geo.status === 'idle' || geo.status === 'loading' ? (
					<>
						{/* Pulso animado — indica que estamos buscando la ubicación GPS */}
						<div className="relative flex items-center justify-center">
							<motion.div
								className="absolute h-20 w-20 rounded-full bg-primary/15"
								animate={{
									scale: [1, 1.6, 1],
									opacity: [0.5, 0, 0.5],
								}}
								transition={{
									duration: 2,
									repeat: Number.POSITIVE_INFINITY,
									ease: 'easeInOut',
								}}
							/>
							<motion.div
								className="absolute h-14 w-14 rounded-full bg-primary/20"
								animate={{
									scale: [1, 1.3, 1],
									opacity: [0.7, 0.1, 0.7],
								}}
								transition={{
									duration: 2,
									delay: 0.3,
									repeat: Number.POSITIVE_INFINITY,
									ease: 'easeInOut',
								}}
							/>
							<MapPinIcon className="relative z-10 h-8 w-8 text-primary" />
						</div>
						<p className="text-sm font-medium text-muted-foreground">
							{m.nearbyHospitalsLocating({}, { locale })}
						</p>
					</>
				) : geo.status === 'denied' ? (
					<>
						<div className="grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10">
							<ExclamationTriangleIcon className="h-8 w-8 text-destructive" />
						</div>
						<div className="space-y-1.5">
							<p className="text-base font-semibold text-foreground">
								{m.nearbyHospitalsGeoDeniedTitle({}, { locale })}
							</p>
							<p className="max-w-sm text-sm text-muted-foreground">
								{m.nearbyHospitalsGeoDeniedDesc({}, { locale })}
							</p>
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={onRetry}
							className="mt-1 rounded-full"
						>
							{m.nearbyHospitalsRetry({}, { locale })}
						</Button>
					</>
				) : (
					<>
						<div className="grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10">
							<ExclamationTriangleIcon className="h-8 w-8 text-destructive" />
						</div>
						<p className="text-sm text-muted-foreground">
							{geo.status === 'error' ? geo.message : ''}
						</p>
						<Button
							size="sm"
							variant="outline"
							onClick={onRetry}
							className="mt-1 rounded-full"
						>
							{m.nearbyHospitalsRetry({}, { locale })}
						</Button>
					</>
				)}
			</div>
		</motion.div>
	);
}

// ── Main component ─────────────────────────────────────────────────────────

export default function NearbyHospitalsPage() {
	const location = useLocation();
	const locale = currentLocale(location.pathname) as AppLocale;
	const prefersReduced = useReducedMotion();
	const [isDarkMode, setIsDarkMode] = useState(false);

	// ── State ──
	const [geo, setGeo] = useState<GeoState>({ status: 'idle' });
	const [hospitals, setHospitals] = useState<HospitalResult[]>([]);
	const [fetchingHospitals, setFetchingHospitals] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [selectedHospitalIdx, setSelectedHospitalIdx] = useState<number | null>(
		null,
	);
	const [radius, setRadius] = useState(5000);
	const [currentPage, setCurrentPage] = useState(0);
	const [radiusExpanded, setRadiusExpanded] = useState(false);
	// Ubicación manual — se activa al hacer clic en el mapa.
	// Cuando es null, se usan las coordenadas del GPS del navegador.
	const [manualLocation, setManualLocation] = useState<{
		lat: number;
		lng: number;
	} | null>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const watchIdRef = useRef<number | null>(null);

	// ── Theme ──
	useEffect(() => {
		if (typeof document === 'undefined') return;
		setIsDarkMode(document.documentElement.classList.contains('dark'));
	}, []);

	function handleThemeToggle() {
		if (typeof document === 'undefined') return;
		const currentlyDark = document.documentElement.classList.contains('dark');
		const nextTheme: ThemeMode = currentlyDark ? 'light' : 'dark';
		const currentPrefs = readUiPreferences();
		applyUiPreferences({ ...currentPrefs, theme: nextTheme });
		saveUiPreferences({ ...currentPrefs, theme: nextTheme });
		setIsDarkMode(!currentlyDark);
	}

	// ── Geolocation ──
	// watchPosition suscribe a actualizaciones continuas del GPS.
	// A diferencia de getCurrentPosition (una sola lectura), permite que
	// el sensor se "caliente" y entregue coordenadas progresivamente más
	// precisas. La primera lectura suele venir de Wi-Fi/celular (~100-300m
	// de error), las siguientes usan el GPS real del dispositivo (~5-15m).
	const ACCURACY_THRESHOLD = 50; // metros — umbral de precisión aceptable

	const requestLocation = useCallback(() => {
		if (typeof window === 'undefined') return;
		if (!navigator.geolocation) {
			setGeo({
				status: 'error',
				message: m.nearbyHospitalsGeoNotSupported({}, { locale }),
			});
			return;
		}

		// Limpiar watcher anterior si existe (ej. al reintentar tras error)
		if (watchIdRef.current !== null) {
			navigator.geolocation.clearWatch(watchIdRef.current);
		}

		setGeo({ status: 'loading' });

		watchIdRef.current = navigator.geolocation.watchPosition(
			(position) => {
				const { latitude, longitude, accuracy } = position.coords;

				setGeo((prev) => {
					// Solo actualizar si es la primera lectura o si la nueva es más
					// precisa. Evita re-renders innecesarios cuando el GPS entrega
					// lecturas con igual o menor precisión que la actual.
					if (prev.status === 'ready' && accuracy >= prev.accuracy) {
						return prev;
					}
					return { status: 'ready', lat: latitude, lng: longitude, accuracy };
				});

				// Una vez bajo el umbral, dejar de monitorear para ahorrar batería
				if (accuracy <= ACCURACY_THRESHOLD && watchIdRef.current !== null) {
					navigator.geolocation.clearWatch(watchIdRef.current);
					watchIdRef.current = null;
				}
			},
			(error) => {
				if (error.code === error.PERMISSION_DENIED) {
					setGeo({ status: 'denied' });
				} else {
					setGeo({
						status: 'error',
						message: m.nearbyHospitalsGeoError({}, { locale }),
					});
				}
			},
			{
				enableHighAccuracy: true,
				timeout: 15000,
				// maximumAge: 0 fuerza una lectura fresca del sensor en lugar de
				// usar una posición cacheada que podría tener minutos de antigüedad
				maximumAge: 0,
			},
		);
	}, [locale]);

	// Solicitar ubicación al montar y limpiar watcher al desmontar.
	// El return cleanup es crítico: sin él, el watcher seguiría activo
	// consumiendo batería si el usuario navega a otra página.
	useEffect(() => {
		requestLocation();
		return () => {
			if (watchIdRef.current !== null) {
				navigator.geolocation.clearWatch(watchIdRef.current);
			}
		};
	}, [requestLocation]);

	// ── Derived ──
	const isReady = geo.status === 'ready';
	// Coordenadas efectivas: si el usuario fijó posición manual, se usan esas;
	// de lo contrario, las del GPS/navegador.
	const userLat = manualLocation?.lat ?? (isReady ? geo.lat : 0);
	const userLng = manualLocation?.lng ?? (isReady ? geo.lng : 0);

	// ── Fetch hospitals from Maps microservice ──
	useEffect(() => {
		if (geo.status !== 'ready') return;

		// AbortController permite cancelar la petición fetch si el componente
		// se desmonta o las dependencias cambian — evita memory leaks y race conditions.
		const controller = new AbortController();
		setFetchingHospitals(true);
		setFetchError(null);

		// Usa coordenadas efectivas (manuales si el usuario hizo clic en el mapa,
		// o del GPS si no). Esto permite que el fetch siempre use la posición
		// que el usuario ve en pantalla como "su ubicación".
		fetch(
			`${MAPS_API_URL}/api/hospitals?lat=${userLat}&lng=${userLng}&radius=${radius}`,
			{ signal: controller.signal },
		)
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json() as Promise<HospitalResult[]>;
			})
			.then((data) => {
				setHospitals(data);
				setSelectedHospitalIdx(null);
				setCurrentPage(0);
			})
			.catch((err) => {
				if (err.name === 'AbortError') return;
				setFetchError(m.nearbyHospitalsFetchError({}, { locale }));
			})
			.finally(() => setFetchingHospitals(false));

		return () => controller.abort();
	}, [geo.status, userLat, userLng, radius, locale]);

	// Paginación: dividir la lista en páginas más manejables
	const totalPages = Math.ceil(hospitals.length / ITEMS_PER_PAGE);
	const paginatedHospitals = hospitals.slice(
		currentPage * ITEMS_PER_PAGE,
		(currentPage + 1) * ITEMS_PER_PAGE,
	);

	const radiusOptions = useMemo(
		() => [
			{ value: 1000, label: '1 km' },
			{ value: 3000, label: '3 km' },
			{ value: 5000, label: '5 km' },
			{ value: 10000, label: '10 km' },
			{ value: 20000, label: '20 km' },
			{ value: 50000, label: '50 km' },
		],
		[],
	);

	// Callback para fijar ubicación manual al hacer clic en el mapa.
	// Resetea la página y selección para que el usuario vea resultados frescos.
	const handleManualLocationSet = useCallback((lat: number, lng: number) => {
		setManualLocation({ lat, lng });
		setSelectedHospitalIdx(null);
		setCurrentPage(0);
	}, []);

	// Scroll a la tarjeta correspondiente al hacer click en un marker del mapa
	const handleHospitalMapClick = useCallback((index: number) => {
		setSelectedHospitalIdx(index);
		// Navegar a la página que contiene el hospital clickeado en el mapa
		const targetPage = Math.floor(index / ITEMS_PER_PAGE);
		setCurrentPage(targetPage);
		// requestAnimationFrame espera al siguiente paint para que la tarjeta
		// ya esté en el DOM antes de intentar el scroll
		requestAnimationFrame(() => {
			listRef.current
				?.querySelector(`[data-idx="${index}"]`)
				?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		});
	}, []);

	// Categoría de distancia para color-coding visual
	function distanceCategory(meters: number) {
		if (meters < 1000) return 'very-close';
		if (meters < 3000) return 'close';
		return 'far';
	}

	return (
		<main className="flex h-dvh flex-col bg-background text-foreground">
			{/* ── Header — thin, glass, stays above everything ── */}
			<header className="relative z-40 flex h-12 shrink-0 items-center justify-between border-b border-border/40 bg-background/80 px-3 backdrop-blur-xl sm:px-4">
				<div className="flex items-center gap-2.5">
					<Link
						to={localePath('/', locale)}
						className={cn(
							buttonVariants({ variant: 'ghost', size: 'sm' }),
							'h-8 w-8 rounded-full px-0',
						)}
						aria-label={m.nearbyHospitalsBackHome({}, { locale })}
					>
						<ArrowLeftIcon className="h-4 w-4" />
					</Link>
					<div className="flex items-center gap-2">
						<img
							src="/favicon.png"
							alt="Asclepio"
							className="h-7 w-7 rounded-full border border-border/50 bg-card object-contain"
						/>
						<h1 className="text-sm font-semibold tracking-tight">
							{m.nearbyHospitalsTitle({}, { locale })}
						</h1>
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={handleThemeToggle}
						aria-label={m.homeLandingThemeToggle({}, { locale })}
						className={cn(
							buttonVariants({ variant: 'ghost', size: 'sm' }),
							'h-9 w-9 shrink-0 rounded-full px-0',
						)}
					>
						{isDarkMode ? (
							<SunIcon className="h-5 w-5" />
						) : (
							<MoonIcon className="h-5 w-5" />
						)}
					</button>
					<LanguageSwitcher
						locale={locale}
						triggerClassName="h-8 shrink-0 rounded-full bg-transparent px-2 text-xs font-semibold"
					/>
				</div>
			</header>

			{/* ── Content — fills remaining viewport ── */}
			<div className="relative flex-1 overflow-hidden">
				{/* Geo status overlay (loading / denied / error) */}
				<AnimatePresence mode="wait">
					{!isReady && (
						<GeoStatusOverlay
							geo={geo}
							locale={locale}
							onRetry={requestLocation}
						/>
					)}
				</AnimatePresence>

				{/* Map + Panel layout — visible when location is ready */}
				{isReady && (
					<motion.div
						initial={prefersReduced ? undefined : { opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.4 }}
						className="flex h-full flex-col lg:relative lg:block"
					>
						{/* ── Map container ──
						    Mobile: toma 45% del viewport disponible
						    Desktop: llena TODO el espacio (el panel flota encima) */}
						<div className="relative h-[45vh] shrink-0 lg:absolute lg:inset-0 lg:h-auto">
							<Suspense fallback={<MapSkeleton />}>
								<NearbyHospitalsMap
									userLat={userLat}
									userLng={userLng}
									accuracy={isReady ? geo.accuracy : 0}
									hospitals={hospitals}
									isDarkMode={isDarkMode}
									fetchingHospitals={fetchingHospitals}
									searchingLabel={m.nearbyHospitalsSearching({}, { locale })}
									yourLocationLabel={m.nearbyHospitalsYourLocation(
										{},
										{ locale },
									)}
									manualLocationLabel={m.nearbyHospitalsManualLocation(
										{},
										{ locale },
									)}
									onHospitalClick={handleHospitalMapClick}
									onManualLocationSet={handleManualLocationSet}
									manualLocationActive={manualLocation !== null}
									formatDistance={formatDistance}
								/>
							</Suspense>

							{/* ── Floating radius selector ──
							    Se posiciona sobre el mapa como control flotante.
							    En mobile: abajo del mapa. En desktop: arriba-izquierda. */}
							<div className="absolute bottom-3 left-3 right-3 z-[1001] lg:bottom-auto lg:right-auto lg:top-3">
								{/* Desktop: opciones de radio siempre visibles en línea */}
								<div className="hidden lg:flex flex-wrap items-center gap-1.5 rounded-xl border border-border/40 bg-background/85 px-3 py-2 shadow-lg backdrop-blur-xl">
									<span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
										{m.nearbyHospitalsRadius({}, { locale })}
									</span>
									{radiusOptions.map((opt) => (
										<button
											key={opt.value}
											type="button"
											onClick={() => setRadius(opt.value)}
											className={cn(
												'rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200',
												radius === opt.value
													? 'bg-primary text-primary-foreground shadow-sm'
													: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
											)}
										>
											{opt.label}
										</button>
									))}
								</div>

								{/* Mobile: botón compacto que expande opciones al pulsarlo.
									 Patrón disclosure — reduce ruido visual en pantallas pequeñas
									 mostrando el valor actual y expandiendo bajo demanda */}
								<div className="lg:hidden">
									<button
										type="button"
										onClick={() => setRadiusExpanded((v) => !v)}
										className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/85 px-3 py-2 shadow-lg backdrop-blur-xl"
									>
										<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
											{m.nearbyHospitalsRadius({}, { locale })}
										</span>
										<span className="text-xs font-semibold text-primary">
											{radiusOptions.find((o) => o.value === radius)?.label}
										</span>
										<ChevronDownIcon
											className={cn(
												'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
												radiusExpanded && 'rotate-180',
											)}
										/>
									</button>
									<AnimatePresence>
										{radiusExpanded && (
											<motion.div
												initial={{ opacity: 0, height: 0 }}
												animate={{ opacity: 1, height: 'auto' }}
												exit={{ opacity: 0, height: 0 }}
												transition={{ duration: 0.2 }}
												className="overflow-hidden"
											>
												<div className="mt-1.5 flex flex-wrap gap-1.5 rounded-xl border border-border/40 bg-background/85 px-3 py-2 shadow-lg backdrop-blur-xl">
													{radiusOptions.map((opt) => (
														<button
															key={opt.value}
															type="button"
															onClick={() => {
																setRadius(opt.value);
																setRadiusExpanded(false);
															}}
															className={cn(
																'rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200',
																radius === opt.value
																	? 'bg-primary text-primary-foreground shadow-sm'
																	: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
															)}
														>
															{opt.label}
														</button>
													))}
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							</div>
						</div>

						{/* ── Hospital panel ──
						    Mobile: ocupa el espacio restante debajo del mapa, scrollable.
						    Desktop: flota como overlay a la derecha con efecto glassmorphism.
						    El z-[1001] lo pone por encima de los controles internos de Leaflet. */}
						<div
							className={cn(
								'flex flex-1 flex-col overflow-hidden border-t border-border/40 bg-background',
								'lg:absolute lg:inset-y-0 lg:right-0 lg:w-[400px] lg:border-l lg:border-t-0',
								'lg:bg-background/80 lg:backdrop-blur-xl lg:z-[1001]',
							)}
						>
							{/* Panel header */}
							<div className="flex shrink-0 items-center justify-between border-b border-border/30 px-4 py-2.5">
								<div className="flex items-center gap-2">
									<BuildingOffice2Icon className="h-4 w-4 text-primary" />
									<span className="text-xs font-semibold text-foreground">
										{m.nearbyHospitalsResultsCount(
											{ count: String(hospitals.length) },
											{ locale },
										)}
									</span>
								</div>
								<div className="flex items-center gap-1.5">
									{manualLocation && (
										<button
											type="button"
											onClick={() => setManualLocation(null)}
											className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
										>
											<MapPinIcon className="h-3 w-3" />
											{m.nearbyHospitalsResetGPS({}, { locale })}
										</button>
									)}
									<Badge
										variant="outline"
										className="rounded-full text-[10px] font-mono"
									>
										{userLat.toFixed(4)}, {userLng.toFixed(4)}
										{isReady && !manualLocation && (
											<span className="ml-1 text-muted-foreground">
												±{Math.round(geo.accuracy)}m
											</span>
										)}
										{manualLocation && (
											<span className="ml-1 text-amber-500">
												&#9679;
											</span>
										)}
									</Badge>
								</div>
							</div>

							{/* Banner de precisión baja — se muestra cuando la precisión
							    del GPS supera 500m (típico de geolocalización por IP) y
							    el usuario aún no ha fijado su posición manualmente.
							    500m es el umbral porque: GPS real ~5-15m, WiFi ~20-100m,
							    celular ~100-300m, IP ~1000-50000m */}
							{isReady && geo.accuracy > 500 && !manualLocation && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									className="shrink-0 border-b border-amber-500/20 bg-amber-500/5 px-4 py-2.5"
								>
									<div className="flex items-start gap-2">
										<ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
										<p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
											{m.nearbyHospitalsLowAccuracy({}, { locale })}
										</p>
									</div>
								</motion.div>
							)}

							{/* Scrollable hospital list */}
							<ScrollArea className="flex-1">
								<div ref={listRef} className="space-y-1.5 p-3">
									{/* Error state */}
									{fetchError && (
										<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center">
											<ExclamationTriangleIcon className="mx-auto mb-2 h-6 w-6 text-destructive/60" />
											<p className="text-xs text-destructive">{fetchError}</p>
											<Button
												size="sm"
												variant="outline"
												onClick={requestLocation}
												className="mt-3 rounded-full"
											>
												{m.nearbyHospitalsRetry({}, { locale })}
											</Button>
										</div>
									)}

									{/* Empty state */}
									{!fetchingHospitals &&
										!fetchError &&
										hospitals.length === 0 && (
											<motion.div
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												className="flex flex-col items-center gap-3 py-16 text-center"
											>
												<div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted/50">
													<BuildingOffice2Icon className="h-7 w-7 text-muted-foreground/50" />
												</div>
												<p className="max-w-[200px] text-sm text-muted-foreground">
													{m.nearbyHospitalsEmpty({}, { locale })}
												</p>
											</motion.div>
										)}

									{/* Hospital cards — pageIdx es el índice local (0..ITEMS_PER_PAGE-1),
										 i es el índice global para mantener ranking y selección */}
									{paginatedHospitals.map((hospital, pageIdx) => {
										const i = currentPage * ITEMS_PER_PAGE + pageIdx;
										const cat = distanceCategory(hospital.distanceMeters);
										const isSelected = selectedHospitalIdx === i;

										return (
											<motion.button
												key={`${hospital.latitude}-${hospital.longitude}-${hospital.name}`}
												data-idx={i}
												type="button"
												onClick={() => setSelectedHospitalIdx(i)}
												initial={
													prefersReduced
														? { opacity: 1 }
														: { opacity: 0, x: 16 }
												}
												animate={{ opacity: 1, x: 0 }}
												transition={{
													duration: 0.3,
													delay: Math.min(pageIdx * 0.04, 0.5),
													ease: 'easeOut',
												}}
												whileHover={
													prefersReduced ? undefined : { scale: 1.01 }
												}
												className={cn(
													'group w-full rounded-xl text-left outline-none transition-all duration-200',
													'focus-visible:ring-2 focus-visible:ring-ring',
													isSelected
														? 'bg-primary/8 ring-1 ring-primary/30'
														: 'hover:bg-muted/40',
												)}
											>
												<div className="flex items-center gap-3 p-3">
													{/* Ranking badge — posición ordinal de cercanía */}
													<div
														className={cn(
															'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold transition-colors',
															isSelected
																? 'bg-primary text-primary-foreground'
																: 'bg-muted/60 text-muted-foreground group-hover:bg-muted',
														)}
													>
														{i + 1}
													</div>

													{/* Info */}
													<div className="min-w-0 flex-1">
														<h3 className="truncate text-[13px] font-semibold leading-tight text-foreground">
															{hospital.name}
														</h3>
														<div className="mt-1 flex items-center gap-2">
															<span
																className={cn(
																	'text-xs font-semibold tabular-nums',
																	cat === 'very-close' &&
																		'text-emerald-600 dark:text-emerald-400',
																	cat === 'close' &&
																		'text-amber-600 dark:text-amber-400',
																	cat === 'far' && 'text-muted-foreground',
																)}
															>
																{formatDistance(hospital.distanceMeters)}
															</span>
															<span className="text-[10px] text-muted-foreground/60">
																&middot;
															</span>
															<Badge
																variant={
																	cat === 'very-close' ? 'default' : 'secondary'
																}
																className="h-4 rounded-md px-1.5 text-[9px] font-medium"
															>
																{cat === 'very-close'
																	? m.nearbyHospitalsVeryClose({}, { locale })
																	: cat === 'close'
																		? m.nearbyHospitalsClose({}, { locale })
																		: m.nearbyHospitalsFar({}, { locale })}
															</Badge>
														</div>
													</div>

													{/* Distance indicator — barra visual proporcional */}
													<div className="flex shrink-0 flex-col items-end gap-1">
														<div
															className={cn(
																'h-1.5 rounded-full transition-all',
																cat === 'very-close' && 'w-8 bg-emerald-500/60',
																cat === 'close' && 'w-5 bg-amber-500/50',
																cat === 'far' && 'w-3 bg-muted-foreground/30',
															)}
														/>
													</div>
												</div>
											</motion.button>
										);
									})}
								</div>
							</ScrollArea>

							{/* Controles de paginación — fuera del ScrollArea
								 para estar siempre visibles sin importar el scroll */}
							{totalPages > 1 && (
								<div className="flex shrink-0 items-center justify-center gap-3 border-t border-border/30 px-4 py-2.5">
									<button
										type="button"
										disabled={currentPage === 0}
										onClick={() => setCurrentPage((p) => p - 1)}
										aria-label="Página anterior"
										className={cn(
											'grid h-8 w-8 place-items-center rounded-lg transition-colors',
											currentPage === 0
												? 'cursor-not-allowed text-muted-foreground/30'
												: 'text-foreground hover:bg-muted',
										)}
									>
										<ChevronLeftIcon className="h-4 w-4" />
									</button>
									<span className="text-xs font-medium tabular-nums text-muted-foreground">
										{currentPage + 1} / {totalPages}
									</span>
									<button
										type="button"
										disabled={currentPage >= totalPages - 1}
										onClick={() => setCurrentPage((p) => p + 1)}
										aria-label="Página siguiente"
										className={cn(
											'grid h-8 w-8 place-items-center rounded-lg transition-colors',
											currentPage >= totalPages - 1
												? 'cursor-not-allowed text-muted-foreground/30'
												: 'text-foreground hover:bg-muted',
										)}
									>
										<ChevronRightIcon className="h-4 w-4" />
									</button>
								</div>
							)}
						</div>
					</motion.div>
				)}
			</div>
		</main>
	);
}

// Daniel Useche
