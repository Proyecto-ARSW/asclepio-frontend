/**
 * Sección "Anatomía 3D" del dashboard de médico.
 *
 * El médico la usa como apoyo visual durante la consulta: selecciona una
 * categoría (sistema circulatorio, esqueleto, ADN…), el visor carga el
 * modelo correspondiente y debajo se muestra una explicación pensada para
 * que el médico la lea/adapte frente al paciente.
 *
 * Patrones aplicados:
 *   - Lazy loading del viewer .client.tsx para que Three.js no se ejecute en SSR
 *   - Animaciones con `motion` + IntersectionObserver (coherente con home.page)
 *   - Layout responsive: mobile apila visor→texto, desktop grid 2 columnas
 *   - Colores/bordes tomados de los tokens (--color-primary, card, muted)
 *     para que siga funcionando en dark/light y modos accesibles
 */
import {
	AcademicCapIcon,
	ArrowPathIcon,
	BoltIcon,
	HeartIcon,
	PauseIcon,
	PlayIcon,
	SparklesIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
	type ComponentType,
	lazy,
	Suspense,
	useEffect,
	useRef,
	useState,
} from 'react';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import type { AppLocale } from '@/features/i18n/locale-path';
import { cn } from '@/lib/utils';

// ── Carga diferida del visor 3D ────────────────────────────────────────────
// Three.js accede a `window` y WebGL en su import inicial, lo que rompe SSR.
// React.lazy + dynamic import nos garantiza que el chunk solo se descargue y
// ejecute en el navegador, manteniendo el bundle inicial ligero.
const AnatomyViewer = lazy(() => import('./doctor-anatomy-viewer.client'));

// ── Datos de categorías ────────────────────────────────────────────────────
// Estructura declarativa: añadir un nuevo modelo solo requiere insertar un
// objeto aquí. La UI (tabs + descripciones) se genera a partir de este array.

type AnatomyCategoryId = 'skeleton' | 'heart' | 'dna';

interface AnatomyCategory {
	id: AnatomyCategoryId;
	icon: ComponentType<React.SVGProps<SVGSVGElement>>;
	modelUrl: string;
	/** Acento visual de la tarjeta — respeta el token --color-primary */
	accent: 'primary' | 'rose' | 'indigo';
	label: Record<AppLocale, string>;
	tagline: Record<AppLocale, string>;
	description: Record<AppLocale, string>;
	/** Puntos clave que el médico puede mencionar al paciente */
	talkingPoints: Record<AppLocale, string[]>;
}

const ANATOMY_CATEGORIES: AnatomyCategory[] = [
	{
		id: 'skeleton',
		icon: AcademicCapIcon,
		modelUrl: '/models/anatomy/Human-skeleton.glb',
		accent: 'indigo',
		label: {
			es: 'Sistema esquelético',
			en: 'Skeletal system',
			pt: 'Sistema esquelético',
			fr: 'Système squelettique',
			de: 'Skelettsystem',
		},
		tagline: {
			es: 'Estructura y soporte del cuerpo humano',
			en: 'Human body structure and support',
			pt: 'Estrutura e suporte do corpo humano',
			fr: 'Structure et soutien du corps humain',
			de: 'Struktur und Stütze des menschlichen Körpers',
		},
		description: {
			es: 'El esqueleto humano adulto está formado por 206 huesos que dan sostén, protegen órganos vitales y permiten el movimiento en colaboración con músculos y articulaciones. También aloja la médula ósea, responsable de producir células sanguíneas.',
			en: 'The adult human skeleton is made up of 206 bones that provide support, protect vital organs and enable movement together with muscles and joints. It also hosts the bone marrow, responsible for producing blood cells.',
			pt: 'O esqueleto humano adulto é formado por 206 ossos que dão suporte, protegem órgãos vitais e permitem o movimento em conjunto com músculos e articulações.',
			fr: 'Le squelette humain adulte est composé de 206 os qui soutiennent le corps, protègent les organes vitaux et permettent le mouvement avec les muscles et les articulations.',
			de: 'Das erwachsene menschliche Skelett besteht aus 206 Knochen, die Halt geben, lebenswichtige Organe schützen und zusammen mit Muskeln und Gelenken Bewegung ermöglichen.',
		},
		talkingPoints: {
			es: [
				'Protege órganos vitales (cerebro, corazón, pulmones)',
				'Almacena minerales como el calcio y el fósforo',
				'Produce células sanguíneas en la médula ósea',
				'Se regenera: remodelación ósea constante durante toda la vida',
			],
			en: [
				'Protects vital organs (brain, heart, lungs)',
				'Stores minerals such as calcium and phosphorus',
				'Produces blood cells in the bone marrow',
				'Self-renewing: constant bone remodeling throughout life',
			],
			pt: [
				'Protege órgãos vitais (cérebro, coração, pulmões)',
				'Armazena cálcio e fósforo',
				'Produz células sanguíneas na medula óssea',
				'Se regenera continuamente ao longo da vida',
			],
			fr: [
				'Protège les organes vitaux (cerveau, cœur, poumons)',
				'Stocke le calcium et le phosphore',
				'Produit des cellules sanguines dans la moelle',
				'Se remodèle constamment tout au long de la vie',
			],
			de: [
				'Schützt lebenswichtige Organe (Gehirn, Herz, Lunge)',
				'Speichert Kalzium und Phosphor',
				'Bildet Blutzellen im Knochenmark',
				'Erneuert sich lebenslang durch ständigen Umbau',
			],
		},
	},
	{
		id: 'heart',
		icon: HeartIcon,
		modelUrl: '/models/anatomy/Beating-heart.glb',
		accent: 'rose',
		label: {
			es: 'Sistema circulatorio',
			en: 'Circulatory system',
			pt: 'Sistema circulatório',
			fr: 'Système circulatoire',
			de: 'Kreislaufsystem',
		},
		tagline: {
			es: 'El corazón humano en movimiento',
			en: 'The human heart in motion',
			pt: 'O coração humano em movimento',
			fr: 'Le cœur humain en mouvement',
			de: 'Das menschliche Herz in Bewegung',
		},
		description: {
			es: 'El corazón es un órgano muscular que bombea alrededor de 5 litros de sangre por minuto en reposo. Sus cuatro cámaras (dos aurículas y dos ventrículos) sincronizan contracciones para oxigenar el cuerpo y retirar dióxido de carbono.',
			en: 'The heart is a muscular organ that pumps roughly 5 liters of blood per minute at rest. Its four chambers (two atria and two ventricles) synchronize contractions to oxygenate the body and remove carbon dioxide.',
			pt: 'O coração bombeia cerca de 5 litros de sangue por minuto em repouso. Suas quatro câmaras sincronizam contrações para oxigenar o corpo.',
			fr: 'Le cœur pompe environ 5 litres de sang par minute au repos. Ses quatre cavités synchronisent les contractions pour oxygéner le corps.',
			de: 'Das Herz pumpt in Ruhe rund 5 Liter Blut pro Minute. Seine vier Kammern synchronisieren Kontraktionen, um den Körper mit Sauerstoff zu versorgen.',
		},
		talkingPoints: {
			es: [
				'Late unas 100 000 veces al día sin descanso',
				'Frecuencia cardíaca normal: 60–100 latidos por minuto',
				'Se divide en circulación pulmonar y sistémica',
				'El ejercicio regular fortalece el músculo cardíaco',
			],
			en: [
				'Beats about 100,000 times per day without stopping',
				'Normal resting rate: 60–100 beats per minute',
				'Splits into pulmonary and systemic circulation',
				'Regular exercise strengthens the heart muscle',
			],
			pt: [
				'Bate cerca de 100.000 vezes por dia',
				'Frequência normal em repouso: 60–100 bpm',
				'Divide-se em circulação pulmonar e sistêmica',
				'O exercício regular fortalece o miocárdio',
			],
			fr: [
				'Bat environ 100 000 fois par jour',
				'Fréquence normale au repos : 60–100 bpm',
				'Se divise en circulation pulmonaire et systémique',
				'Un exercice régulier renforce le muscle cardiaque',
			],
			de: [
				'Schlägt etwa 100.000 Mal pro Tag',
				'Ruhepuls normal: 60–100 Schläge pro Minute',
				'Teilt sich in Lungen- und Körperkreislauf',
				'Regelmäßige Bewegung stärkt den Herzmuskel',
			],
		},
	},
	{
		id: 'dna',
		icon: SparklesIcon,
		modelUrl: '/models/anatomy/DNA.glb',
		accent: 'primary',
		label: {
			es: 'Genética molecular',
			en: 'Molecular genetics',
			pt: 'Genética molecular',
			fr: 'Génétique moléculaire',
			de: 'Molekulargenetik',
		},
		tagline: {
			es: 'La doble hélice del ADN',
			en: 'The DNA double helix',
			pt: 'A dupla hélice do DNA',
			fr: "La double hélice d'ADN",
			de: 'Die DNA-Doppelhelix',
		},
		description: {
			es: 'El ADN es la molécula que almacena la información genética. Su estructura de doble hélice, descrita por Watson y Crick en 1953, codifica las instrucciones para construir y mantener cada célula del cuerpo humano.',
			en: 'DNA is the molecule that stores genetic information. Its double-helix structure, described by Watson and Crick in 1953, encodes the instructions to build and maintain every cell in the human body.',
			pt: 'O DNA é a molécula que armazena a informação genética. Sua estrutura em dupla hélice codifica as instruções de cada célula humana.',
			fr: "L'ADN est la molécule qui stocke l'information génétique. Sa structure en double hélice encode les instructions de chaque cellule humaine.",
			de: 'Die DNA speichert die Erbinformation. Ihre Doppelhelix-Struktur kodiert die Anweisungen für jede einzelne Körperzelle.',
		},
		talkingPoints: {
			es: [
				'Formada por cuatro bases: A, T, C y G',
				'Cada célula contiene ~2 metros de ADN enrollado',
				'El genoma humano tiene ~3 000 millones de pares de bases',
				'Mutaciones pueden estar asociadas a enfermedades hereditarias',
			],
			en: [
				'Built from four bases: A, T, C and G',
				'Each cell contains ~2 meters of coiled DNA',
				'The human genome has ~3 billion base pairs',
				'Mutations may be linked to inherited diseases',
			],
			pt: [
				'Formada por quatro bases: A, T, C e G',
				'Cada célula guarda ~2 metros de DNA',
				'O genoma humano tem ~3 bilhões de pares de bases',
				'Mutações podem estar ligadas a doenças hereditárias',
			],
			fr: [
				'Composé de quatre bases : A, T, C et G',
				"Chaque cellule contient ~2 m d'ADN",
				'Le génome humain compte ~3 milliards de paires de bases',
				'Des mutations peuvent être liées à des maladies héréditaires',
			],
			de: [
				'Besteht aus vier Basen: A, T, C und G',
				'Jede Zelle enthält ~2 m DNA',
				'Das menschliche Genom hat ~3 Milliarden Basenpaare',
				'Mutationen können zu Erbkrankheiten führen',
			],
		},
	},
];

// ── Traducciones de textos estáticos de la sección ─────────────────────────
// Se inlinean en vez de tocar paraglide para no romper el build compilado;
// el resto del dashboard ya sigue este patrón (ver ConsentimientosSection).

function t(locale: AppLocale) {
	const es: Record<string, string> = {
		heading: 'Anatomía 3D interactiva',
		subtitle:
			'Explora modelos tridimensionales junto al paciente durante la consulta. Rota, haz zoom y usa los puntos clave como guía explicativa.',
		pickLabel: 'Selecciona una categoría',
		categoryBadge: 'Categoría activa',
		keyPointsTitle: 'Puntos clave para explicar al paciente',
		tipsTitle: 'Cómo usar el visor',
		tip1: 'Arrastra para rotar el modelo y observarlo desde cualquier ángulo.',
		tip2: 'Usa la rueda del ratón o dos dedos para acercar / alejar.',
		tip3: 'Activa o pausa la rotación automática con el botón superior.',
		tip4: 'Cada categoría incluye puntos clave listos para leer al paciente.',
		autoRotateOn: 'Pausar rotación',
		autoRotateOff: 'Rotar automáticamente',
		resetView: 'Reiniciar vista',
		loading: 'Cargando modelo 3D…',
		sourceLabel: 'Archivo',
		proTip: 'Consejo profesional',
	};
	const en: Record<string, string> = {
		heading: 'Interactive 3D anatomy',
		subtitle:
			'Explore three-dimensional models with the patient during the consultation. Rotate, zoom and use the talking points as an explanatory guide.',
		pickLabel: 'Pick a category',
		categoryBadge: 'Active category',
		keyPointsTitle: 'Key talking points for the patient',
		tipsTitle: 'How to use the viewer',
		tip1: 'Drag to rotate the model and view it from any angle.',
		tip2: 'Use the mouse wheel or two fingers to zoom in / out.',
		tip3: 'Toggle auto-rotation with the button above.',
		tip4: 'Every category ships with bullet-ready explanations.',
		autoRotateOn: 'Pause rotation',
		autoRotateOff: 'Auto-rotate',
		resetView: 'Reset view',
		loading: 'Loading 3D model…',
		sourceLabel: 'File',
		proTip: 'Pro tip',
	};
	const pt: Record<string, string> = {
		heading: 'Anatomia 3D interativa',
		subtitle:
			'Explore modelos tridimensionais com o paciente durante a consulta. Gire, amplie e use os pontos-chave como guia.',
		pickLabel: 'Escolha uma categoria',
		categoryBadge: 'Categoria ativa',
		keyPointsTitle: 'Pontos-chave para explicar ao paciente',
		tipsTitle: 'Como usar o visualizador',
		tip1: 'Arraste para girar o modelo.',
		tip2: 'Use a roda do mouse ou dois dedos para aproximar.',
		tip3: 'Ative ou pause a rotação automática no botão acima.',
		tip4: 'Cada categoria traz pontos-chave prontos para ler.',
		autoRotateOn: 'Pausar rotação',
		autoRotateOff: 'Girar automaticamente',
		resetView: 'Redefinir vista',
		loading: 'Carregando modelo 3D…',
		sourceLabel: 'Arquivo',
		proTip: 'Dica profissional',
	};
	const fr: Record<string, string> = {
		heading: 'Anatomie 3D interactive',
		subtitle:
			'Explorez des modèles en 3D avec le patient pendant la consultation. Faites pivoter, zoomez et utilisez les points clés comme guide.',
		pickLabel: 'Choisissez une catégorie',
		categoryBadge: 'Catégorie active',
		keyPointsTitle: 'Points clés pour le patient',
		tipsTitle: 'Utiliser le visualiseur',
		tip1: 'Cliquez-glissez pour faire pivoter le modèle.',
		tip2: 'Utilisez la molette ou deux doigts pour zoomer.',
		tip3: 'Activez ou mettez en pause la rotation automatique.',
		tip4: 'Chaque catégorie inclut des points prêts à expliquer.',
		autoRotateOn: 'Arrêter la rotation',
		autoRotateOff: 'Rotation automatique',
		resetView: 'Réinitialiser la vue',
		loading: 'Chargement du modèle 3D…',
		sourceLabel: 'Fichier',
		proTip: 'Astuce pro',
	};
	const de: Record<string, string> = {
		heading: 'Interaktive 3D-Anatomie',
		subtitle:
			'Erkunden Sie dreidimensionale Modelle gemeinsam mit dem Patienten. Drehen, zoomen und Merkpunkte nutzen.',
		pickLabel: 'Kategorie auswählen',
		categoryBadge: 'Aktive Kategorie',
		keyPointsTitle: 'Wichtige Punkte für den Patienten',
		tipsTitle: 'Bedienung des Viewers',
		tip1: 'Zum Drehen des Modells ziehen.',
		tip2: 'Mit dem Mausrad oder zwei Fingern zoomen.',
		tip3: 'Automatische Drehung oben umschalten.',
		tip4: 'Jede Kategorie bringt fertige Erklärpunkte mit.',
		autoRotateOn: 'Rotation pausieren',
		autoRotateOff: 'Automatisch drehen',
		resetView: 'Ansicht zurücksetzen',
		loading: 'Lade 3D-Modell…',
		sourceLabel: 'Datei',
		proTip: 'Profi-Tipp',
	};
	switch (locale) {
		case 'en':
			return en;
		case 'pt':
			return pt;
		case 'fr':
			return fr;
		case 'de':
			return de;
		default:
			return es;
	}
}

// ── Accent → clases Tailwind ───────────────────────────────────────────────
// Centralizamos el mapping para que todas las tarjetas respeten los tokens
// del tema (primary/accent) y no hardcodeemos colores hex sueltos.

function accentClasses(accent: AnatomyCategory['accent'], isActive: boolean) {
	if (isActive) {
		switch (accent) {
			case 'rose':
				return 'border-rose-500/70 bg-rose-500/10 ring-rose-500/30 text-rose-700 dark:text-rose-300';
			case 'indigo':
				return 'border-indigo-500/70 bg-indigo-500/10 ring-indigo-500/30 text-indigo-700 dark:text-indigo-300';
			default:
				return 'border-primary/70 bg-primary/10 ring-primary/30 text-primary';
		}
	}
	return 'border-border/60 bg-background/60 hover:border-primary/40 hover:bg-muted/40 text-foreground';
}

// ── IntersectionObserver: activa animaciones al entrar al viewport ─────────
// Mismo patrón que home.page.tsx para coherencia visual con el resto de la app.
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

// ── Skeleton del viewer ────────────────────────────────────────────────────
// Se muestra mientras el chunk de three.js se descarga y también mientras el
// modelo .glb carga. La animación pulse indica actividad sin ser intrusiva.
function ViewerSkeleton({ label }: { label: string }) {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted/40 to-primary/5">
			<div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 backdrop-blur">
				<span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
				<span className="text-xs font-medium text-muted-foreground">
					{label}
				</span>
			</div>
		</div>
	);
}

// ── Componente principal ───────────────────────────────────────────────────

interface DoctorAnatomySectionProps {
	locale: AppLocale;
	/** Dark mode del dashboard — se propaga al <Canvas> para armonizar fondo */
	isDark?: boolean;
}

export function DoctorAnatomySection({
	locale,
	isDark = false,
}: DoctorAnatomySectionProps) {
	const i18n = t(locale);
	const [activeId, setActiveId] = useState<AnatomyCategoryId>('skeleton');
	const [autoRotate, setAutoRotate] = useState(true);
	// `viewerKey` se cambia al pulsar "Reiniciar vista" — remonta el Canvas
	// para restaurar la posición inicial de OrbitControls (no expone un reset API).
	const [viewerKey, setViewerKey] = useState(0);

	const prefersReduced = useReducedMotion();
	const { ref: headerRef, inView: headerInView } = useInView(0.25);
	const { ref: viewerRef, inView: viewerInView } = useInView(0.1);
	const { ref: infoRef, inView: infoInView } = useInView(0.15);

	// La lista está fija y `activeId` se inicializa con 'skeleton' — el find
	// siempre encuentra un resultado, pero usamos `?? [0]` en vez de `!` para
	// que el linter no se queje de la aserción non-null.
	const active =
		ANATOMY_CATEGORIES.find((c) => c.id === activeId) ?? ANATOMY_CATEGORIES[0];

	const initialMotion = prefersReduced ? { opacity: 0 } : { opacity: 0, y: 24 };
	const enterMotion = { opacity: 1, y: 0 };

	return (
		<div className="space-y-5">
			{/* ── Encabezado: fade+slide al entrar al viewport ─────────────── */}
			<motion.header
				ref={headerRef}
				initial={initialMotion}
				animate={headerInView ? enterMotion : initialMotion}
				transition={{ duration: 0.55, ease: 'easeOut' }}
				className="space-y-2"
			>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="secondary" className="gap-1.5">
						<SparklesIcon className="h-3.5 w-3.5" />
						{i18n.categoryBadge}
					</Badge>
					<span className="text-sm font-medium text-muted-foreground">
						{active.label[locale]}
					</span>
				</div>
				<h2 className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
					{i18n.heading}
				</h2>
				<p className="max-w-prose text-sm text-muted-foreground sm:text-base">
					{i18n.subtitle}
				</p>
			</motion.header>

			{/* ── Selector de categorías ───────────────────────────────────
			    Grid 1-col en móvil, 3-col en ≥sm. Cada tarjeta es un botón
			    accesible (aria-pressed) con swatch de icono. */}
			<div className="space-y-2">
				<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{i18n.pickLabel}
				</p>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
					{ANATOMY_CATEGORIES.map((cat, idx) => {
						const isActive = cat.id === activeId;
						const Icon = cat.icon;
						return (
							<motion.button
								key={cat.id}
								type="button"
								aria-pressed={isActive}
								onClick={() => setActiveId(cat.id)}
								initial={initialMotion}
								animate={headerInView ? enterMotion : initialMotion}
								transition={{
									duration: 0.45,
									ease: 'easeOut',
									delay: 0.08 * (idx + 1),
								}}
								whileHover={prefersReduced ? undefined : { y: -2 }}
								className={cn(
									'flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
									'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
									isActive ? 'ring-1 shadow-sm' : '',
									accentClasses(cat.accent, isActive),
								)}
							>
								<span
									className={cn(
										'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
										isActive ? 'bg-background/80 shadow-inner' : 'bg-muted/60',
									)}
									aria-hidden="true"
								>
									<Icon className="h-5 w-5" />
								</span>
								<span className="min-w-0">
									<span className="block truncate text-sm font-semibold">
										{cat.label[locale]}
									</span>
									<span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
										{cat.tagline[locale]}
									</span>
								</span>
							</motion.button>
						);
					})}
				</div>
			</div>

			{/* ── Layout principal: visor + explicación ────────────────────
			    Mobile: columna única (apilado).
			    Desktop (lg): 2 columnas, visor 3/5 y explicación 2/5. */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
				{/* Visor 3D */}
				<motion.div
					ref={viewerRef}
					initial={initialMotion}
					animate={viewerInView ? enterMotion : initialMotion}
					transition={{ duration: 0.55, ease: 'easeOut' }}
					className="lg:col-span-3"
				>
					<Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm">
						<CardHeader className="flex-row items-center justify-between gap-2 pb-2">
							<div className="min-w-0">
								<CardTitle className="truncate text-sm sm:text-base">
									{active.label[locale]}
								</CardTitle>
								<CardDescription className="truncate text-xs">
									{active.tagline[locale]}
								</CardDescription>
							</div>
							<div className="flex shrink-0 items-center gap-1.5">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setAutoRotate((v) => !v)}
									aria-pressed={autoRotate}
									title={autoRotate ? i18n.autoRotateOn : i18n.autoRotateOff}
								>
									{autoRotate ? (
										<PauseIcon className="h-4 w-4" />
									) : (
										<PlayIcon className="h-4 w-4" />
									)}
									<span className="ml-1 hidden sm:inline">
										{autoRotate ? i18n.autoRotateOn : i18n.autoRotateOff}
									</span>
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setViewerKey((k) => k + 1)}
									title={i18n.resetView}
								>
									<ArrowPathIcon className="h-4 w-4" />
									<span className="ml-1 hidden sm:inline">
										{i18n.resetView}
									</span>
								</Button>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							{/* aspect-[4/3] en móvil, aspect-video en desktop — mantiene
							    el visor alto y cómodo sin pedir pantalla completa.
							    AnimatePresence intercambia el viewer suavemente al
							    cambiar de categoría para que no haya "salto". */}
							<div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-video">
								<AnimatePresence mode="wait">
									<motion.div
										key={`${active.id}-${viewerKey}`}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.3 }}
										className="absolute inset-0"
									>
										<Suspense
											fallback={<ViewerSkeleton label={i18n.loading} />}
										>
											<AnatomyViewer
												modelUrl={active.modelUrl}
												autoRotate={autoRotate}
												isDark={isDark}
											/>
										</Suspense>
									</motion.div>
								</AnimatePresence>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* Explicación + puntos clave */}
				<motion.div
					ref={infoRef}
					initial={initialMotion}
					animate={infoInView ? enterMotion : initialMotion}
					transition={{ duration: 0.55, ease: 'easeOut', delay: 0.12 }}
					className="space-y-3 lg:col-span-2"
				>
					{/* Descripción científica */}
					<Card className="border-border/70 bg-card/90 shadow-sm">
						<CardHeader className="pb-2">
							<CardTitle className="text-base">
								{active.label[locale]}
							</CardTitle>
							<CardDescription className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
								{i18n.sourceLabel}: {active.modelUrl.split('/').pop()}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<AnimatePresence mode="wait">
								<motion.p
									key={active.id}
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									transition={{ duration: 0.25 }}
									className="text-sm leading-relaxed text-foreground/90"
								>
									{active.description[locale]}
								</motion.p>
							</AnimatePresence>
						</CardContent>
					</Card>

					{/* Puntos clave: lista que el médico puede leer al paciente */}
					<Card className="border-border/70 bg-card/90 shadow-sm">
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 text-base">
								<BoltIcon className="h-4 w-4 text-primary" />
								{i18n.keyPointsTitle}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<AnimatePresence mode="wait">
								<motion.ul
									key={active.id}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.25 }}
									className="space-y-2"
								>
									{active.talkingPoints[locale].map((point, i) => (
										<motion.li
											key={point}
											initial={
												prefersReduced ? undefined : { opacity: 0, x: -8 }
											}
											animate={
												prefersReduced ? undefined : { opacity: 1, x: 0 }
											}
											transition={{
												duration: 0.3,
												delay: 0.05 * i,
												ease: 'easeOut',
											}}
											className="flex items-start gap-2 text-sm"
										>
											<span
												className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
												aria-hidden="true"
											/>
											<span className="text-foreground/90">{point}</span>
										</motion.li>
									))}
								</motion.ul>
							</AnimatePresence>
						</CardContent>
					</Card>

					{/* Tips de uso: orientan al médico a usar el visor con fluidez */}
					<Card className="border-primary/30 bg-primary/5 shadow-sm">
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 text-sm font-semibold">
								<SparklesIcon className="h-4 w-4 text-primary" />
								{i18n.tipsTitle}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ul className="space-y-1.5 text-xs text-foreground/80">
								<li>• {i18n.tip1}</li>
								<li>• {i18n.tip2}</li>
								<li>• {i18n.tip3}</li>
								<li>• {i18n.tip4}</li>
							</ul>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}

// Daniel Useche
