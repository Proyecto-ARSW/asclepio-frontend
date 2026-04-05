import { GRAPHQL_URL } from '@/lib/env';
import { currentLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';

function getNetworkErrorMessage() {
	const locale = currentLocale();
	return m.commonNetworkErrorBackendUnavailable({}, { locale });
}

function isNetworkError(error: unknown): boolean {
	return error instanceof TypeError;
}

function getAccessToken(): string | null {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem('asclepio-auth');
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		return parsed.state?.accessToken ?? null;
	} catch {
		return null;
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
		throw new Error(`HTTP ${res.status}: ${res.statusText}`);
	}

	const json: GqlResponse<T> = await res.json();

	if (json.errors?.length) {
		throw new Error(json.errors[0].message);
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
