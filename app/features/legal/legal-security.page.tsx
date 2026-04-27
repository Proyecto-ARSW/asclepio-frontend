import { currentLocale } from '@/features/i18n/locale-path';
import { getLegalMetaTitle } from './legal-content';
import { LegalDocumentPageShell } from './legal-document.page-shell';

export function meta() {
	const locale = currentLocale();
	return [{ title: getLegalMetaTitle('security', locale) }];
}

export default function LegalSecurityPage() {
	return <LegalDocumentPageShell documentId="security" />;
}
