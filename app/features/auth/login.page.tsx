import { useForm } from '@tanstack/react-form';
import { HeartIcon } from '@heroicons/react/24/outline';
import { redirect, useNavigate, Link } from 'react-router';
import type { Route } from './+types/login.page';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Button } from '@/components/ui/button/button.component';
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
import { getAuthContent } from '@/features/auth/auth.content';
import { currentLocale, localePath } from '@/features/i18n/locale-path';
import { apiPost } from '@/lib/api';
import { useAuthStore, type Hospital, type Usuario } from '@/store/auth.store';

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
	return [{ title: 'Asclepio - Iniciar Sesión' }];
}

export default function LoginPage() {
	const navigate = useNavigate();
	const setPreAuth = useAuthStore((s) => s.setPreAuth);
	const locale = currentLocale();
	const content = getAuthContent(locale);

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
					err instanceof Error ? err.message : content.login.errors.invalidCredentials,
				);
			}
		},
	});

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_50%)]" />
			<Card className="relative z-10 w-full max-w-md">
				<CardHeader className="space-y-2">
					<div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<HeartIcon className="h-6 w-6" />
					</div>
					<CardTitle>{content.appName}</CardTitle>
					<CardDescription>{content.appSubtitle}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							void form.handleSubmit();
						}}
						className="space-y-4"
					>
						<form.Field
							name="email"
							validators={{
								onBlur: ({ value }) =>
									value.includes('@') ? undefined : content.login.errors.requiredEmail,
							}}
						>
							{(field) => (
								<Field data-invalid={Boolean(field.state.meta.errors.length)}>
									<FieldLabel htmlFor={field.name}>{content.login.emailLabel}</FieldLabel>
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
										errors={field.state.meta.errors.map((message) => ({ message }))}
									/>
								</Field>
							)}
						</form.Field>

						<form.Field
							name="password"
							validators={{
								onBlur: ({ value }) =>
									value.length > 0 ? undefined : content.login.errors.requiredPassword,
							}}
						>
							{(field) => (
								<Field data-invalid={Boolean(field.state.meta.errors.length)}>
									<FieldLabel htmlFor={field.name}>{content.login.passwordLabel}</FieldLabel>
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
										errors={field.state.meta.errors.map((message) => ({ message }))}
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
								<Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
									{isSubmitting ? content.login.submitLoading : content.login.submit}
								</Button>
							)}
						</form.Subscribe>
					</form>

					<FieldDescription className="text-center">
						{content.login.registerPrompt}{' '}
						<Link to={localePath('/register', locale)} className="text-primary underline-offset-4 hover:underline">
							{content.login.registerAction}
						</Link>
					</FieldDescription>
				</CardContent>
			</Card>
		</div>
	);
}
