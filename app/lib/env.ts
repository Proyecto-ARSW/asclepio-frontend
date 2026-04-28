/**
 * Centraliza todas las variables de entorno del frontend.
 *
 * Por qué un módulo central:
 *   - Un único lugar donde cambiar URLs al escalar con un gateway
 *   - Fácil de auditar qué servicios consume el frontend
 *   - El fallback a VITE_APP_API_URL garantiza retrocompatibilidad
 *     con entornos que todavía no definen las variables nuevas
 */

const BASE_FALLBACK = (
	import.meta.env.VITE_APP_API_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

function resolveGraphqlUrl(): string {
	const raw = import.meta.env.VITE_API_GRAPHQL_URL?.trim();
	if (!raw) return `${BASE_FALLBACK}/graphql`;

	const normalized = raw.replace(/\/$/, '');

	// If only host/port is provided (or root path), default to /graphql.
	try {
		const parsed = new URL(normalized);
		if (parsed.pathname === '' || parsed.pathname === '/') {
			return `${normalized}/graphql`;
		}
	} catch {
		// Keep custom values that are not absolute URLs (e.g. relative paths).
	}

	return normalized;
}

/**
 * Base URL para llamadas REST al backend NestJS.
 * En producción con gateway podría apuntar a: https://api.asclepio.com
 */
export const REST_API_URL = (
	import.meta.env.VITE_API_REST_URL ?? BASE_FALLBACK
).replace(/\/$/, '');

/**
 * Endpoint completo de GraphQL.
 * En producción con gateway podría apuntar a: https://graphql.asclepio.com/graphql
 * Se puede separar de REST para rutearlo a un microservicio o federated gateway.
 */
export const GRAPHQL_URL = resolveGraphqlUrl();

/**
 * Base URL del servicio de autenticación (better-auth).
 * Útil si auth se extrae a un servicio dedicado o un gateway de identidad.
 */
export const AUTH_API_URL = (
	import.meta.env.VITE_API_AUTH_URL ?? BASE_FALLBACK
).replace(/\/$/, '');

/**
 * URL del servidor de juego (WebSocket / HTTP).
 * Separado desde el inicio porque ya vive en un proceso Go distinto.
 */
export const GAME_SERVER_URL = (
	import.meta.env.VITE_GAME_SERVER_URL ?? 'ws://localhost:3002'
).replace(/\/$/, '');

/**
 * URL del servicio de IA (FastAPI).
 */
export const AI_API_URL = (
	import.meta.env.VITE_AI_API_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');

/**
 * URL del microservicio de Maps (Spring Boot).
 * Busca hospitales cercanos via Nominatim/OSM + Haversine.
 */
export const MAPS_API_URL = (
	import.meta.env.VITE_MAPS_API_URL ?? 'http://localhost:8081'
).replace(/\/$/, '');

/**
 * URL del servicio de búsqueda semántica (FastAPI + pgvector).
 * Indexa historias clínicas y expone búsqueda vectorial por similitud coseno.
 * Comparte el JWT_SECRET con NestJS — filtra resultados por hospitalId del token.
 */
export const SEARCH_API_URL = (
	import.meta.env.VITE_SEARCH_API_URL ?? 'http://localhost:3006'
).replace(/\/$/, '');

/**
 * URL del microservicio de triage (NestJS-TRIAGE).
 * Confirmaciones de nivel, cola de espera, alertas críticas.
 */
export const TRIAGE_API_URL = (
	import.meta.env.VITE_TRIAGE_API_URL ?? 'http://localhost:3001'
).replace(/\/$/, '');

// Daniel Useche
