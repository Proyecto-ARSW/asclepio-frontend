import { getLocale } from '@/features/i18n/paraglide/runtime';

export type AppLocale = 'es' | 'en' | 'pt' | 'fr';

const SUPPORTED_LOCALES: AppLocale[] = ['es', 'en', 'pt', 'fr'];

function normalizeLocale(value?: string | null): AppLocale {
	if (value && SUPPORTED_LOCALES.includes(value as AppLocale)) {
		return value as AppLocale;
	}
	return 'es';
}

export function localeFromPathname(pathname: string): AppLocale {
	const [first] = pathname.split('/').filter(Boolean);
	return normalizeLocale(first);
}

export function currentLocale(pathname?: string): AppLocale {
	if (pathname) {
		return localeFromPathname(pathname);
	}

	if (typeof window !== 'undefined') {
		return localeFromPathname(window.location.pathname);
	}

	return normalizeLocale(getLocale());
}

export function localePath(path: string, locale = currentLocale()): string {
	const cleanPath = path.startsWith('/') ? path : `/${path}`;
	const segments = cleanPath.split('/').filter(Boolean);

	if (segments[0] && SUPPORTED_LOCALES.includes(segments[0] as AppLocale)) {
		segments.shift();
	}

	const base = `/${segments.join('/')}`;
	if (locale === 'es') {
		return base === '/' ? '/' : base;
	}
	return base === '/' ? `/${locale}` : `/${locale}${base}`;
}
