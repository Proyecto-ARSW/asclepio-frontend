import { currentLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';

const API_URL = (
	import.meta.env.VITE_APP_API_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

export interface ApiHttpError {
	status: number;
	code: string;
	message: string;
}

function getNetworkErrorMessage() {
	const locale = currentLocale();
	return m.commonNetworkErrorBackendUnavailable({}, { locale });
}

function isNetworkError(error: unknown): boolean {
	return error instanceof TypeError;
}

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

async function handleResponseWithStatus<T>(res: Response): Promise<T> {
	if (!res.ok) {
		let code = 'unknown_error';
		let message = 'Error en la solicitud';
		try {
			const body = (await res.json()) as Record<string, unknown>;
			code = String(body.code ?? code);
			message = String(body.message ?? message);
		} catch {}
		throw {
			status: res.status,
			code,
			message,
		} satisfies ApiHttpError;
	}
	return res.json() as Promise<T>;
}

export async function apiPost<T>(
	path: string,
	body: unknown,
	token?: string,
): Promise<T> {
	const t = token ?? getStoredToken();
	let res: Response;
	try {
		res = await fetch(`${API_URL}${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(t ? { Authorization: `Bearer ${t}` } : {}),
			},
			body: JSON.stringify(body),
		});
	} catch (error) {
		if (!isNetworkError(error)) {
			throw error;
		}
		throw new Error(getNetworkErrorMessage());
	}
	return handleResponse<T>(res);
}

export async function apiPostWithStatus<T>(
	path: string,
	body: unknown,
	token?: string,
): Promise<T> {
	const t = token ?? getStoredToken();
	let res: Response;
	try {
		res = await fetch(`${API_URL}${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(t ? { Authorization: `Bearer ${t}` } : {}),
			},
			body: JSON.stringify(body),
		});
	} catch (error) {
		if (!isNetworkError(error)) {
			throw error;
		}
		throw new Error(getNetworkErrorMessage());
	}
	return handleResponseWithStatus<T>(res);
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
	const t = token ?? getStoredToken();
	let res: Response;
	try {
		res = await fetch(`${API_URL}${path}`, {
			headers: {
				...(t ? { Authorization: `Bearer ${t}` } : {}),
			},
		});
	} catch (error) {
		if (!isNetworkError(error)) {
			throw error;
		}
		throw new Error(getNetworkErrorMessage());
	}
	return handleResponse<T>(res);
}

export async function apiGetWithStatus<T>(
	path: string,
	token?: string,
): Promise<T> {
	const t = token ?? getStoredToken();
	let res: Response;
	try {
		res = await fetch(`${API_URL}${path}`, {
			headers: {
				...(t ? { Authorization: `Bearer ${t}` } : {}),
			},
		});
	} catch (error) {
		if (!isNetworkError(error)) {
			throw error;
		}
		throw new Error(getNetworkErrorMessage());
	}
	return handleResponseWithStatus<T>(res);
}

export async function apiPatch<T>(
	path: string,
	body: unknown,
	token?: string,
): Promise<T> {
	const t = token ?? getStoredToken();
	let res: Response;
	try {
		res = await fetch(`${API_URL}${path}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				...(t ? { Authorization: `Bearer ${t}` } : {}),
			},
			body: JSON.stringify(body),
		});
	} catch (error) {
		if (!isNetworkError(error)) {
			throw error;
		}
		throw new Error(getNetworkErrorMessage());
	}
	return handleResponse<T>(res);
}

export async function apiPut<T>(
	path: string,
	body: unknown,
	token?: string,
): Promise<T> {
	const t = token ?? getStoredToken();
	let res: Response;
	try {
		res = await fetch(`${API_URL}${path}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				...(t ? { Authorization: `Bearer ${t}` } : {}),
			},
			body: JSON.stringify(body),
		});
	} catch (error) {
		if (!isNetworkError(error)) {
			throw error;
		}
		throw new Error(getNetworkErrorMessage());
	}
	return handleResponseWithStatus<T>(res);
}

export async function apiPostFormData<T>(
	path: string,
	body: FormData,
	token?: string,
): Promise<T> {
	const t = token ?? getStoredToken();
	let res: Response;
	try {
		res = await fetch(`${API_URL}${path}`, {
			method: 'POST',
			headers: {
				...(t ? { Authorization: `Bearer ${t}` } : {}),
			},
			body,
		});
	} catch (error) {
		if (!isNetworkError(error)) {
			throw error;
		}
		throw new Error(getNetworkErrorMessage());
	}
	return handleResponseWithStatus<T>(res);
}

export async function apiGetBlob(path: string, token?: string): Promise<Blob> {
	const t = token ?? getStoredToken();
	let res: Response;
	try {
		res = await fetch(`${API_URL}${path}`, {
			headers: {
				...(t ? { Authorization: `Bearer ${t}` } : {}),
			},
		});
	} catch (error) {
		if (!isNetworkError(error)) {
			throw error;
		}
		throw new Error(getNetworkErrorMessage());
	}

	if (!res.ok) {
		let code = 'unknown_error';
		let message = 'Error en la solicitud';
		try {
			const body = (await res.json()) as Record<string, unknown>;
			code = String(body.code ?? code);
			message = String(body.message ?? message);
		} catch {}
		throw {
			status: res.status,
			code,
			message,
		} satisfies ApiHttpError;
	}

	return res.blob();
}
