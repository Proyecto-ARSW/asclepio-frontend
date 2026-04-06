import { currentLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { REST_API_URL } from '@/lib/env';

// Alias local — toda la lógica de resolución vive en env.ts
const API_URL = REST_API_URL;

export class ApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
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
			const body = (await res.json()) as {
				message?: unknown;
				error?: unknown;
			};
			if (typeof body.message === 'string' && body.message.trim()) {
				message = body.message.trim();
			} else if (typeof body.error === 'string' && body.error.trim()) {
				message = body.error.trim();
			}
		} catch {}
		throw new ApiError(message, res.status);
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
