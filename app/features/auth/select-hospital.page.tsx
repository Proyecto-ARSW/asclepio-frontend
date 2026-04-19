import {
	ArrowRightIcon,
	BuildingOffice2Icon,
	CheckCircleIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ExclamationTriangleIcon,
	MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useForm } from '@tanstack/react-form';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input/input.component';
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
			if (!hydrated) return;

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
					useAuthStore.getState().preToken ??
					readPreTokenFromStorage() ??
					undefined;
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

	// ── Búsqueda y paginación ──
	// Filtrado client-side: la lista de hospitales viene del preToken (ya está
	// en memoria) así que no hay request extra. La paginación evita listas
	// largas que bloqueen el scroll y mejoran la legibilidad.
	const ITEMS_PER_PAGE = 5;
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState(0);

	const filteredHospitals = useMemo(() => {
		if (!searchQuery.trim()) return hospitals;
		const q = searchQuery.toLowerCase();
		return hospitals.filter(
			(h) =>
				h.nombre.toLowerCase().includes(q) ||
				h.ciudad.toLowerCase().includes(q) ||
				h.departamento.toLowerCase().includes(q),
		);
	}, [hospitals, searchQuery]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredHospitals.length / ITEMS_PER_PAGE),
	);
	const paginatedHospitals = filteredHospitals.slice(
		currentPage * ITEMS_PER_PAGE,
		(currentPage + 1) * ITEMS_PER_PAGE,
	);

	// Resetear página al buscar para que el usuario no quede en una página vacía
	// biome-ignore lint/correctness/useExhaustiveDependencies: searchQuery change must reset page
	useEffect(() => {
		setCurrentPage(0);
	}, [searchQuery]);

	const isAdmin = user?.rol === 'ADMIN';
	const hasNoHospitals = hospitals.length === 0;

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
			<img
				src="/images/register-background.svg"
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-45 saturate-125"
			/>
			<div className="pointer-events-none absolute inset-0 bg-background/72" />
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_50%)]" />

			{/* Card principal desliza desde abajo al montar */}
			<motion.div
				className="relative z-10 w-full max-w-xl"
				initial={{ opacity: 0, y: 28 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: 'easeOut' }}
			>
				<Card>
					<CardHeader className="space-y-2">
						<motion.div
							className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
							initial={{ scale: 0.5, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ duration: 0.4, ease: 'backOut', delay: 0.2 }}
						>
							<BuildingOffice2Icon className="h-6 w-6" />
						</motion.div>
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

								{/* Barra de búsqueda — filtra por nombre, ciudad o departamento */}
								{hospitals.length > ITEMS_PER_PAGE && (
									<div className="relative">
										<MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											type="search"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											placeholder={
												locale === 'es'
													? 'Buscar hospital por nombre...'
													: 'Search hospital by name...'
											}
											className="pl-9"
											aria-label={
												locale === 'es' ? 'Buscar hospital' : 'Search hospital'
											}
										/>
									</div>
								)}

								<form.Field name="hospitalId">
									{(field) => (
										<div role="listbox" aria-label={m.a11ySelectHospitalListRegion({}, { locale })} className="space-y-2">
											{/* AnimatePresence con mode="wait" para transición
											    suave entre páginas de resultados */}
											<AnimatePresence mode="wait">
												<motion.div
													key={`page-${currentPage}-${searchQuery}`}
													initial={{ opacity: 0, y: 8 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: -8 }}
													transition={{ duration: 0.2 }}
													className="space-y-2"
												>
													{paginatedHospitals.length === 0 ? (
														<p className="py-4 text-center text-sm text-muted-foreground">
															{locale === 'es'
																? 'No se encontraron hospitales'
																: 'No hospitals found'}
														</p>
													) : (
														paginatedHospitals.map((hospital, index) => {
															const selected =
																field.state.value === hospital.id;
															return (
																<motion.button
																	key={hospital.id}
																	type="button"
																	aria-label={m.a11ySelectHospitalItem({ name: hospital.nombre }, { locale })}
																	role="option"
																	aria-selected={selected}
																	onClick={() =>
																		field.handleChange(hospital.id)
																	}
																	initial={{ opacity: 0, x: -12 }}
																	animate={{ opacity: 1, x: 0 }}
																	transition={{
																		duration: 0.3,
																		ease: 'easeOut',
																		delay: index * 0.06,
																	}}
																	whileHover={{ x: 3 }}
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
																	<AnimatePresence>
																		{selected && (
																			<motion.span
																				key="check"
																				initial={{ scale: 0, opacity: 0 }}
																				animate={{ scale: 1, opacity: 1 }}
																				exit={{ scale: 0, opacity: 0 }}
																				transition={{
																					duration: 0.2,
																					ease: 'backOut',
																				}}
																			>
																				<CheckCircleIcon className="h-5 w-5 shrink-0 text-primary" />
																			</motion.span>
																		)}
																	</AnimatePresence>
																</motion.button>
															);
														})
													)}
												</motion.div>
											</AnimatePresence>

											{/* Controles de paginación — solo si hay más de una página */}
											{totalPages > 1 && (
												<div className="flex items-center justify-between pt-1">
													<Button
														type="button"
														variant="ghost"
														size="sm"
														disabled={currentPage === 0}
														onClick={() => setCurrentPage((p) => p - 1)}
														className="gap-1"
													>
														<ChevronLeftIcon className="h-4 w-4" />
														{locale === 'es' ? 'Anterior' : 'Previous'}
													</Button>
													<span className="text-xs tabular-nums text-muted-foreground">
														{currentPage + 1} / {totalPages}
													</span>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														disabled={currentPage >= totalPages - 1}
														onClick={() => setCurrentPage((p) => p + 1)}
														className="gap-1"
													>
														{locale === 'es' ? 'Siguiente' : 'Next'}
														<ChevronRightIcon className="h-4 w-4" />
													</Button>
												</div>
											)}
										</div>
									)}
								</form.Field>

								<form.Field name="submitError">
									{(field) => (
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
											aria-label={m.a11ySelectHospitalSubmitDesc({}, { locale })}
											disabled={Boolean(
												!hydrated || !selectedHospitalId || isSubmitting,
											)}
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
			</motion.div>
		</div>
	);
}

// Daniel Useche
