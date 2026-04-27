import { currentLocale } from '@/features/i18n/locale-path';
import { getEyeHealthContent } from './content/eye-health-content';
import { EyeHealthPage } from './pages/EyeHealthPage';

export function meta() {
	const locale = currentLocale();
	const content = getEyeHealthContent(locale);
	return [{ title: content.meta.title }];
}

export default EyeHealthPage;
