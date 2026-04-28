import { currentLocale, localePath } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import {
	clearStoredAuth,
	getStoredPreToken,
	getValidAccessTokenFromStorage,
} from '@/lib/auth-session';
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

export function getStoredToken(): string | null {
	const accessToken = getValidAccessTokenFromStorage();
	if (accessToken) return accessToken;
	return getStoredPreToken();
}

function handleExpiredSessionRedirect() {
	if (typeof window === 'undefined') return;
	clearStoredAuth();
	const locale = currentLocale(window.location.pathname);
	const loginPath = localePath('/login', locale);
	if (window.location.pathname !== loginPath) {
		window.location.replace(loginPath);
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
	if (res.status === 401 && t) {
		handleExpiredSessionRedirect();
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
	if (res.status === 401 && t) {
		handleExpiredSessionRedirect();
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
	if (res.status === 401 && t) {
		handleExpiredSessionRedirect();
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
