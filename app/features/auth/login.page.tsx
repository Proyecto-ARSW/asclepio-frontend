import { HeartIcon, MoonIcon, SunIcon } from '@heroicons/react/24/solid';
import { useForm } from '@tanstack/react-form';
import { useEffect, useState } from 'react';
import { Link, redirect, useNavigate } from 'react-router';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import {
	Button,
	buttonVariants,
} from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field/field.component';
import { Input } from '@/components/ui/input/input.component';
import { getAuthContent } from '@/features/auth/auth-content';
import { currentLocale, localePath } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import {
	applyUiPreferences,
	readUiPreferences,
	saveUiPreferences,
	type ThemeMode,
} from '@/features/preferences/ui-preferences';
import { apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';
import { type Hospital, type Usuario, useAuthStore } from '@/store/auth.store';
import type { Route } from './+types/login.page';

interface LoginResponse {
	preToken: string;
	usuario: Usuario;
	hospitales: Hospital[];
}

export async function clientLoader() {
	if (typeof window === 'undefined') return null;
	const locale = currentLocale(window.location.pathname);
	const raw = localStorage.getItem('asclepio-auth');
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			if (parsed.state?.accessToken) {
				return redirect(localePath('/dashboard', locale));
			}
		} catch {}
	}
	return null;
}

export function meta(_: Route.MetaArgs) {
	const locale = currentLocale();
	return [{ title: m.pageTitleLogin({}, { locale }) }];
}

export default function LoginPage() {
	const navigate = useNavigate();
	const setPreAuth = useAuthStore((s) => s.setPreAuth);
	const locale = currentLocale();
	const content = getAuthContent(locale);
	const [isDarkMode, setIsDarkMode] = useState(false);
	const nextLocale = locale === 'es' ? 'en' : 'es';

	useEffect(() => {
		if (typeof document === 'undefined') return;
		setIsDarkMode(document.documentElement.classList.contains('dark'));
	}, []);

	function handleThemeToggle() {
		if (typeof document === 'undefined') return;
		const currentlyDark = document.documentElement.classList.contains('dark');
		const nextTheme: ThemeMode = currentlyDark ? 'light' : 'dark';
		const currentPrefs = readUiPreferences();
		const nextPrefs = { ...currentPrefs, theme: nextTheme };
		applyUiPreferences(nextPrefs);
		saveUiPreferences(nextPrefs);
		setIsDarkMode(!currentlyDark);
	}

	const form = useForm({
		defaultValues: {
			email: '',
			password: '',
			submitError: '',
		},
		onSubmit: async ({ value }) => {
			form.setFieldValue('submitError', '');
			try {
				const data = await apiPost<LoginResponse>('/auth/login', {
					email: value.email,
					password: value.password,
				});
				setPreAuth(data.preToken, data.usuario, data.hospitales);
				navigate(localePath('/select-hospital', locale));
			} catch (err) {
				form.setFieldValue(
					'submitError',
					err instanceof Error
						? err.message
						: content.login.errors.invalidCredentials,
				);
			}
		},
	});

	return (
		<div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 sm:px-6 lg:px-8">
			<div className="absolute top-4 left-4 z-20 flex items-center gap-2 sm:top-6 sm:left-6">
				<Link
					to={localePath('/', locale)}
					className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3 py-1.5 shadow-sm backdrop-blur"
				>
					<img
						src="/favicon.png"
						alt={content.appName}
						className="h-6 w-6 rounded-full border border-border/70 bg-card object-contain"
					/>
					<span className="text-sm font-semibold text-foreground">
						Asclepio
					</span>
				</Link>
				<button
					type="button"
					onClick={handleThemeToggle}
					className={cn(
						buttonVariants({ variant: 'outline', size: 'icon-sm' }),
						'rounded-full bg-card/90 backdrop-blur',
					)}
					aria-label={m.homeLandingThemeToggle({}, { locale })}
				>
					{isDarkMode ? (
						<SunIcon className="h-4 w-4" />
					) : (
						<MoonIcon className="h-4 w-4" />
					)}
				</button>
				<Link
					to={localePath('/login', nextLocale)}
					className={cn(
						buttonVariants({ variant: 'outline', size: 'sm' }),
						'rounded-full bg-card/90 px-3 text-xs font-semibold backdrop-blur',
					)}
				>
					EN/ES
				</Link>
			</div>

			<img
				src="/images/login-background.svg"
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 h-full w-full object-cover object-left"
			/>
			<div className="pointer-events-none absolute inset-0 bg-background/35" />
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.16),transparent_50%)]" />

			<div className="relative z-10 flex min-h-[calc(100vh-4rem)] w-full items-center justify-end pr-2 sm:pr-6 lg:pr-14 xl:pr-44">
				<Card className="ml-auto w-full max-w-xl border-border/70 bg-card/95 shadow-lg backdrop-blur">
					<CardHeader className="gap-2 justify-items-center text-center">
						<div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
							<HeartIcon className="h-6 w-6" aria-hidden="true" />
						</div>
						<CardTitle className="w-full text-center">
							{content.appName}
						</CardTitle>
						<CardDescription className="w-full text-center">
							{content.appSubtitle}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								void form.handleSubmit();
							}}
							className="space-y-5"
						>
							<form.Field
								name="email"
								validators={{
									onBlur: ({ value }) =>
										value.includes('@')
											? undefined
											: content.login.errors.requiredEmail,
								}}
							>
								{(field) => (
									<Field data-invalid={Boolean(field.state.meta.errors.length)}>
										<FieldLabel htmlFor={field.name}>
											{content.login.emailLabel}
										</FieldLabel>
										<Input
											id={field.name}
											type="email"
											autoComplete="email"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder={content.login.emailPlaceholder}
											required
										/>
										<FieldError
											errors={field.state.meta.errors.map((message) => ({
												message,
											}))}
										/>
									</Field>
								)}
							</form.Field>

							<form.Field
								name="password"
								validators={{
									onBlur: ({ value }) =>
										value.length > 0
											? undefined
											: content.login.errors.requiredPassword,
								}}
							>
								{(field) => (
									<Field data-invalid={Boolean(field.state.meta.errors.length)}>
										<FieldLabel htmlFor={field.name}>
											{content.login.passwordLabel}
										</FieldLabel>
										<Input
											id={field.name}
											type="password"
											autoComplete="current-password"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder={content.login.passwordPlaceholder}
											required
										/>
										<FieldError
											errors={field.state.meta.errors.map((message) => ({
												message,
											}))}
										/>
									</Field>
								)}
							</form.Field>

							<form.Field name="submitError">
								{(field) =>
									field.state.value ? (
										<Alert variant="destructive">
											<AlertDescription>{field.state.value}</AlertDescription>
										</Alert>
									) : null
								}
							</form.Field>

							<form.Subscribe
								selector={(state) => [state.canSubmit, state.isSubmitting]}
							>
								{([canSubmit, isSubmitting]) => (
									<Button
										type="submit"
										className="w-full"
										disabled={!canSubmit || isSubmitting}
									>
										{isSubmitting
											? content.login.submitLoading
											: content.login.submit}
									</Button>
								)}
							</form.Subscribe>
						</form>

						<FieldDescription className="text-center">
							{content.login.registerPrompt}{' '}
							<Link
								to={localePath('/register', locale)}
								className="text-primary underline-offset-4 hover:underline"
							>
								{content.login.registerAction}
							</Link>
						</FieldDescription>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
