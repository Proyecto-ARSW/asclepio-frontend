import { currentLocale, localePath } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import {
	clearStoredAuth,
	getValidAccessTokenFromStorage,
} from '@/lib/auth-session';
import { GRAPHQL_URL } from '@/lib/env';

function getNetworkErrorMessage() {
	const locale = currentLocale();
	return m.commonNetworkErrorBackendUnavailable({}, { locale });
}

function isNetworkError(error: unknown): boolean {
	return error instanceof TypeError;
}

function getAccessToken(): string | null {
	return getValidAccessTokenFromStorage();
}

function isUnauthorizedGraphqlMessage(message: string) {
	return /(unauth|unauthoriz|token|jwt|session|forbidden)/i.test(message);
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

export interface GqlError {
	message: string;
	locations?: { line: number; column: number }[];
	path?: string[];
}

export interface GqlResponse<T> {
	data?: T;
	errors?: GqlError[];
}

function isSchemaValidationErrorMessage(message: string) {
	return /(cannot\s+query\s+field|unknown\s+argument|unknown\s+type)/i.test(
		message,
	);
}

export async function gqlQuery<T>(
	query: string,
	variables?: Record<string, unknown>,
): Promise<T> {
	const token = getAccessToken();
	let res: Response;
	try {
		res = await fetch(GRAPHQL_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify({ query, variables }),
		});
	} catch (error) {
		if (!isNetworkError(error)) {
			throw error;
		}
		throw new Error(getNetworkErrorMessage());
	}

	if (!res.ok) {
		let body: GqlResponse<T> | null = null;
		try {
			body = (await res.json()) as GqlResponse<T>;
		} catch {
			body = null;
		}

		const gqlMessage = body?.errors?.[0]?.message;
		if (gqlMessage) {
			if (token && isUnauthorizedGraphqlMessage(gqlMessage)) {
				handleExpiredSessionRedirect();
			}
			throw new Error(gqlMessage);
		}

		if (res.status === 401 && token) {
			handleExpiredSessionRedirect();
		}
		throw new Error(`HTTP ${res.status}: ${res.statusText}`);
	}

	const json: GqlResponse<T> = await res.json();

	if (json.errors?.length) {
		const message = json.errors[0].message;
		if (token && isUnauthorizedGraphqlMessage(message)) {
			handleExpiredSessionRedirect();
		}
		throw new Error(message);
	}

	if (!json.data) {
		throw new Error('No data received from GraphQL');
	}

	return json.data;
}

export async function gqlMutation<T>(
	mutation: string,
	variables?: Record<string, unknown>,
): Promise<T> {
	return gqlQuery<T>(mutation, variables);
}

export async function gqlQueryWithFallback<T>(
	queries: string[],
	variables?: Record<string, unknown>,
): Promise<T> {
	let lastError: unknown;
	for (const query of queries) {
		try {
			return await gqlQuery<T>(query, variables);
		} catch (error) {
			lastError = error;
			if (
				!(error instanceof Error) ||
				!isSchemaValidationErrorMessage(error.message)
			) {
				throw error;
			}
		}
	}

	if (lastError instanceof Error) {
		throw lastError;
	}
	throw new Error('No GraphQL query fallback succeeded');
}
