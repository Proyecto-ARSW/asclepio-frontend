import type { AppLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import type { TriageApiError } from './triage.types';

function getErrorByStatus(status: number, locale: AppLocale): string | null {
	switch (status) {
		case 400:
			return m.triageError400({}, { locale });
		case 401:
			return m.triageError401({}, { locale });
		case 403:
			return m.triageError403({}, { locale });
		case 404:
			return m.triageError404({}, { locale });
		case 409:
			return m.triageError409({}, { locale });
		case 422:
			return m.triageError422({}, { locale });
		case 500:
			return m.triageError500({}, { locale });
		default:
			return null;
	}
}

export function mapTriageErrorToMessage(
	error: unknown,
	locale: AppLocale,
): string {
	if (typeof error === 'object' && error !== null) {
		const triageError = error as Partial<TriageApiError>;
		if (triageError.status) {
			const translatedMessage = getErrorByStatus(triageError.status, locale);
			if (translatedMessage) {
				return translatedMessage;
			}
		}
		if (
			typeof triageError.message === 'string' &&
			triageError.message.length > 0
		) {
			return triageError.message;
		}
	}

	if (error instanceof Error && error.message.length > 0) {
		return error.message;
	}

	return m.triageErrorUnknown({}, { locale });
}
