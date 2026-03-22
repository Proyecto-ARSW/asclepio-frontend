import {
	BeakerIcon,
	BuildingOffice2Icon,
	CheckCircleIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	EnvelopeIcon,
	HeartIcon,
	IdentificationIcon,
	LockClosedIcon,
	PhoneIcon,
	UserIcon,
} from '@heroicons/react/24/outline';
import { useForm } from '@tanstack/react-form';
import { useEffect, useState } from 'react';
import { Link, redirect, useNavigate } from 'react-router';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import { Checkbox } from '@/components/ui/checkbox/checkbox.component';
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
import { apiGet, apiPost } from '@/lib/api';
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
			<div
				className={[
					'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
					active
						? 'bg-primary text-primary-foreground'
						: 'bg-muted text-muted-foreground',
				].join(' ')}
			>
				{completed ? <CheckCircleIcon className="h-4 w-4" /> : index}
			</div>
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

export default function RegisterPage() {
	const navigate = useNavigate();
	const locale = currentLocale();
	const content = getAuthContent(locale);
	const setFullAuth = useAuthStore((s) => s.setFullAuth);

	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [hospitals, setHospitals] = useState<Hospital[]>([]);
	const [loadingHospitals, setLoadingHospitals] = useState(false);

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
				const needsHospital = value.rol !== 'ADMIN';
				const payload: RegisterPayload = {
					nombre: value.nombre.trim(),
					apellido: value.apellido.trim(),
					email: value.email.trim(),
					password: value.password,
					rol: value.rol,
				};

				if (value.telefono.trim()) {
					payload.telefono = value.telefono.trim();
				}

				if (needsHospital && value.hospitalId) {
					payload.hospitalId = value.hospitalId;
				}

				if (value.rol === 'MEDICO') {
					payload.medicoData = {
						especialidadId: value.medicoEspecialidadId ?? 0,
						numeroRegistro: value.medicoNumeroRegistro.trim(),
						...(value.medicoConsultorio.trim()
							? { consultorio: value.medicoConsultorio.trim() }
							: {}),
					};
				}

				if (value.rol === 'ENFERMERO') {
					payload.enfermeroData = {
						numeroRegistro: value.enfermeroNumeroRegistro.trim(),
						nivelFormacion: value.enfermeroNivelFormacion,
						areaEspecializacion:
							value.enfermeroAreaEspecializacion ?? undefined,
						certificacionTriage: value.enfermeroCertificacionTriage,
					};
				}

				if (value.rol === 'PACIENTE') {
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

	const values = form.state.values;
	const needsHospital = values.rol !== 'ADMIN';

	useEffect(() => {
		if (
			step !== 2 ||
			!needsHospital ||
			hospitals.length > 0 ||
			loadingHospitals
		) {
			return;
		}

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
		hospitals.length,
		loadingHospitals,
		needsHospital,
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
		if (nextValues.rol !== 'ADMIN' && !nextValues.hospitalId) {
			return content.register.errors.requiredHospital;
		}

		if (nextValues.rol === 'MEDICO') {
			if (!nextValues.medicoNumeroRegistro.trim()) {
				return content.register.errors.requiredDoctorRegistration;
			}
			if (
				!nextValues.medicoEspecialidadId ||
				nextValues.medicoEspecialidadId < 1
			) {
				return content.register.errors.requiredDoctorSpecialty;
			}
		}

		if (nextValues.rol === 'ENFERMERO') {
			if (!nextValues.enfermeroNumeroRegistro.trim()) {
				return content.register.errors.requiredNurseRegistration;
			}
			if (
				!nextValues.enfermeroAreaEspecializacion ||
				nextValues.enfermeroAreaEspecializacion < 1
			) {
				return content.register.errors.requiredNurseArea;
			}
		}

		return null;
	}

	function handleNext() {
		form.setFieldValue('submitError', '');
		const nextError =
			step === 1 ? validateStep1(values) : validateStep2(values);
		if (nextError) {
			form.setFieldValue('submitError', nextError);
			return;
		}
		setStep((current) => (current === 1 ? 2 : 3));
	}

	function handleBack() {
		form.setFieldValue('submitError', '');
		setStep((current) => (current === 3 ? 2 : 1));
	}

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_50%)]" />
			<Card className="relative z-10 w-full max-w-3xl">
				<CardHeader className="space-y-3 border-b">
					<div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<HeartIcon className="h-6 w-6" />
					</div>
					<CardTitle>{content.register.title}</CardTitle>
					<CardDescription>{content.register.subtitle}</CardDescription>
					<div className="flex flex-wrap items-center gap-3 pt-1">
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
				<CardContent className="space-y-5 pt-5">
					<form
						onSubmit={(event) => {
							event.preventDefault();
							if (step < 3) {
								handleNext();
								return;
							}
							void form.handleSubmit();
						}}
						className="space-y-5"
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
														placeholder={content.register.placeholders.apellido}
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
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										{content.register.roles.map((roleOption) => {
											const selected = values.rol === roleOption.value;
											return (
												<button
													key={roleOption.value}
													type="button"
													onClick={() =>
														form.setFieldValue('rol', roleOption.value)
													}
													className={[
														'rounded-xl border p-3 text-left transition-colors',
														selected
															? 'border-primary bg-primary/5'
															: 'border-border bg-card hover:bg-muted/40',
													].join(' ')}
												>
													<div className="flex items-center gap-2">
														<span className="text-sm font-medium text-foreground">
															{roleOption.label}
														</span>
														{selected && (
															<Badge variant="secondary">
																{content.register.selectedRoleBadge}
															</Badge>
														)}
													</div>
													<p className="mt-1 text-xs text-muted-foreground">
														{roleOption.description}
													</p>
												</button>
											);
										})}
									</div>
								</div>

								{needsHospital && (
									<div className="space-y-2">
										<p className="text-sm font-medium text-foreground">
											{content.register.labels.hospital}
										</p>
										{loadingHospitals ? (
											<div className="space-y-2">
												{[1, 2, 3].map((item) => (
													<Skeleton key={item} className="h-14 rounded-xl" />
												))}
											</div>
										) : (
											<div className="max-h-60 space-y-2 overflow-y-auto pr-1">
												{hospitals.map((hospital) => {
													const selected = values.hospitalId === hospital.id;
													return (
														<button
															key={hospital.id}
															type="button"
															onClick={() =>
																form.setFieldValue('hospitalId', hospital.id)
															}
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
															{selected && (
																<CheckCircleIcon className="h-4 w-4 shrink-0 text-primary" />
															)}
														</button>
													);
												})}
												{hospitals.length === 0 && (
													<p className="py-4 text-center text-sm text-muted-foreground">
														{content.register.emptyHospitals}
													</p>
												)}
											</div>
										)}
									</div>
								)}

								{values.rol === 'MEDICO' && (
									<div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
										<p className="flex items-center gap-2 text-sm font-semibold text-foreground">
											<UserIcon className="h-4 w-4" />
											{content.register.sections.doctor}
										</p>
										<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
											<form.Field name="medicoEspecialidadId">
												{(field) => (
													<Field>
														<FieldLabel htmlFor={field.name}>
															{content.register.labels.especialidadId}
														</FieldLabel>
														<Input
															id={field.name}
															type="number"
															min={1}
															value={field.state.value ?? ''}
															onChange={(event) => {
																const value = Number(event.target.value);
																field.handleChange(
																	Number.isNaN(value) ? null : value,
																);
															}}
															placeholder={
																content.register.placeholders.especialidadId
															}
														/>
													</Field>
												)}
											</form.Field>
											<form.Field name="medicoNumeroRegistro">
												{(field) => (
													<Field>
														<FieldLabel htmlFor={field.name}>
															{content.register.labels.numeroRegistroMedico}
														</FieldLabel>
														<Input
															id={field.name}
															type="text"
															value={field.state.value}
															onChange={(event) =>
																field.handleChange(event.target.value)
															}
															placeholder={
																content.register.placeholders
																	.numeroRegistroMedico
															}
														/>
													</Field>
												)}
											</form.Field>
										</div>
										<form.Field name="medicoConsultorio">
											{(field) => (
												<Field>
													<FieldLabel htmlFor={field.name}>
														{content.register.labels.consultorio}
													</FieldLabel>
													<Input
														id={field.name}
														type="text"
														value={field.state.value}
														onChange={(event) =>
															field.handleChange(event.target.value)
														}
														placeholder={
															content.register.placeholders.consultorio
														}
													/>
												</Field>
											)}
										</form.Field>
									</div>
								)}

								{values.rol === 'ENFERMERO' && (
									<div className="space-y-3 rounded-xl border border-secondary bg-secondary/40 p-4">
										<p className="flex items-center gap-2 text-sm font-semibold text-foreground">
											<BeakerIcon className="h-4 w-4" />
											{content.register.sections.nurse}
										</p>
										<form.Field name="enfermeroNumeroRegistro">
											{(field) => (
												<Field>
													<FieldLabel htmlFor={field.name}>
														{content.register.labels.numeroRegistroEnfermero}
													</FieldLabel>
													<Input
														id={field.name}
														type="text"
														value={field.state.value}
														onChange={(event) =>
															field.handleChange(event.target.value)
														}
														placeholder={
															content.register.placeholders
																.numeroRegistroEnfermero
														}
													/>
												</Field>
											)}
										</form.Field>
										<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
											<form.Field name="enfermeroNivelFormacion">
												{(field) => (
													<Field>
														<FieldLabel>
															{content.register.labels.nivelFormacion}
														</FieldLabel>
														<Select
															value={String(field.state.value)}
															onValueChange={(value) =>
																field.handleChange(
																	Number(value ?? field.state.value),
																)
															}
														>
															<SelectTrigger className="w-full">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{content.register.trainingLevels.map(
																	(level) => (
																		<SelectItem
																			key={level.id}
																			value={String(level.id)}
																		>
																			{level.label}
																		</SelectItem>
																	),
																)}
															</SelectContent>
														</Select>
													</Field>
												)}
											</form.Field>
											<form.Field name="enfermeroAreaEspecializacion">
												{(field) => (
													<Field>
														<FieldLabel htmlFor={field.name}>
															{content.register.labels.areaEspecializacion}
														</FieldLabel>
														<Input
															id={field.name}
															type="number"
															min={1}
															value={field.state.value ?? ''}
															onChange={(event) => {
																const value = Number(event.target.value);
																field.handleChange(
																	Number.isNaN(value) ? null : value,
																);
															}}
															placeholder={
																content.register.placeholders
																	.areaEspecializacion
															}
														/>
													</Field>
												)}
											</form.Field>
										</div>
										<form.Field name="enfermeroCertificacionTriage">
											{(field) => (
												<Field orientation="horizontal">
													<Checkbox
														id={field.name}
														checked={field.state.value}
														onCheckedChange={(checked) =>
															field.handleChange(Boolean(checked))
														}
													/>
													<FieldLabel htmlFor={field.name}>
														{content.register.labels.certificacionTriage}
													</FieldLabel>
												</Field>
											)}
										</form.Field>
									</div>
								)}
							</div>
						)}

						{step === 3 && (
							<div className="space-y-4">
								<FieldDescription>
									{content.register.sections.optionalInfo}
								</FieldDescription>

								{values.rol === 'PACIENTE' ? (
									<>
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
																{content.register.bloodTypes.map(
																	(bloodType) => (
																		<SelectItem
																			key={bloodType}
																			value={bloodType}
																		>
																			{bloodType}
																		</SelectItem>
																	),
																)}
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
									</>
								) : (
									<div className="rounded-xl border bg-muted/40 p-6 text-center">
										<CheckCircleIcon className="mx-auto mb-2 h-9 w-9 text-primary" />
										<p className="text-sm font-medium text-foreground">
											{content.register.sections.readyTitle}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{content.register.sections.readyHint}
										</p>
									</div>
								)}
							</div>
						)}

						<form.Field name="submitError">
							{(field) =>
								field.state.value ? (
									<Alert variant="destructive">
										<AlertDescription>{field.state.value}</AlertDescription>
									</Alert>
								) : null
							}
						</form.Field>

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
		</div>
	);
}
