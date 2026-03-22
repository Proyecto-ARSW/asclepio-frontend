import { redirect } from 'react-router';
import { currentLocale, localePath } from '@/features/i18n/locale-path';

export async function clientLoader() {
	if (typeof window === 'undefined') return null;
	const locale = currentLocale(window.location.pathname);
	const raw = localStorage.getItem('asclepio-auth');
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			if (parsed.state?.accessToken) return redirect(localePath('/dashboard', locale));
			if (parsed.state?.preToken) return redirect(localePath('/select-hospital', locale));
		} catch {}
	}
	return redirect(localePath('/login', locale));
}

export default function HomePage() {
	return null;
}
