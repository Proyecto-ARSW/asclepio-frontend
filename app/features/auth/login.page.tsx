import { HeartIcon, MoonIcon, SunIcon } from '@heroicons/react/24/solid';
import { useForm } from '@tanstack/react-form';
import { AnimatePresence, motion } from 'motion/react';
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
import { LanguageSwitcher } from '@/features/i18n/language-switcher';
import { currentLocale, localePath } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import {
	applyUiPreferences,
	readUiPreferences,
	saveUiPreferences,
	type ThemeMode,
} from '@/features/preferences/ui-preferences';
import { ApiError, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';
import { type Hospital, type Usuario, useAuthStore } from '@/store/auth.store';
import type { Route } from './+types/login.page';

interface LoginResponse {
	preToken: string;
	usuario: Usuario;
	hospitales: Hospital[];
}

interface LoginErrorMessages {
	invalidCredentials: string;
	forbidden: string;
	tooManyAttempts: string;
	invalidRequest: string;
	serverUnavailable: string;
	unknown: string;
}

function isMissingAccountMessage(message: string): boolean {
	return (
		message.includes('not found') ||
		message.includes('user not found') ||
		message.includes('correo no registrado') ||
		message.includes('no existe')
	);
}

function resolveLoginSubmitError(
	error: unknown,
	messages: LoginErrorMessages,
): string {
	if (error instanceof ApiError) {
		if (error.status === 401 || error.status === 404) {
			return messages.invalidCredentials;
		}

		if (error.status === 403) {
			return messages.forbidden;
		}

		if (error.status === 429) {
			return messages.tooManyAttempts;
		}

		if (error.status === 400 || error.status === 422) {
			return messages.invalidRequest;
		}

		if (error.status >= 500) {
			return messages.serverUnavailable;
		}

		const apiMessage = error.message.trim();
		if (!apiMessage) return messages.unknown;

		const normalizedApiMessage = apiMessage.toLowerCase();
		if (isMissingAccountMessage(normalizedApiMessage)) {
			return messages.invalidCredentials;
		}

		return apiMessage;
	}

	if (error instanceof Error) {
		const message = error.message.trim();
		if (!message) return messages.unknown;

		const normalized = message.toLowerCase();
		const looksLikeTooManyAttempts =
			normalized.includes('too many') ||
			normalized.includes('demasiados intentos') ||
			normalized.includes('muitos intentos') ||
			normalized.includes('rate limit');

		if (isMissingAccountMessage(normalized)) {
			return messages.invalidCredentials;
		}

		if (looksLikeTooManyAttempts) {
			return messages.tooManyAttempts;
		}

		return message;
	}

	return messages.unknown;
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
					resolveLoginSubmitError(err, content.login.errors),
				);
			}
		},
	});

	// Variantes para escalonar los campos del formulario al montar
	// 'easeOut' as const es necesario: TypeScript infiere string en lugar del tipo literal Easing
	const fieldVariants = {
		hidden: { opacity: 0, y: 12 },
		show: (i: number) => ({
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.35,
				ease: 'easeOut' as const,
				delay: 0.3 + i * 0.08,
			},
		}),
	};

	return (
		<main
			aria-label={m.a11yLandmarkAuth({}, { locale })}
			className="relative min-h-screen overflow-hidden bg-background px-4 py-8 sm:px-6 lg:px-8"
		>
			{/* Barra de navegación superior — entra desde arriba */}
			<motion.div
				className="absolute top-4 left-4 z-20 flex items-center gap-2 sm:top-6 sm:left-6"
				initial={{ opacity: 0, y: -12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, ease: 'easeOut' }}
			>
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
				<LanguageSwitcher
					locale={locale}
					triggerClassName="rounded-full bg-card/90 px-2.5 text-xs font-semibold backdrop-blur"
				/>
			</motion.div>

			<img
				src="/images/login-background.svg"
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 h-full w-full object-cover object-left"
			/>
			<div className="pointer-events-none absolute inset-0 bg-background/35" />
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.16),transparent_50%)]" />

			<div className="relative z-10 flex min-h-[calc(100vh-4rem)] w-full items-center justify-end pr-2 sm:pr-6 lg:pr-14 xl:pr-44">
				{/* Card: desliza desde abajo con fade al montar */}
				<motion.div
					className="ml-auto w-full max-w-xl"
					initial={{ opacity: 0, y: 28 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
				>
					<Card className="border-border/70 bg-card/95 shadow-lg backdrop-blur">
						<CardHeader className="gap-2 justify-items-center text-center">
							{/* Icono del corazón aparece con spring para dar vida */}
							<motion.div
								className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm"
								initial={{ scale: 0.5, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								transition={{ duration: 0.4, ease: 'backOut', delay: 0.25 }}
							>
								<HeartIcon className="h-6 w-6" aria-hidden="true" />
							</motion.div>
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
								{/* Campo email — entra con stagger personalizado */}
								<motion.div
									custom={0}
									variants={fieldVariants}
									initial="hidden"
									animate="show"
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
											<Field
												data-invalid={Boolean(field.state.meta.errors.length)}
											>
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
								</motion.div>

								{/* Campo password — entra 80ms después del email */}
								<motion.div
									custom={1}
									variants={fieldVariants}
									initial="hidden"
									animate="show"
								>
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
											<Field
												data-invalid={Boolean(field.state.meta.errors.length)}
											>
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
								</motion.div>

								<form.Field name="submitError">
									{(field) => (
										// AnimatePresence hace que el error entre/salga con fade
										<AnimatePresence>
											{field.state.value ? (
												<motion.div
													key="error"
													initial={{ opacity: 0, height: 0 }}
													animate={{ opacity: 1, height: 'auto' }}
													exit={{ opacity: 0, height: 0 }}
													transition={{ duration: 0.2 }}
												>
													<Alert variant="destructive">
														<AlertDescription>
															{field.state.value}
														</AlertDescription>
													</Alert>
												</motion.div>
											) : null}
										</AnimatePresence>
									)}
								</form.Field>

								<motion.div
									custom={2}
									variants={fieldVariants}
									initial="hidden"
									animate="show"
								>
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
								</motion.div>
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
				</motion.div>
			</div>
		</main>
	);
}

// Daniel Useche
