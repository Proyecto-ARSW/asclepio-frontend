import { useForm } from '@tanstack/react-form';
import { useEffect, useMemo, useState } from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog/alert-dialog.component';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
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
import { Switch } from '@/components/ui/switch/switch.component';
import type { AppLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import type {
	DashboardUser,
	RoleUpdatePayload,
	UserRole,
} from './dashboard-role.types';
import { getLocalizedRoleLabel } from './role-label';

const ROLE_OPTIONS: UserRole[] = [
	'PACIENTE',
	'MEDICO',
	'ENFERMERO',
	'RECEPCIONISTA',
	'ADMIN',
];

interface SpecialtyOption {
	id: number;
	nombre: string;
}

interface DoctorProfileSummary {
	numeroRegistro: string;
	especialidadId: number;
	consultorio?: string | null;
}

interface NurseProfileSummary {
	numeroRegistro: string;
	nivelFormacion: number;
	areaEspecializacion: number;
	certificacionTriage: boolean;
}

export function AdminRoleRowForm({
	user,
	locale,
	doctorProfile,
	nurseProfile,
	specialties,
	onSubmit,
	saving,
	lastUpdatedAt,
}: {
	user: DashboardUser;
	locale: AppLocale;
	doctorProfile?: DoctorProfileSummary;
	nurseProfile?: NurseProfileSummary;
	specialties: SpecialtyOption[];
	onSubmit: (payload: RoleUpdatePayload) => Promise<void>;
	saving: boolean;
	lastUpdatedAt?: string;
}) {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [validationError, setValidationError] = useState('');
	const [selectedRole, setSelectedRole] = useState<UserRole>(user.rol);
	const form = useForm({
		defaultValues: {
			role: user.rol,
			doctorLicense: doctorProfile?.numeroRegistro ?? '',
			doctorSpecialtyId: doctorProfile
				? String(doctorProfile.especialidadId)
				: '',
			doctorOffice: doctorProfile?.consultorio ?? '',
			nurseRegistration: nurseProfile?.numeroRegistro ?? '',
			nurseTrainingLevel: nurseProfile
				? String(nurseProfile.nivelFormacion)
				: '1',
			nurseAreaId: nurseProfile ? String(nurseProfile.areaEspecializacion) : '',
			nurseTriage: nurseProfile?.certificacionTriage ?? false,
		},
		onSubmit: async ({ value }) => {
			if (value.role === 'MEDICO') {
				if (!value.doctorLicense.trim()) {
					setValidationError(
						m.authRegisterErrorRequiredDoctorRegistration({}, { locale }),
					);
					return;
				}

				const specialtyId = Number(value.doctorSpecialtyId);
				if (Number.isNaN(specialtyId) || specialtyId < 1) {
					setValidationError(
						m.authRegisterErrorRequiredDoctorSpecialty({}, { locale }),
					);
					return;
				}
				setValidationError('');
				await onSubmit({
					role: value.role,
					medicoData: {
						numeroRegistro: value.doctorLicense.trim(),
						especialidadId: specialtyId,
						consultorio: value.doctorOffice.trim() || undefined,
					},
				});
				return;
			}

			if (value.role === 'ENFERMERO') {
				const trainingLevel = Number(value.nurseTrainingLevel);
				const areaId = value.nurseAreaId
					? Number(value.nurseAreaId)
					: undefined;
				if (
					!value.nurseRegistration.trim() ||
					Number.isNaN(trainingLevel) ||
					trainingLevel < 1 ||
					!areaId ||
					Number.isNaN(areaId) ||
					areaId < 1
				) {
					setValidationError(
						m.dashboardAdminCreateUserErrorNurseRequirements({}, { locale }),
					);
					return;
				}
				setValidationError('');
				await onSubmit({
					role: value.role,
					enfermeroData: {
						numeroRegistro: value.nurseRegistration.trim(),
						nivelFormacion: trainingLevel,
						areaEspecializacion: areaId,
						certificacionTriage: value.nurseTriage,
					},
				});
				return;
			}

			if (value.role === user.rol) return;

			setValidationError('');
			await onSubmit({ role: value.role });
		},
	});

	useEffect(() => {
		form.setFieldValue('role', user.rol);
		form.setFieldValue('doctorLicense', doctorProfile?.numeroRegistro ?? '');
		form.setFieldValue(
			'doctorSpecialtyId',
			doctorProfile ? String(doctorProfile.especialidadId) : '',
		);
		form.setFieldValue('doctorOffice', doctorProfile?.consultorio ?? '');
		form.setFieldValue('nurseRegistration', nurseProfile?.numeroRegistro ?? '');
		form.setFieldValue(
			'nurseTrainingLevel',
			nurseProfile ? String(nurseProfile.nivelFormacion) : '1',
		);
		form.setFieldValue(
			'nurseAreaId',
			nurseProfile ? String(nurseProfile.areaEspecializacion) : '',
		);
		form.setFieldValue(
			'nurseTriage',
			nurseProfile?.certificacionTriage ?? false,
		);
		setSelectedRole(user.rol);
	}, [form, user.rol, doctorProfile, nurseProfile]);

	const roleLabelMap: Record<UserRole, string> = {
		ADMIN: getLocalizedRoleLabel('ADMIN', locale),
		MEDICO: getLocalizedRoleLabel('MEDICO', locale),
		ENFERMERO: getLocalizedRoleLabel('ENFERMERO', locale),
		RECEPCIONISTA: getLocalizedRoleLabel('RECEPCIONISTA', locale),
		PACIENTE: getLocalizedRoleLabel('PACIENTE', locale),
	};

	const specialtyById = useMemo(
		() =>
			new Map(specialties.map((specialty) => [specialty.id, specialty.nombre])),
		[specialties],
	);

	const doctorProfileLocked =
		selectedRole === 'MEDICO' &&
		user.rol === 'MEDICO' &&
		Boolean(doctorProfile);
	const nurseProfileLocked =
		selectedRole === 'ENFERMERO' &&
		user.rol === 'ENFERMERO' &&
		Boolean(nurseProfile);

	return (
		<div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
			<div className="space-y-2">
				<div className="space-y-0.5">
					<p className="text-sm font-medium text-foreground">
						{user.nombre} {user.apellido}
					</p>
					<p className="text-xs text-muted-foreground">{user.email}</p>
				</div>
				<form.Field name="role">
					{(field) => (
						<Field>
							<div className="flex items-center gap-2">
								<FieldLabel>
									{m.authRegisterLabelRol({}, { locale })}
								</FieldLabel>
								<Badge variant="secondary">{roleLabelMap[user.rol]}</Badge>
							</div>
							<Select
								value={field.state.value}
								onValueChange={(value) => {
									const nextRole = (value as UserRole | null) ?? user.rol;
									field.handleChange(nextRole);
									setSelectedRole(nextRole);
								}}
							>
								<SelectTrigger className="w-full sm:w-56">
									<SelectValue>
										{roleLabelMap[(field.state.value as UserRole) ?? user.rol]}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{ROLE_OPTIONS.map((role) => (
										<SelectItem
											key={role}
											value={role}
											label={roleLabelMap[role]}
										>
											{roleLabelMap[role]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldDescription>
								{lastUpdatedAt
									? m.dashboardAdminRoleUpdatedAt(
											{ at: lastUpdatedAt },
											{ locale },
										)
									: m.dashboardOverviewAdminActionsTitle({}, { locale })}
							</FieldDescription>
						</Field>
					)}
				</form.Field>

				{selectedRole === 'MEDICO' &&
					(doctorProfileLocked ? (
						<div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-3">
							<p className="text-xs font-medium text-muted-foreground">
								{m.authRegisterLabelNumeroRegistroMedico({}, { locale })}:{' '}
								<span className="text-foreground">
									{doctorProfile?.numeroRegistro}
								</span>
							</p>
							<p className="text-xs font-medium text-muted-foreground">
								{m.authRegisterLabelEspecialidadId({}, { locale })}:{' '}
								<span className="text-foreground">
									{specialtyById.get(doctorProfile?.especialidadId ?? 0) ??
										String(doctorProfile?.especialidadId ?? '')}
								</span>
							</p>
							{doctorProfile?.consultorio && (
								<p className="text-xs font-medium text-muted-foreground">
									{m.authRegisterLabelConsultorio({}, { locale })}:{' '}
									<span className="text-foreground">
										{doctorProfile.consultorio}
									</span>
								</p>
							)}
						</div>
					) : (
						<div className="grid gap-2 sm:grid-cols-2">
							<form.Field name="doctorLicense">
								{(field) => (
									<Field>
										<FieldLabel>
											{m.authRegisterLabelNumeroRegistroMedico({}, { locale })}
										</FieldLabel>
										<Input
											value={field.state.value}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											placeholder={m.authRegisterPlaceholderNumeroRegistroMedico(
												{},
												{ locale },
											)}
										/>
									</Field>
								)}
							</form.Field>
							<form.Field name="doctorSpecialtyId">
								{(field) => (
									<Field>
										<FieldLabel>
											{m.authRegisterLabelEspecialidadId({}, { locale })}
										</FieldLabel>
										<Select
											value={field.state.value}
											onValueChange={(value) => field.handleChange(value ?? '')}
										>
											<SelectTrigger className="w-full">
												<SelectValue
													placeholder={m.authRegisterPlaceholderEspecialidadId(
														{},
														{ locale },
													)}
												>
													{specialtyById.get(Number(field.state.value))}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												{specialties.map((specialty) => (
													<SelectItem
														key={specialty.id}
														value={String(specialty.id)}
														label={specialty.nombre}
													>
														{specialty.nombre}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>
						</div>
					))}

				{selectedRole === 'ENFERMERO' &&
					(nurseProfileLocked ? (
						<div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-3">
							<p className="text-xs font-medium text-muted-foreground">
								{m.authRegisterLabelNumeroRegistroEnfermero({}, { locale })}:{' '}
								<span className="text-foreground">
									{nurseProfile?.numeroRegistro}
								</span>
							</p>
							<p className="text-xs font-medium text-muted-foreground">
								{m.authRegisterLabelNivelFormacion({}, { locale })}:{' '}
								<span className="text-foreground">
									{nurseProfile?.nivelFormacion === 1
										? m.authRegisterTrainingLevel1({}, { locale })
										: nurseProfile?.nivelFormacion === 2
											? m.authRegisterTrainingLevel2({}, { locale })
											: nurseProfile?.nivelFormacion === 3
												? m.authRegisterTrainingLevel3({}, { locale })
												: m.authRegisterTrainingLevel4({}, { locale })}
								</span>
							</p>
							<p className="text-xs font-medium text-muted-foreground">
								{m.authRegisterLabelAreaEspecializacion({}, { locale })}:{' '}
								<span className="text-foreground">
									{specialtyById.get(nurseProfile?.areaEspecializacion ?? 0) ??
										String(nurseProfile?.areaEspecializacion ?? '')}
								</span>
							</p>
						</div>
					) : (
						<div className="grid gap-2 sm:grid-cols-2">
							<form.Field name="nurseRegistration">
								{(field) => (
									<Field>
										<FieldLabel>
											{m.authRegisterLabelNumeroRegistroEnfermero(
												{},
												{ locale },
											)}
										</FieldLabel>
										<Input
											value={field.state.value}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											placeholder={m.authRegisterPlaceholderNumeroRegistroEnfermero(
												{},
												{ locale },
											)}
										/>
									</Field>
								)}
							</form.Field>
							<form.Field name="nurseTrainingLevel">
								{(field) => (
									<Field>
										<FieldLabel>
											{m.authRegisterLabelNivelFormacion({}, { locale })}
										</FieldLabel>
										<Select
											value={field.state.value}
											onValueChange={(value) =>
												field.handleChange(value ?? '1')
											}
										>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="1">
													{m.authRegisterTrainingLevel1({}, { locale })}
												</SelectItem>
												<SelectItem value="2">
													{m.authRegisterTrainingLevel2({}, { locale })}
												</SelectItem>
												<SelectItem value="3">
													{m.authRegisterTrainingLevel3({}, { locale })}
												</SelectItem>
												<SelectItem value="4">
													{m.authRegisterTrainingLevel4({}, { locale })}
												</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>
							<form.Field name="nurseAreaId">
								{(field) => (
									<Field>
										<FieldLabel>
											{m.authRegisterLabelAreaEspecializacion({}, { locale })}
										</FieldLabel>
										<Select
											value={field.state.value}
											onValueChange={(value) => field.handleChange(value ?? '')}
										>
											<SelectTrigger className="w-full">
												<SelectValue
													placeholder={m.authRegisterPlaceholderAreaEspecializacion(
														{},
														{ locale },
													)}
												>
													{specialtyById.get(Number(field.state.value))}
												</SelectValue>
											</SelectTrigger>
											<SelectContent>
												{specialties.map((specialty) => (
													<SelectItem
														key={`nurse-${specialty.id}`}
														value={String(specialty.id)}
														label={specialty.nombre}
													>
														{specialty.nombre}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>
							<form.Field name="nurseTriage">
								{(field) => (
									<Field>
										<div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2">
											<FieldLabel className="mb-0">
												{m.authRegisterLabelCertificacionTriage({}, { locale })}
											</FieldLabel>
											<Switch
												checked={field.state.value}
												onCheckedChange={(checked) =>
													field.handleChange(Boolean(checked))
												}
											/>
										</div>
									</Field>
								)}
							</form.Field>
						</div>
					))}

				{validationError && (
					<p className="text-xs font-medium text-destructive">
						{validationError}
					</p>
				)}
			</div>
			<form.Subscribe
				selector={(state) => ({
					canSubmit: state.canSubmit,
					values: state.values,
				})}
			>
				{({ canSubmit, values }) => {
					const isSameRole = values.role === user.rol;
					const hasDoctorPayload =
						values.role === 'MEDICO' &&
						Boolean(values.doctorLicense.trim()) &&
						Number(values.doctorSpecialtyId) > 0;
					const hasNursePayload =
						values.role === 'ENFERMERO' &&
						Boolean(values.nurseRegistration.trim()) &&
						Number(values.nurseTrainingLevel) > 0 &&
						Number(values.nurseAreaId) > 0;
					const canSubmitSameRole = hasDoctorPayload || hasNursePayload;

					return (
						<>
							<Button
								type="button"
								disabled={
									!canSubmit || saving || (isSameRole && !canSubmitSameRole)
								}
								onClick={() => setConfirmOpen(true)}
							>
								{saving
									? m.authRegisterNavSubmitLoading({}, { locale })
									: m.dashboardAdminRoleApply({}, { locale })}
							</Button>

							<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											{m.dashboardAdminRoleConfirmTitle({}, { locale })}
										</AlertDialogTitle>
										<AlertDialogDescription>
											{m.dashboardAdminRoleConfirmDescription(
												{
													user: `${user.nombre} ${user.apellido}`,
													from: roleLabelMap[user.rol],
													to: roleLabelMap[selectedRole],
												},
												{ locale },
											)}
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>
											{m.dashboardAdminRoleConfirmCancel({}, { locale })}
										</AlertDialogCancel>
										<AlertDialogAction
											onClick={() => {
												void form
													.handleSubmit()
													.finally(() => setConfirmOpen(false));
											}}
										>
											{m.dashboardAdminRoleConfirmAction({}, { locale })}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</>
					);
				}}
			</form.Subscribe>
		</div>
	);
}
