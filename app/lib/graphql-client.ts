const API_URL = import.meta.env.VITE_APP_API_URL ?? 'http://localhost:3000';

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
	const res = await fetch(`${API_URL}/graphql`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify({ query, variables }),
	});

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
