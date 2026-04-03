import {
	BuildingOffice2Icon,
	CheckCircleIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	EnvelopeIcon,
	HeartIcon,
	IdentificationIcon,
	LockClosedIcon,
	MoonIcon,
	PhoneIcon,
	SunIcon,
	UserIcon,
} from '@heroicons/react/24/outline';
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
	FieldLabel,
} from '@/components/ui/field/field.component';
import { Input } from '@/components/ui/input/input.component';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select/select.component';
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import { getAuthContent } from '@/features/auth/auth-content';
import { currentLocale, localePath } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import {
	applyUiPreferences,
	readUiPreferences,
	saveUiPreferences,
	type ThemeMode,
} from '@/features/preferences/ui-preferences';
import { apiGet, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';
import { type Hospital, type Usuario, useAuthStore } from '@/store/auth.store';
import type { Route } from './+types/register.page';

type Rol = 'PACIENTE' | 'MEDICO' | 'ENFERMERO' | 'RECEPCIONISTA' | 'ADMIN';

interface RegisterPayload {
	nombre: string;
	apellido: string;
	email: string;
	password: string;
	telefono?: string;
	rol: Rol;
	hospitalId?: number;
	medicoData?: {
		especialidadId: number;
		numeroRegistro: string;
		consultorio?: string;
	};
	pacienteData?: {
		tipoDocumento?: string;
		numeroDocumento?: string;
		tipoSangre?: string;
		eps?: string;
		alergias?: string;
	};
	enfermeroData?: {
		numeroRegistro: string;
		nivelFormacion: number;
		areaEspecializacion?: number;
		certificacionTriage?: boolean;
	};
}

interface RegisterResponse {
	accessToken: string;
	usuario: Usuario;
	hospital?: Hospital;
}

interface RegisterFormValues {
	nombre: string;
	apellido: string;
	email: string;
	password: string;
	telefono: string;
	rol: Rol;
	hospitalId: number | null;
	medicoEspecialidadId: number | null;
	medicoNumeroRegistro: string;
	medicoConsultorio: string;
	enfermeroNumeroRegistro: string;
	enfermeroNivelFormacion: number;
	enfermeroAreaEspecializacion: number | null;
	enfermeroCertificacionTriage: boolean;
	pacienteTipoDocumento: string;
	pacienteNumeroDocumento: string;
	pacienteTipoSangre: string;
	pacienteEps: string;
	pacienteAlergias: string;
	submitError: string;
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
	return [{ title: m.pageTitleRegister({}, { locale }) }];
}

function StepIndicator({
	step,
	index,
	label,
}: {
	step: 1 | 2 | 3;
	index: 1 | 2 | 3;
	label: string;
}) {
	const active = step >= index;
	const completed = step > index;

	return (
		<div className="flex items-center gap-2">
			{/* motion.div: el círculo hace spring al activarse — feedback visual instantáneo */}
			<motion.div
				animate={{
					scale: active ? 1 : 0.9,
					backgroundColor: active ? 'var(--color-primary)' : 'var(--color-muted)',
				}}
				transition={{ duration: 0.25, ease: 'easeOut' }}
				className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
				style={{ color: active ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)' }}
			>
				{completed ? <CheckCircleIcon className="h-4 w-4" /> : index}
			</motion.div>
			<span
				className={
					active ? 'text-foreground text-xs' : 'text-muted-foreground text-xs'
				}
			>
				{label}
			</span>
		</div>
	);
}

function isValidEmail(email: string): boolean {
	return email.includes('@') && email.includes('.');
}

// Variantes para animar el contenido al cambiar de step
// 'easeOut' / 'easeIn' as const: TypeScript infiere string sin ello, pero motion exige el tipo literal Easing
const stepVariants = {
	enter: (direction: number) => ({
		x: direction > 0 ? 40 : -40,
		opacity: 0,
	}),
	center: {
		x: 0,
		opacity: 1,
		transition: { duration: 0.3, ease: 'easeOut' as const },
	},
	exit: (direction: number) => ({
		x: direction > 0 ? -40 : 40,
		opacity: 0,
		transition: { duration: 0.2, ease: 'easeIn' as const },
	}),
};

export default function RegisterPage() {
	const navigate = useNavigate();
	const locale = currentLocale();
	const content = getAuthContent(locale);
	const setFullAuth = useAuthStore((s) => s.setFullAuth);

	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [direction, setDirection] = useState(1); // 1 = avanzar, -1 = retroceder
	const [hospitals, setHospitals] = useState<Hospital[]>([]);
	const [loadingHospitals, setLoadingHospitals] = useState(false);
	const [hasAttemptedHospitalsLoad, setHasAttemptedHospitalsLoad] =
		useState(false);
	const [isDarkMode, setIsDarkMode] = useState(false);
	const localeCycle = ['es', 'en', 'pt', 'fr'] as const;
	const nextLocale = localeCycle[(localeCycle.indexOf(locale) + 1) % localeCycle.length];

	const form = useForm({
		defaultValues: {
			nombre: '',
			apellido: '',
			email: '',
			password: '',
			telefono: '',
			rol: 'PACIENTE' as Rol,
			hospitalId: null,
			medicoEspecialidadId: null,
			medicoNumeroRegistro: '',
			medicoConsultorio: '',
			enfermeroNumeroRegistro: '',
			enfermeroNivelFormacion: 1,
			enfermeroAreaEspecializacion: null,
			enfermeroCertificacionTriage: false,
			pacienteTipoDocumento: content.register.documentTypes[0] ?? 'CC',
			pacienteNumeroDocumento: '',
			pacienteTipoSangre: '',
			pacienteEps: '',
			pacienteAlergias: '',
			submitError: '',
		} as RegisterFormValues,
		onSubmit: async ({ value }) => {
			form.setFieldValue('submitError', '');
			try {
				const payload: RegisterPayload = {
					nombre: value.nombre.trim(),
					apellido: value.apellido.trim(),
					email: value.email.trim(),
					password: value.password,
					rol: 'PACIENTE',
				};

				if (value.telefono.trim()) {
					payload.telefono = value.telefono.trim();
				}

				if (value.hospitalId) {
					payload.hospitalId = value.hospitalId;
				}

				const patientData = {
					tipoDocumento: value.pacienteTipoDocumento,
					numeroDocumento: value.pacienteNumeroDocumento.trim(),
					tipoSangre: value.pacienteTipoSangre,
					eps: value.pacienteEps.trim(),
					alergias: value.pacienteAlergias.trim(),
				};
				const hasPatientData = Object.values(patientData).some(Boolean);
				if (hasPatientData) {
					payload.pacienteData = patientData;
				}

				const response = await apiPost<RegisterResponse>(
					'/auth/register',
					payload,
				);
				const hospitalForStore: Hospital = response.hospital ?? {
					id: 0,
					nombre: content.register.defaultHospitalName,
					ciudad: '',
					departamento: '',
				};
				setFullAuth(response.accessToken, response.usuario, hospitalForStore);
				navigate(localePath('/dashboard', locale));
			} catch (error) {
				form.setFieldValue(
					'submitError',
					error instanceof Error
						? error.message
						: content.register.errors.submit,
				);
			}
		},
	});

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

	useEffect(() => {
		if (step !== 2) {
			setHasAttemptedHospitalsLoad(false);
		}
	}, [step]);

	useEffect(() => {
		if (
			step !== 2 ||
			hospitals.length > 0 ||
			loadingHospitals ||
			hasAttemptedHospitalsLoad
		) {
			return;
		}

		setHasAttemptedHospitalsLoad(true);
		setLoadingHospitals(true);
		void apiGet<Hospital[]>('/hospitals')
			.then((result) => setHospitals(result))
			.catch(() => {
				form.setFieldValue(
					'submitError',
					content.register.errors.loadHospitals,
				);
			})
			.finally(() => setLoadingHospitals(false));
	}, [
		content.register.errors.loadHospitals,
		form,
		hasAttemptedHospitalsLoad,
		hospitals.length,
		loadingHospitals,
		step,
	]);

	function validateStep1(nextValues: RegisterFormValues): string | null {
		if (!nextValues.nombre.trim()) return content.register.errors.requiredName;
		if (!nextValues.apellido.trim())
			return content.register.errors.requiredLastName;
		if (!isValidEmail(nextValues.email.trim()))
			return content.register.errors.requiredEmail;
		if (nextValues.password.length < 6)
			return content.register.errors.requiredPassword;
		return null;
	}

	function validateStep2(nextValues: RegisterFormValues): string | null {
		if (!nextValues.hospitalId) {
			return content.register.errors.requiredHospital;
		}
		return null;
	}

	function handleNext() {
		form.setFieldValue('submitError', '');
		const nextValues = form.state.values as RegisterFormValues;
		const nextError =
			step === 1 ? validateStep1(nextValues) : validateStep2(nextValues);
		if (nextError) {
			form.setFieldValue('submitError', nextError);
			return;
		}
		setDirection(1);
		setStep((current) => (current === 1 ? 2 : 3));
	}

	function handleBack() {
		form.setFieldValue('submitError', '');
		setDirection(-1);
		setStep((current) => (current === 3 ? 2 : 1));
	}

	return (
		<div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 sm:px-6 lg:px-8">
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
				<Link
					to={localePath('/register', nextLocale)}
					className={cn(
						buttonVariants({ variant: 'outline', size: 'sm' }),
						'rounded-full bg-card/90 px-3 text-xs font-semibold backdrop-blur',
					)}
				>
					{locale.toUpperCase()}
				</Link>
			</motion.div>

			<img
				src="/images/register-background.svg"
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
			/>
			<div className="pointer-events-none absolute inset-0 bg-background/60" />
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_65%_20%,hsl(var(--primary)/0.12),transparent_45%)]" />

			<div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center justify-center">
				<motion.div
					className="w-full max-w-3xl"
					initial={{ opacity: 0, y: 28 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
				>
					<Card className="border-border/70 bg-card/95 shadow-lg backdrop-blur">
						<CardHeader className="space-y-3 border-b px-5 py-5 text-center sm:px-6">
							<motion.div
								className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
								initial={{ scale: 0.5, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								transition={{ duration: 0.4, ease: 'backOut', delay: 0.25 }}
							>
								<HeartIcon className="h-6 w-6" />
							</motion.div>
							<CardTitle>{content.register.title}</CardTitle>
							<CardDescription>{content.register.subtitle}</CardDescription>
							<div className="flex flex-wrap items-center justify-center gap-3 pt-1">
								<StepIndicator
									step={step}
									index={1}
									label={content.register.stepTitles[0]}
								/>
								<div className="h-px w-8 bg-border" />
								<StepIndicator
									step={step}
									index={2}
									label={content.register.stepTitles[1]}
								/>
								<div className="h-px w-8 bg-border" />
								<StepIndicator
									step={step}
									index={3}
									label={content.register.stepTitles[2]}
								/>
							</div>
						</CardHeader>
						<CardContent className="space-y-5 px-5 pt-4 pb-5 sm:px-6">
							<form
								onSubmit={(event) => {
									event.preventDefault();
									if (step < 3) {
										handleNext();
										return;
									}
									void form.handleSubmit();
								}}
								className="mx-auto w-full max-w-2xl space-y-5"
							>
								{/* AnimatePresence + motion.div: transición deslizante entre pasos */}
								<AnimatePresence mode="wait" custom={direction}>
									<motion.div
										key={step}
										custom={direction}
										variants={stepVariants}
										initial="enter"
										animate="center"
										exit="exit"
									>
										{step === 1 && (
											<div className="space-y-4">
												<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
													<form.Field name="nombre">
														{(field) => (
															<Field>
																<FieldLabel htmlFor={field.name}>
																	{content.register.labels.nombre}
																</FieldLabel>
																<div className="relative">
																	<UserIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
																	<Input
																		id={field.name}
																		type="text"
																		autoComplete="given-name"
																		value={field.state.value}
																		onBlur={field.handleBlur}
																		onChange={(event) =>
																			field.handleChange(event.target.value)
																		}
																		placeholder={content.register.placeholders.nombre}
																		className="pl-9"
																		required
																	/>
																</div>
															</Field>
														)}
													</form.Field>
													<form.Field name="apellido">
														{(field) => (
															<Field>
																<FieldLabel htmlFor={field.name}>
																	{content.register.labels.apellido}
																</FieldLabel>
																<div className="relative">
																	<UserIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
																	<Input
																		id={field.name}
																		type="text"
																		autoComplete="family-name"
																		value={field.state.value}
																		onBlur={field.handleBlur}
																		onChange={(event) =>
																			field.handleChange(event.target.value)
																		}
																		placeholder={
																			content.register.placeholders.apellido
																		}
																		className="pl-9"
																		required
																	/>
																</div>
															</Field>
														)}
													</form.Field>
												</div>

												<form.Field name="email">
													{(field) => (
														<Field>
															<FieldLabel htmlFor={field.name}>
																{content.register.labels.email}
															</FieldLabel>
															<div className="relative">
																<EnvelopeIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
																<Input
																	id={field.name}
																	type="email"
																	autoComplete="email"
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(event) =>
																		field.handleChange(event.target.value)
																	}
																	placeholder={content.register.placeholders.email}
																	className="pl-9"
																	required
																/>
															</div>
														</Field>
													)}
												</form.Field>

												<form.Field name="password">
													{(field) => (
														<Field>
															<FieldLabel htmlFor={field.name}>
																{content.register.labels.password}
															</FieldLabel>
															<div className="relative">
																<LockClosedIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
																<Input
																	id={field.name}
																	type="password"
																	autoComplete="new-password"
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(event) =>
																		field.handleChange(event.target.value)
																	}
																	placeholder={content.register.placeholders.password}
																	className="pl-9"
																	required
																/>
															</div>
															<FieldDescription>
																{content.register.errors.requiredPassword}
															</FieldDescription>
														</Field>
													)}
												</form.Field>

												<form.Field name="telefono">
													{(field) => (
														<Field>
															<FieldLabel htmlFor={field.name}>
																{content.register.labels.telefono}
															</FieldLabel>
															<div className="relative">
																<PhoneIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
																<Input
																	id={field.name}
																	type="tel"
																	autoComplete="tel"
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(event) =>
																		field.handleChange(event.target.value)
																	}
																	placeholder={content.register.placeholders.telefono}
																	className="pl-9"
																/>
															</div>
														</Field>
													)}
												</form.Field>
											</div>
										)}

										{step === 2 && (
											<div className="space-y-5">
												<div className="space-y-2">
													<p className="text-sm font-medium text-foreground">
														{content.register.labels.rol}
													</p>
													{loadingHospitals ? (
														<div className="space-y-2">
															{[1, 2, 3].map((item) => (
																<Skeleton key={item} className="h-14 rounded-xl" />
															))}
														</div>
													) : (
														<form.Field name="hospitalId">
															{(field) => (
																<div className="max-h-60 space-y-2 overflow-y-auto pr-1">
																	{hospitals.map((hospital, index) => {
																		const selected =
																			field.state.value === hospital.id;
																		return (
																			<motion.button
																				key={hospital.id}
																				type="button"
																				onClick={() =>
																					field.handleChange(hospital.id)
																				}
																				initial={{ opacity: 0, x: -10 }}
																				animate={{ opacity: 1, x: 0 }}
																				transition={{
																					duration: 0.28,
																					ease: 'easeOut',
																					delay: index * 0.05,
																				}}
																				whileHover={{ x: 3 }}
																				className={[
																					'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
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
																							transition={{ duration: 0.18, ease: 'backOut' }}
																						>
																							<CheckCircleIcon className="h-4 w-4 shrink-0 text-primary" />
																						</motion.span>
																					)}
																				</AnimatePresence>
																			</motion.button>
																		);
																	})}
																	{hospitals.length === 0 && (
																		<p className="py-4 text-center text-sm text-muted-foreground">
																			{content.register.emptyHospitals}
																		</p>
																	)}
																</div>
															)}
														</form.Field>
													)}
												</div>
											</div>
										)}

										{step === 3 && (
											<div className="space-y-4">
												<FieldDescription>
													{content.register.sections.optionalInfo}
												</FieldDescription>

												<div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
													<IdentificationIcon className="h-4 w-4 text-primary" />
													{content.register.sections.patient}
												</div>
												<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
													<form.Field name="pacienteTipoDocumento">
														{(field) => (
															<Field>
																<FieldLabel>
																	{content.register.labels.tipoDocumento}
																</FieldLabel>
																<Select
																	value={field.state.value}
																	onValueChange={(value) =>
																		field.handleChange(value ?? '')
																	}
																>
																	<SelectTrigger className="w-full">
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		{content.register.documentTypes.map(
																			(documentType) => (
																				<SelectItem
																					key={documentType}
																					value={documentType}
																				>
																					{documentType}
																				</SelectItem>
																			),
																		)}
																	</SelectContent>
																</Select>
															</Field>
														)}
													</form.Field>
													<form.Field name="pacienteNumeroDocumento">
														{(field) => (
															<Field>
																<FieldLabel htmlFor={field.name}>
																	{content.register.labels.numeroDocumento}
																</FieldLabel>
																<Input
																	id={field.name}
																	type="text"
																	value={field.state.value}
																	onChange={(event) =>
																		field.handleChange(event.target.value)
																	}
																	placeholder={
																		content.register.placeholders.numeroDocumento
																	}
																/>
															</Field>
														)}
													</form.Field>
												</div>
												<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
													<form.Field name="pacienteTipoSangre">
														{(field) => (
															<Field>
																<FieldLabel>
																	{content.register.labels.tipoSangre}
																</FieldLabel>
																<Select
																	value={field.state.value || '__none__'}
																	onValueChange={(value) =>
																		field.handleChange(
																			!value || value === '__none__' ? '' : value,
																		)
																	}
																>
																	<SelectTrigger className="w-full">
																		<SelectValue
																			placeholder={
																				content.register.placeholders
																					.tipoSangreDefault
																			}
																		/>
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="__none__">
																			{
																				content.register.placeholders
																					.tipoSangreDefault
																			}
																		</SelectItem>
																		{content.register.bloodTypes.map((bloodType) => (
																			<SelectItem key={bloodType} value={bloodType}>
																				{bloodType}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															</Field>
														)}
													</form.Field>
													<form.Field name="pacienteEps">
														{(field) => (
															<Field>
																<FieldLabel htmlFor={field.name}>
																	{content.register.labels.eps}
																</FieldLabel>
																<Input
																	id={field.name}
																	type="text"
																	value={field.state.value}
																	onChange={(event) =>
																		field.handleChange(event.target.value)
																	}
																	placeholder={content.register.placeholders.eps}
																/>
															</Field>
														)}
													</form.Field>
												</div>
												<form.Field name="pacienteAlergias">
													{(field) => (
														<Field>
															<FieldLabel htmlFor={field.name}>
																{content.register.labels.alergias}
															</FieldLabel>
															<Input
																id={field.name}
																type="text"
																value={field.state.value}
																onChange={(event) =>
																	field.handleChange(event.target.value)
																}
																placeholder={content.register.placeholders.alergias}
															/>
														</Field>
													)}
												</form.Field>
											</div>
										)}
									</motion.div>
								</AnimatePresence>

								<AnimatePresence>
									<form.Field name="submitError">
										{(field) =>
											field.state.value ? (
												<motion.div
													key="error"
													initial={{ opacity: 0, height: 0 }}
													animate={{ opacity: 1, height: 'auto' }}
													exit={{ opacity: 0, height: 0 }}
													transition={{ duration: 0.2 }}
												>
													<Alert variant="destructive">
														<AlertDescription>{field.state.value}</AlertDescription>
													</Alert>
												</motion.div>
											) : null
										}
									</form.Field>
								</AnimatePresence>

								<form.Subscribe selector={(state) => state.isSubmitting}>
									{(isSubmitting) => (
										<div className="flex items-center gap-3 pt-1">
											{step > 1 && (
												<Button
													type="button"
													variant="outline"
													onClick={handleBack}
												>
													<ChevronLeftIcon className="h-4 w-4" />
													{content.register.navigation.back}
												</Button>
											)}
											<Button
												type="submit"
												className="flex-1"
												disabled={isSubmitting}
											>
												{step < 3
													? content.register.navigation.next
													: isSubmitting
														? content.register.navigation.submitLoading
														: content.register.navigation.submit}
												{step < 3 && <ChevronRightIcon className="h-4 w-4" />}
											</Button>
										</div>
									)}
								</form.Subscribe>
							</form>

							<FieldDescription className="text-center">
								{content.register.footer.alreadyAccount}{' '}
								<Link
									to={localePath('/login', locale)}
									className="text-primary underline-offset-4 hover:underline"
								>
									{content.register.footer.loginAction}
								</Link>
							</FieldDescription>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}

// Daniel Useche
