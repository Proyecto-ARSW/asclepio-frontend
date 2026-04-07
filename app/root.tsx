import {
	isRouteErrorResponse,
	Links,
	Meta,
	type MiddlewareFunction,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLocation,
} from 'react-router';
import type { Route } from './+types/root';
import '@/app.css';
import { Analytics } from '@vercel/analytics/react';
import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner/sonner.component';
import { currentLocale, localeFromPathname } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { paraglideMiddleware } from '@/features/i18n/paraglide/server';
import { readAndApplyUiPreferences } from '@/features/preferences/ui-preferences';
import { VoiceGuideButton } from '@/features/preferences/voice-guide-button';
import { AppQueryClientProvider } from '@/providers/query-client.provider';
import { useAuthStore } from '@/store/auth.store';

function isMissingParaglideRouteError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}
	const message = error.message.toLowerCase();
	return message.includes('route not found') && message.includes('manifest');
}

export const middleware: MiddlewareFunction[] = [
	async (ctx, next) => {
		try {
			return await paraglideMiddleware(ctx.request, () => next());
		} catch (error) {
			if (isMissingParaglideRouteError(error)) {
				return next();
			}
			throw error;
		}
	},
];

export function Layout({ children }: { children: React.ReactNode }) {
	// useLocation() hace que Layout re-renderice en cada navegación,
	// garantizando que locale sea siempre el correcto sin recargar la página.
	// Esto es clave para que VoiceGuideButton reciba el prop actualizado.
	const location = useLocation();
	const locale = localeFromPathname(location.pathname);

	return (
		<html lang={locale} suppressHydrationWarning>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" type="image/png" href="/favicon.png" />
				<Meta />
				<Links />
			</head>
			<body suppressHydrationWarning>
				{/* SVG oculto con la definición del filtro de daltonismo rojo-verde.
				    Usamos feColorMatrix con la matriz de Vienot (1999) para deuteranopia.
				    Al estar en el DOM, puede ser referenciado por filter:url('#id') en CSS
				    desde cualquier elemento del documento. */}
				<svg
					aria-hidden="true"
					focusable="false"
					style={{
						position: 'absolute',
						width: 0,
						height: 0,
						overflow: 'hidden',
					}}
				>
					<defs>
						<filter
							id="asclepio-colorblind-filter"
							colorInterpolationFilters="linearRGB"
						>
							{/* Matriz deuteranopia (Vienot 1999): redistribuye canales R/G/B
							    para que los colores confundibles por daltonismo R-G sean
							    perceptualmente más distintos. */}
							<feColorMatrix
								type="matrix"
								values="0.625 0.375 0     0 0
								        0.700 0.300 0     0 0
								        0.000 0.300 0.700 0 0
								        0     0     0     1 0"
							/>
						</filter>
					</defs>
				</svg>

				{/* filter-scope: los filtros CSS de accesibilidad (grayscale, colorblind)
				    se aplican a este div en lugar de a body. De esta forma los elementos
				    con position:fixed que viven FUERA de este div (portal-root,
				    VoiceGuideButton) mantienen su referencia de posicionamiento al
				    viewport, no al contenedor filtrado. */}
				<div id="filter-scope">{children}</div>

				{/* portal-root: punto de montaje externo al scope del filtro.
				    El sidebar FAB y otros elementos fixed usan createPortal aquí
				    para escapar del containing-block que crea filter: en su ancestro. */}
				<div id="portal-root" />

				<VoiceGuideButton locale={locale} />
				<Toaster />
				<Analytics />
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

function AuthHydrator() {
	useEffect(() => {
		useAuthStore.persist.rehydrate();
		readAndApplyUiPreferences();
	}, []);
	return null;
}

export default function App() {
	return (
		<AppQueryClientProvider>
			<AuthHydrator />
			<Outlet />
		</AppQueryClientProvider>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	const locale = currentLocale();
	let message: string = m.rootErrorOops({}, { locale });
	let details: string = m.rootErrorUnexpected({}, { locale });
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? '404' : m.rootErrorTitle({}, { locale });
		details =
			error.status === 404
				? m.rootErrorNotFound({}, { locale })
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="pt-16 p-4 container mx-auto">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full p-4 overflow-x-auto">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}

// Daniel Useche
