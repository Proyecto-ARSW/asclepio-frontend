import type { AppLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';

export type LegalDocumentId = 'terms' | 'usage' | 'security' | 'privacy';

export interface LegalDocumentOption {
	id: LegalDocumentId;
	path: string;
	label: string;
}

export function getLegalDocumentOptions(
	locale: AppLocale,
): ReadonlyArray<LegalDocumentOption> {
	return [
		{
			id: 'terms',
			path: '/legal/terms',
			label: m.legalOptionTerms({}, { locale }),
		},
		{
			id: 'usage',
			path: '/legal/usage-policies',
			label: m.legalOptionUsage({}, { locale }),
		},
		{
			id: 'security',
			path: '/legal/security-policy',
			label: m.legalOptionSecurity({}, { locale }),
		},
		{
			id: 'privacy',
			path: '/legal/privacy-policy',
			label: m.legalOptionPrivacy({}, { locale }),
		},
	] as const;
}

export function getLegalDocumentTitle(id: LegalDocumentId, locale: AppLocale): string {
	switch (id) {
		case 'terms':
			return m.legalTermsTitle({}, { locale });
		case 'usage':
			return m.legalUsageTitle({}, { locale });
		case 'security':
			return m.legalSecurityTitle({}, { locale });
		case 'privacy':
			return m.legalPrivacyTitle({}, { locale });
	}
}

export function getLegalDocumentBody(id: LegalDocumentId, locale: AppLocale): string {
	switch (id) {
		case 'terms':
			return m.legalTermsBody({}, { locale });
		case 'usage':
			return m.legalUsageBody({}, { locale });
		case 'security':
			return m.legalSecurityBody({}, { locale });
		case 'privacy':
			return m.legalPrivacyBody({}, { locale });
	}
}

export function getLegalMetaTitle(id: LegalDocumentId, locale: AppLocale): string {
	switch (id) {
		case 'terms':
			return m.legalMetaTitleTerms({}, { locale });
		case 'usage':
			return m.legalMetaTitleUsage({}, { locale });
		case 'security':
			return m.legalMetaTitleSecurity({}, { locale });
		case 'privacy':
			return m.legalMetaTitlePrivacy({}, { locale });
	}
}
