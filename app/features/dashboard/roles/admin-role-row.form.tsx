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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select/select.component';
import { m } from '@/features/i18n/paraglide/messages';
import type { DashboardUser, UserRole } from './dashboard-role.types';

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
	onSubmit: (nextRole: UserRole) => Promise<void>;
	saving: boolean;
	lastUpdatedAt?: string;
}) {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const form = useForm({
		defaultValues: { role: user.rol },
		onSubmit: async ({ value }) => {
			if (value.role === user.rol) return;
			await onSubmit(value.role);
		},
	});

	useEffect(() => {
		form.setFieldValue('role', user.rol);
	}, [form, user.rol]);

	const selectedRole = useMemo(
		() =>
			((form.state.values as { role: UserRole }).role ?? user.rol) as UserRole,
		[form.state.values, user.rol],
	);

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
								onValueChange={(value) =>
									field.handleChange((value as UserRole | null) ?? user.rol)
								}
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
