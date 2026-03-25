import { useForm } from '@tanstack/react-form';
import { useEffect, useState } from 'react';
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
import { m } from '@/features/i18n/paraglide/messages';
import type {
	DashboardUser,
	RoleUpdatePayload,
	UserRole,
} from './dashboard-role.types';

const ROLE_OPTIONS: UserRole[] = [
	'PACIENTE',
	'MEDICO',
	'ENFERMERO',
	'RECEPCIONISTA',
	'ADMIN',
];

export function AdminRoleRowForm({
	user,
	locale,
	onSubmit,
	saving,
	lastUpdatedAt,
}: {
	user: DashboardUser;
	locale: 'es' | 'en';
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
			doctorLicense: '',
			doctorSpecialtyId: '',
			doctorOffice: '',
			nurseRegistration: '',
			nurseTrainingLevel: '1',
			nurseAreaId: '',
			nurseTriage: false,
		},
		onSubmit: async ({ value }) => {
			if (value.role === user.rol) return;

			if (value.role === 'MEDICO') {
				const specialtyId = Number(value.doctorSpecialtyId);
				if (
					!value.doctorLicense.trim() ||
					Number.isNaN(specialtyId) ||
					specialtyId < 1
				) {
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
					trainingLevel < 1
				) {
					setValidationError(
						m.authRegisterErrorRequiredNurseRegistration({}, { locale }),
					);
					return;
				}
				setValidationError('');
				await onSubmit({
					role: value.role,
					enfermeroData: {
						numeroRegistro: value.nurseRegistration.trim(),
						nivelFormacion: trainingLevel,
						areaEspecializacion:
							areaId && !Number.isNaN(areaId) && areaId > 0
								? areaId
								: undefined,
						certificacionTriage: value.nurseTriage,
					},
				});
				return;
			}

			setValidationError('');
			await onSubmit({ role: value.role });
		},
	});

	useEffect(() => {
		form.setFieldValue('role', user.rol);
		setSelectedRole(user.rol);
	}, [form, user.rol]);

	const roleLabelMap: Record<UserRole, string> = {
		ADMIN: m.authRoleAdmin({}, { locale }),
		MEDICO: m.authRoleDoctor({}, { locale }),
		ENFERMERO: m.authRoleNurse({}, { locale }),
		RECEPCIONISTA: m.authRoleReceptionist({}, { locale }),
		PACIENTE: m.authRolePatient({}, { locale }),
	};

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
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ROLE_OPTIONS.map((role) => (
										<SelectItem key={role} value={role}>
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

				{selectedRole === 'MEDICO' && (
					<div className="grid gap-2 sm:grid-cols-2">
						<form.Field name="doctorLicense">
							{(field) => (
								<Field>
									<FieldLabel>
										{m.authRegisterLabelNumeroRegistroMedico({}, { locale })}
									</FieldLabel>
									<Input
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
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
									<Input
										type="number"
										min={1}
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										placeholder={m.authRegisterPlaceholderEspecialidadId(
											{},
											{ locale },
										)}
									/>
								</Field>
							)}
						</form.Field>
					</div>
				)}

				{selectedRole === 'ENFERMERO' && (
					<div className="grid gap-2 sm:grid-cols-2">
						<form.Field name="nurseRegistration">
							{(field) => (
								<Field>
									<FieldLabel>
										{m.authRegisterLabelNumeroRegistroEnfermero({}, { locale })}
									</FieldLabel>
									<Input
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
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
										onValueChange={(value) => field.handleChange(value ?? '1')}
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
									<Input
										type="number"
										min={1}
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										placeholder={m.authRegisterPlaceholderAreaEspecializacion(
											{},
											{ locale },
										)}
									/>
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
				)}

				{validationError && (
					<p className="text-xs font-medium text-destructive">
						{validationError}
					</p>
				)}
			</div>
			<form.Subscribe selector={(state) => state.canSubmit}>
				{(canSubmit) => (
					<>
						<Button
							type="button"
							disabled={!canSubmit || saving || selectedRole === user.rol}
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
				)}
			</form.Subscribe>
		</div>
	);
}
