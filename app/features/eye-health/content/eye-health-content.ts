import { type AppLocale, currentLocale } from '@/features/i18n/locale-path';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import pt from './pt.json';

export type EyeHealthContent = typeof es;

const eyeHealthDictionaries: Record<AppLocale, unknown> = {
	es,
	en,
	pt,
	fr,
	de,
};

function isObjectLike(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeep(base: unknown, override: unknown): unknown {
	if (Array.isArray(base)) {
		return Array.isArray(override) ? override : base;
	}

	if (isObjectLike(base) && isObjectLike(override)) {
		const merged: Record<string, unknown> = { ...base };
		for (const key of Object.keys(override)) {
			merged[key] = mergeDeep(base[key], override[key]);
		}
		return merged;
	}

	return override === undefined ? base : override;
}

export function getEyeHealthContent(
	locale: AppLocale = currentLocale(),
): EyeHealthContent {
	return mergeDeep(es, eyeHealthDictionaries[locale]) as EyeHealthContent;
}

export function formatEyeHealthText(
	template: string,
	params: Record<string, string | number>,
): string {
	return Object.entries(params).reduce(
		(result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
		template,
	);
}
