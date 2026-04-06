type StoredAuthState = {
	accessToken?: string | null;
	preToken?: string | null;
};

function decodeBase64Url(input: string) {
	const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
	return atob(padded);
}

function readStoredAuthState(): StoredAuthState | null {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem('asclepio-auth');
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as {
			state?: StoredAuthState;
		};
		return parsed.state ?? null;
	} catch {
		return null;
	}
}

function decodeJwtPayload(token: string): { exp?: number } | null {
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	try {
		return JSON.parse(decodeBase64Url(parts[1])) as { exp?: number };
	} catch {
		return null;
	}
}

export function clearStoredAuth() {
	if (typeof window === 'undefined') return;
	localStorage.removeItem('asclepio-auth');
}

export function isExpiredAccessToken(token: string, skewSeconds = 30) {
	const payload = decodeJwtPayload(token);
	if (!payload || typeof payload.exp !== 'number') {
		// If token cannot be decoded as JWT, don't assume expiration here.
		return false;
	}
	return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
}

export function getValidAccessTokenFromStorage(): string | null {
	const state = readStoredAuthState();
	const token = state?.accessToken;
	if (!token) return null;

	if (isExpiredAccessToken(token)) {
		clearStoredAuth();
		return null;
	}

	return token;
}

export function getStoredPreToken(): string | null {
	const state = readStoredAuthState();
	return state?.preToken ?? null;
}

export function hasValidAccessTokenInStorage() {
	return Boolean(getValidAccessTokenFromStorage());
}
