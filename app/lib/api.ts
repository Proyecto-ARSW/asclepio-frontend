const API_URL = import.meta.env.VITE_APP_API_URL ?? 'http://localhost:3000';

function getStoredToken(): string | null {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem('asclepio-auth');
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		return parsed.state?.accessToken ?? parsed.state?.preToken ?? null;
	} catch {
		return null;
	}
}

async function handleResponse<T>(res: Response): Promise<T> {
	if (!res.ok) {
		let message = 'Error en la solicitud';
		try {
			const body = await res.json();
			message = body.message ?? message;
		} catch {}
		throw new Error(message);
	}
	return res.json() as Promise<T>;
}

export async function apiPost<T>(
	path: string,
	body: unknown,
	token?: string
): Promise<T> {
	const t = token ?? getStoredToken();
	const res = await fetch(`${API_URL}${path}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(t ? { Authorization: `Bearer ${t}` } : {}),
		},
		body: JSON.stringify(body),
	});
	return handleResponse<T>(res);
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
	const t = token ?? getStoredToken();
	const res = await fetch(`${API_URL}${path}`, {
		headers: {
			...(t ? { Authorization: `Bearer ${t}` } : {}),
		},
	});
	return handleResponse<T>(res);
}

export async function apiPatch<T>(
	path: string,
	body: unknown,
	token?: string
): Promise<T> {
	const t = token ?? getStoredToken();
	const res = await fetch(`${API_URL}${path}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			...(t ? { Authorization: `Bearer ${t}` } : {}),
		},
		body: JSON.stringify(body),
	});
	return handleResponse<T>(res);
}

export type { };
