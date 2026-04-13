import {
	ArrowLeftIcon,
	BuildingOffice2Icon,
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
import { Card, CardContent } from '@/components/ui/card/card.component';
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
	| { status: 'ready'; lat: number; lng: number };

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
// Fallback visual mientras se carga el chunk de Leaflet (~175KB).
// Evita un layout shift y da feedback inmediato al usuario.

function MapSkeleton() {
	return (
		<div className="flex h-[50vh] min-h-[360px] items-center justify-center rounded-2xl bg-muted/30 lg:h-[70vh]">
			<motion.div
				className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
				animate={{ rotate: 360 }}
				transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
			/>
		</div>
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
	const listRef = useRef<HTMLDivElement>(null);

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
	// navigator.geolocation es la API estándar del navegador para obtener
	// la ubicación del usuario. Requiere HTTPS en producción (localhost es excepción).
	const requestLocation = useCallback(() => {
		if (typeof window === 'undefined') return;
		if (!navigator.geolocation) {
			setGeo({
				status: 'error',
				message: m.nearbyHospitalsGeoNotSupported({}, { locale }),
			});
			return;
		}

		setGeo({ status: 'loading' });

		navigator.geolocation.getCurrentPosition(
			(position) => {
				setGeo({
					status: 'ready',
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				});
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
				// enableHighAccuracy usa GPS si está disponible — mejor precisión
				// pero puede tardar más en dispositivos móviles
				enableHighAccuracy: true,
				timeout: 15000,
				maximumAge: 60000,
			},
		);
	}, [locale]);

	// Solicitar ubicación al montar el componente
	useEffect(() => {
		requestLocation();
	}, [requestLocation]);

	// ── Fetch hospitals from Maps microservice ──
	useEffect(() => {
		if (geo.status !== 'ready') return;

		const controller = new AbortController();
		setFetchingHospitals(true);
		setFetchError(null);

		// El servicio Maps en Spring Boot responde en /api/hospitals?lat=X&lng=Y&radius=Z
		fetch(
			`${MAPS_API_URL}/api/hospitals?lat=${geo.lat}&lng=${geo.lng}&radius=${radius}`,
			{ signal: controller.signal },
		)
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json() as Promise<HospitalResult[]>;
			})
			.then((data) => {
				setHospitals(data);
				setSelectedHospitalIdx(null);
			})
			.catch((err) => {
				if (err.name === 'AbortError') return;
				setFetchError(m.nearbyHospitalsFetchError({}, { locale }));
			})
			.finally(() => setFetchingHospitals(false));

		// Cleanup: aborta petición si el componente se desmonta o las deps cambian
		return () => controller.abort();
	}, [geo, radius, locale]);

	// ── Derived ──
	const isReady = geo.status === 'ready';
	const userLat = isReady ? geo.lat : 0;
	const userLng = isReady ? geo.lng : 0;

	// Radio options para el selector
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

	// Handler para clicks en markers del mapa — scroll a la tarjeta correspondiente
	const handleHospitalMapClick = useCallback((index: number) => {
		setSelectedHospitalIdx(index);
		listRef.current
			?.querySelector(`[data-idx="${index}"]`)
			?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}, []);

	return (
		<main className="relative min-h-dvh bg-background text-foreground">
			{/* ── Background ── */}
			<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_oklch,var(--color-primary)_12%,transparent),transparent_40%),radial-gradient(circle_at_80%_90%,color-mix(in_oklch,var(--color-secondary)_18%,transparent),transparent_35%)]" />

			{/* ── Top bar ── */}
			<header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-6">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
					<div className="flex items-center gap-3">
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
								className="h-8 w-8 rounded-full border border-border/70 bg-card object-contain"
							/>
							<h1 className="text-sm font-semibold tracking-tight">
								{m.nearbyHospitalsTitle({}, { locale })}
							</h1>
						</div>
					</div>
					<div className="flex items-center gap-2">
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
					</div>
				</div>
			</header>

			{/* ── Content ── */}
			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
				{/* Geo status: loading / denied / error */}
				<AnimatePresence mode="wait">
					{geo.status !== 'ready' && (
						<motion.div
							key="geo-status"
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -12 }}
							transition={{ duration: 0.3 }}
							className="flex flex-col items-center justify-center gap-4 py-20 text-center"
						>
							{geo.status === 'idle' || geo.status === 'loading' ? (
								<>
									{/* Pulso animado mientras se obtiene la ubicación */}
									<div className="relative">
										<motion.div
											className="h-16 w-16 rounded-full bg-primary/20"
											animate={{
												scale: [1, 1.4, 1],
												opacity: [0.6, 0, 0.6],
											}}
											transition={{
												duration: 2,
												repeat: Infinity,
												ease: 'easeInOut',
											}}
										/>
										<MapPinIcon className="absolute inset-0 m-auto h-8 w-8 text-primary" />
									</div>
									<p className="text-sm text-muted-foreground">
										{m.nearbyHospitalsLocating({}, { locale })}
									</p>
								</>
							) : geo.status === 'denied' ? (
								<>
									<div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
										<ExclamationTriangleIcon className="h-8 w-8 text-destructive" />
									</div>
									<div className="space-y-2">
										<p className="text-sm font-semibold text-foreground">
											{m.nearbyHospitalsGeoDeniedTitle({}, { locale })}
										</p>
										<p className="max-w-md text-xs text-muted-foreground">
											{m.nearbyHospitalsGeoDeniedDesc({}, { locale })}
										</p>
									</div>
									<Button
										size="sm"
										variant="outline"
										onClick={requestLocation}
										className="rounded-full"
									>
										{m.nearbyHospitalsRetry({}, { locale })}
									</Button>
								</>
							) : (
								<>
									<div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
										<ExclamationTriangleIcon className="h-8 w-8 text-destructive" />
									</div>
									<p className="text-sm text-muted-foreground">
										{geo.status === 'error' ? geo.message : ''}
									</p>
									<Button
										size="sm"
										variant="outline"
										onClick={requestLocation}
										className="rounded-full"
									>
										{m.nearbyHospitalsRetry({}, { locale })}
									</Button>
								</>
							)}
						</motion.div>
					)}
				</AnimatePresence>

				{/* Map + List layout */}
				{isReady && (
					<motion.div
						initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: 'easeOut' }}
					>
						{/* Radius selector */}
						<div className="mb-4 flex flex-wrap items-center gap-2">
							<span className="text-xs font-semibold text-muted-foreground">
								{m.nearbyHospitalsRadius({}, { locale })}:
							</span>
							{radiusOptions.map((opt) => (
								<button
									key={opt.value}
									type="button"
									onClick={() => setRadius(opt.value)}
									className={cn(
										'rounded-full px-3 py-1 text-xs font-medium transition-colors',
										radius === opt.value
											? 'bg-primary text-primary-foreground'
											: 'bg-muted text-muted-foreground hover:bg-muted/80',
									)}
								>
									{opt.label}
								</button>
							))}
						</div>

						{/* Grid: mapa a la izquierda, lista a la derecha en desktop */}
						<div className="grid gap-4 lg:grid-cols-[1fr_400px]">
							{/* Map container — lazy-loaded para evitar SSR crash */}
							<Card className="overflow-hidden rounded-2xl">
								<Suspense fallback={<MapSkeleton />}>
									<NearbyHospitalsMap
										userLat={userLat}
										userLng={userLng}
										hospitals={hospitals}
										isDarkMode={isDarkMode}
										fetchingHospitals={fetchingHospitals}
										searchingLabel={m.nearbyHospitalsSearching({}, { locale })}
										yourLocationLabel={m.nearbyHospitalsYourLocation(
											{},
											{ locale },
										)}
										onHospitalClick={handleHospitalMapClick}
										formatDistance={formatDistance}
									/>
								</Suspense>
							</Card>

							{/* Hospital list */}
							<div
								ref={listRef}
								className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto rounded-2xl pr-1"
							>
								{/* Results header */}
								<div className="sticky top-0 z-10 flex items-center justify-between rounded-xl bg-background/90 px-1 py-2 backdrop-blur">
									<p className="text-xs font-semibold text-muted-foreground">
										{m.nearbyHospitalsResultsCount(
											{ count: String(hospitals.length) },
											{ locale },
										)}
									</p>
									<Badge variant="outline" className="rounded-full text-[10px]">
										<MapPinIcon className="mr-1 h-3 w-3" />
										{userLat.toFixed(4)}, {userLng.toFixed(4)}
									</Badge>
								</div>

								{/* Error state */}
								{fetchError && (
									<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
										<p className="text-xs text-destructive">{fetchError}</p>
										<Button
											size="sm"
											variant="outline"
											onClick={requestLocation}
											className="mt-2 rounded-full"
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
											className="flex flex-col items-center gap-3 py-12 text-center"
										>
											<BuildingOffice2Icon className="h-12 w-12 text-muted-foreground/40" />
											<p className="text-sm text-muted-foreground">
												{m.nearbyHospitalsEmpty({}, { locale })}
											</p>
										</motion.div>
									)}

								{/* Hospital cards */}
								{hospitals.map((hospital, i) => (
									<motion.button
										key={`${hospital.latitude}-${hospital.longitude}-${hospital.name}`}
										data-idx={i}
										type="button"
										onClick={() => setSelectedHospitalIdx(i)}
										initial={
											prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12 }
										}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.3,
											delay: Math.min(i * 0.04, 0.4),
											ease: 'easeOut',
										}}
										whileHover={prefersReduced ? undefined : { scale: 1.01 }}
										className="w-full rounded-xl text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
									>
										<Card
											className={cn(
												'transition-all duration-200',
												selectedHospitalIdx === i
													? 'border-primary ring-2 ring-primary/25'
													: 'hover:bg-muted/30',
											)}
										>
											<CardContent className="p-4">
												<div className="flex items-start justify-between gap-3">
													<div className="flex items-start gap-3">
														{/* Número de orden: posición en ranking de cercanía */}
														<div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
															{i + 1}
														</div>
														<div className="min-w-0">
															<h3 className="text-sm font-semibold leading-tight text-foreground">
																{hospital.name}
															</h3>
															<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
																<MapPinIcon className="h-3 w-3 shrink-0" />
																{formatDistance(hospital.distanceMeters)}
															</p>
														</div>
													</div>
													{/* Badge de distancia con color según cercanía */}
													<Badge
														variant={
															hospital.distanceMeters < 2000
																? 'default'
																: 'secondary'
														}
														className="shrink-0 rounded-full text-[10px]"
													>
														{hospital.distanceMeters < 1000
															? m.nearbyHospitalsVeryClose({}, { locale })
															: hospital.distanceMeters < 3000
																? m.nearbyHospitalsClose({}, { locale })
																: m.nearbyHospitalsFar({}, { locale })}
													</Badge>
												</div>
												<div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
													<span>
														{hospital.latitude.toFixed(5)},{' '}
														{hospital.longitude.toFixed(5)}
													</span>
												</div>
											</CardContent>
										</Card>
									</motion.button>
								))}
							</div>
						</div>
					</motion.div>
				)}
			</div>
		</main>
	);
}

// Daniel Useche
