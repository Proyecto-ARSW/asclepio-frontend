export type ThemeMode = 'light' | 'dark' | 'system';

export interface UiPreferences {
	theme: ThemeMode;
	dyslexiaFont: boolean;
}

export const UI_PREFERENCES_STORAGE_KEY = 'asclepio-ui-preferences';

const DEFAULT_PREFERENCES: UiPreferences = {
	theme: 'light',
	dyslexiaFont: false,
};

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
		return { theme, dyslexiaFont };
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

export function applyUiPreferences(prefs: UiPreferences): void {
	if (typeof document === 'undefined') {
		return;
	}

	const root = document.documentElement;
	const resolvedTheme = resolveTheme(prefs.theme);
	root.classList.toggle('dark', resolvedTheme === 'dark');
	root.classList.toggle('dyslexia-font', prefs.dyslexiaFont);
}

export function readAndApplyUiPreferences(): UiPreferences {
	const prefs = readUiPreferences();
	applyUiPreferences(prefs);
	return prefs;
}
