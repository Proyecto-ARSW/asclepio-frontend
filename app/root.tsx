import {
	isRouteErrorResponse,
	Links,
	Meta,
	type MiddlewareFunction,
	Outlet,
	Scripts,
	ScrollRestoration,
} from 'react-router';
import type { Route } from './+types/root';
import '@/app.css';
import { Analytics } from '@vercel/analytics/react';
import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner/sonner.component';
import { currentLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { paraglideMiddleware } from '@/features/i18n/paraglide/server';
import { readAndApplyUiPreferences } from '@/features/preferences/ui-preferences';
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
	const locale = currentLocale();

	return (
		<html lang={locale}>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" type="image/png" href="/favicon.png" />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
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
