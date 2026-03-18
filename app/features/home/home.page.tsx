import { redirect } from 'react-router';

export async function clientLoader() {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem('asclepio-auth');
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			if (parsed.state?.accessToken) return redirect('/dashboard');
			if (parsed.state?.preToken) return redirect('/select-hospital');
		} catch {}
	}
	return redirect('/login');
}

export default function HomePage() {
	return null;
}
