export type ThemeMode = 'light' | 'dark' | 'system';

export const FONT_SCALE_LEVELS = [0.875, 1, 1.25, 1.5, 2] as const;
export type FontScale = (typeof FONT_SCALE_LEVELS)[number];

// Modos de color accesibles para distintas condiciones visuales.
// Se aplican como clases en <html> y se combinan con el tema claro/oscuro.
export type ColorMode =
	| 'none'
	| 'high-contrast' // Baja visión / cataratas: máximo contraste blanco/negro
	| 'sepia' // Fatiga ocular / fotosensibilidad: tonos cálidos ámbar
	| 'grayscale' // Acromatopsia: escala de grises completa (CSS filter)
	| 'colorblind-rg'; // Deuteranopia/protanopia: filtro SVG feColorMatrix

export const DEFAULT_OVERVIEW_BLOCKS = [
	'kpiUsers',
	'kpiHospitals',
	'kpiPatients',
	'kpiDoctors',
	'kpiNurses',
	'kpiAppointments',
	'kpiQueue',
	'kpiMedicines',
	'recentAppointments',
	'queuePreview',
] as const;

type OverviewBlockKey = (typeof DEFAULT_OVERVIEW_BLOCKS)[number];

export interface UiPreferences {
	theme: ThemeMode;
	colorMode: ColorMode;
	dyslexiaFont: boolean;
	voiceGuideEnabled: boolean;
	overviewBlocks: OverviewBlockKey[];
	fontScale: FontScale;
}

export const UI_PREFERENCES_STORAGE_KEY = 'asclepio-ui-preferences';

const DEFAULT_PREFERENCES: UiPreferences = {
	theme: 'light',
	colorMode: 'none',
	dyslexiaFont: false,
	voiceGuideEnabled: false,
	overviewBlocks: [...DEFAULT_OVERVIEW_BLOCKS],
	fontScale: 1,
};

function isOverviewBlockKey(value: string): value is OverviewBlockKey {
	return DEFAULT_OVERVIEW_BLOCKS.includes(value as OverviewBlockKey);
}

function systemPrefersDark(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-color-scheme: dark)').matches
	);
}

function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
	if (theme === 'system') {
		return systemPrefersDark() ? 'dark' : 'light';
	}
	return theme;
}

export function readUiPreferences(): UiPreferences {
	if (typeof window === 'undefined') {
		return DEFAULT_PREFERENCES;
	}

	const raw = localStorage.getItem(UI_PREFERENCES_STORAGE_KEY);
	if (!raw) {
		return DEFAULT_PREFERENCES;
	}

	try {
		const parsed = JSON.parse(raw) as Partial<UiPreferences>;
		const theme =
			parsed.theme === 'light' ||
			parsed.theme === 'dark' ||
			parsed.theme === 'system'
				? parsed.theme
				: DEFAULT_PREFERENCES.theme;
		const dyslexiaFont = Boolean(parsed.dyslexiaFont);
		const voiceGuideEnabled = Boolean(parsed.voiceGuideEnabled);
		const overviewBlocksField = Array.isArray(parsed.overviewBlocks)
			? parsed.overviewBlocks
			: null;
		const parsedOverviewBlocks = overviewBlocksField
			? overviewBlocksField.filter(
					(block): block is OverviewBlockKey =>
						typeof block === 'string' && isOverviewBlockKey(block),
				)
			: [];
		const overviewBlocks = overviewBlocksField
			? overviewBlocksField.length === 0
				? []
				: parsedOverviewBlocks.length > 0
					? parsedOverviewBlocks
					: [...DEFAULT_PREFERENCES.overviewBlocks]
			: [...DEFAULT_PREFERENCES.overviewBlocks];
		const COLOR_MODES: ColorMode[] = [
			'none',
			'high-contrast',
			'sepia',
			'grayscale',
			'colorblind-rg',
		];
		const colorMode: ColorMode = COLOR_MODES.includes(
			parsed.colorMode as ColorMode,
		)
			? (parsed.colorMode as ColorMode)
			: DEFAULT_PREFERENCES.colorMode;
		const fontScale: FontScale = FONT_SCALE_LEVELS.includes(
			parsed.fontScale as FontScale,
		)
			? (parsed.fontScale as FontScale)
			: DEFAULT_PREFERENCES.fontScale;
		return {
			theme,
			colorMode,
			dyslexiaFont,
			voiceGuideEnabled,
			overviewBlocks,
			fontScale,
		};
	} catch {
		return DEFAULT_PREFERENCES;
	}
}

export function saveUiPreferences(prefs: UiPreferences): void {
	if (typeof window === 'undefined') {
		return;
	}
	localStorage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
}

const ALL_COLOR_MODE_CLASSES: ColorMode[] = [
	'high-contrast',
	'sepia',
	'grayscale',
	'colorblind-rg',
];

export function applyUiPreferences(prefs: UiPreferences): void {
	if (typeof document === 'undefined') {
		return;
	}

	const root = document.documentElement;

	// Tema claro/oscuro
	const resolvedTheme = resolveTheme(prefs.theme);
	root.classList.toggle('dark', resolvedTheme === 'dark');

	// Tipografía para dislexia
	root.classList.toggle('dyslexia-font', prefs.dyslexiaFont);

	// Escala de fuente: se aplica como propiedad inline para no interferir
	// con las variables CSS del tema declaradas en :root del stylesheet.
	root.style.setProperty('--font-scale', String(prefs.fontScale));

	// Modos de color accesibles: limpiamos todos primero y aplicamos el activo.
	// Esto garantiza que nunca haya dos modos activos al mismo tiempo.
	for (const mode of ALL_COLOR_MODE_CLASSES) {
		root.classList.toggle(`color-${mode}`, prefs.colorMode === mode);
	}
}

export function readAndApplyUiPreferences(): UiPreferences {
	const prefs = readUiPreferences();
	applyUiPreferences(prefs);
	return prefs;
}

// Daniel Useche
