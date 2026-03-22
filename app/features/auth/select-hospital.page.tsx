import {
	ArrowRightIcon,
	BuildingOffice2Icon,
	CheckCircleIcon,
	ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useForm } from '@tanstack/react-form';
import { useEffect, useState } from 'react';
import { redirect, useNavigate } from 'react-router';
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '@/components/ui/alert/alert.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import { getAuthContent } from '@/features/auth/auth-content';
import { currentLocale, localePath } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { apiPost } from '@/lib/api';
import { type Hospital, type Usuario, useAuthStore } from '@/store/auth.store';
import type { Route } from './+types/select-hospital.page';

interface SelectHospitalResponse {
	accessToken: string;
	usuario: Usuario;
	hospital: Hospital;
}

function readPreTokenFromStorage(): string | null {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem('asclepio-auth');
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		return parsed.state?.preToken ?? null;
	} catch {
		return null;
	}
}

export async function clientLoader() {
	if (typeof window === 'undefined') return null;
	const locale = currentLocale(window.location.pathname);
	const raw = localStorage.getItem('asclepio-auth');
	if (!raw) return redirect(localePath('/login', locale));
	try {
		const parsed = JSON.parse(raw);
		if (!parsed.state?.preToken) return redirect(localePath('/login', locale));
	} catch {
		return redirect(localePath('/login', locale));
	}
	return null;
}

export function meta(_: Route.MetaArgs) {
	const locale = currentLocale();
	return [{ title: m.pageTitleSelectHospital({}, { locale }) }];
}

export default function SelectHospitalPage() {
	const navigate = useNavigate();
	const { hospitals, user, setFullAuth } = useAuthStore();
	const locale = currentLocale();
	const content = getAuthContent(locale);

	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		const rehydrateResult = useAuthStore.persist.rehydrate();
		if (rehydrateResult instanceof Promise) {
			void rehydrateResult.finally(() => {
				setHydrated(true);
			});
			return;
		}
		setHydrated(true);
	}, []);

	const form = useForm({
		defaultValues: {
			hospitalId: null as number | null,
			submitError: '',
		},
		onSubmit: async ({ value }) => {
				if (!hydrated) {
					return;
				}

			if (!value.hospitalId) {
				form.setFieldValue(
					'submitError',
					content.selectHospital.errors.selectionRequired,
				);
				return;
			}

			form.setFieldValue('submitError', '');
			try {
					const token =
						useAuthStore.getState().preToken ?? readPreTokenFromStorage() ?? undefined;
					if (!token) {
						form.setFieldValue(
							'submitError',
							content.selectHospital.errors.connection,
						);
						return;
					}
				const data = await apiPost<SelectHospitalResponse>(
					'/auth/select-hospital',
					{ hospitalId: value.hospitalId },
					token,
				);
				setFullAuth(data.accessToken, data.usuario, data.hospital);
					navigate(localePath('/dashboard', locale), { replace: true });
			} catch (err) {
				form.setFieldValue(
					'submitError',
					err instanceof Error
						? err.message
						: content.selectHospital.errors.connection,
				);
			}
		},
	});

	const isAdmin = user?.rol === 'ADMIN';
	const hasNoHospitals = hospitals.length === 0;

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_50%)]" />
			<Card className="relative z-10 w-full max-w-xl">
				<CardHeader className="space-y-2">
					<div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<BuildingOffice2Icon className="h-6 w-6" />
					</div>
					<CardTitle>{content.selectHospital.title}</CardTitle>
					<CardDescription>
						{content.selectHospital.subtitle}
						{user ? ` · ${user.nombre} ${user.apellido}` : ''}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{!hydrated && (
						<div className="space-y-3" aria-hidden="true">
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="h-16 animate-pulse rounded-lg bg-muted"
								/>
							))}
						</div>
					)}

					{hydrated && hasNoHospitals && (
						<div className="space-y-4">
							<Alert>
								<ExclamationTriangleIcon className="h-4 w-4" />
								<AlertTitle>
									{isAdmin
										? content.selectHospital.emptyAdminTitle
										: content.selectHospital.emptyUserTitle}
								</AlertTitle>
								<AlertDescription>
									{isAdmin
										? content.selectHospital.emptyAdminHint
										: content.selectHospital.emptyUserHint}
								</AlertDescription>
							</Alert>
							<Button
								variant="outline"
								className="w-full"
								onClick={() => navigate(localePath('/login', locale))}
							>
								{content.selectHospital.backToLogin}
							</Button>
						</div>
					)}

					{hydrated && !hasNoHospitals && (
						<form
							onSubmit={(e) => {
								e.preventDefault();
								void form.handleSubmit();
							}}
							className="space-y-4"
						>
							<p className="text-sm text-muted-foreground">
								{content.selectHospital.listHint}
							</p>
							<form.Field name="hospitalId">
								{(field) => (
									<div className="max-h-72 space-y-2 overflow-y-auto pr-1">
										{hospitals.map((hospital) => {
											const selected = field.state.value === hospital.id;
											return (
												<button
													key={hospital.id}
													type="button"
													onClick={() => field.handleChange(hospital.id)}
													className={[
														'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
														selected
															? 'border-primary bg-primary/5'
															: 'border-border bg-card hover:bg-muted/40',
													].join(' ')}
												>
													<BuildingOffice2Icon className="h-5 w-5 shrink-0 text-primary" />
													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-medium text-foreground">
															{hospital.nombre}
														</p>
														<p className="text-xs text-muted-foreground">
															{hospital.ciudad}, {hospital.departamento}
														</p>
													</div>
													{selected && (
														<CheckCircleIcon className="h-5 w-5 shrink-0 text-primary" />
													)}
												</button>
											);
										})}
									</div>
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
								selector={(state) => [
									state.values.hospitalId,
									state.isSubmitting,
								]}
							>
								{([selectedHospitalId, isSubmitting]) => (
									<Button
										type="submit"
										className="w-full"
										disabled={Boolean(!hydrated || !selectedHospitalId || isSubmitting)}
									>
										{isSubmitting
											? content.selectHospital.submitLoading
											: content.selectHospital.submit}
										{!isSubmitting && <ArrowRightIcon className="h-4 w-4" />}
									</Button>
								)}
							</form.Subscribe>
						</form>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
