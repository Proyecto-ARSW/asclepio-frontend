import { useForm } from '@tanstack/react-form';
import { useEffect } from 'react';
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
}: {
	user: DashboardUser;
	locale: 'es' | 'en';
	onSubmit: (nextRole: UserRole) => Promise<void>;
	saving: boolean;
}) {
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
								<Badge variant="secondary">{user.rol}</Badge>
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
											{role}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldDescription>
								{m.dashboardOverviewAdminActionsTitle({}, { locale })}
							</FieldDescription>
						</Field>
					)}
				</form.Field>
			</div>
			<form.Subscribe selector={(state) => state.canSubmit}>
				{(canSubmit) => (
					<Button
						type="button"
						disabled={!canSubmit || saving}
						onClick={() => void form.handleSubmit()}
					>
						{saving
							? m.authRegisterNavSubmitLoading({}, { locale })
							: m.dashboardPatientsRefresh({}, { locale })}
					</Button>
				)}
			</form.Subscribe>
		</div>
	);
}
