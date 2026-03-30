import { ArrowPathIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import { m } from '@/features/i18n/paraglide/messages';
import { gqlQuery } from '@/lib/graphql-client';
import type { RoleViewProps } from './dashboard-role.types';
import { RoleDashboardShell } from './role-dashboard-shell';

interface NursesData {
	nurses: Array<{
		id: string;
		usuarioId: string;
		nivelFormacion: number;
		certificacionTriage: boolean;
	}>;
}

interface NurseAvailabilityData {
	disponibilidadesByNurse: Array<{
		id: number;
		diaSemana: number;
		horaInicio: string;
		horaFin: string;
		activo: boolean;
	}>;
}

const NURSES_QUERY = `
	query DashboardNurses {
		nurses {
			id
			usuarioId
			nivelFormacion
			certificacionTriage
		}
	}
`;

const NURSE_AVAILABILITY_QUERY = `
	query DashboardNurseAvailability($enfermeroId: ID!) {
		disponibilidadesByNurse(enfermeroId: $enfermeroId) {
			id
			diaSemana
			horaInicio
			horaFin
			activo
		}
	}
`;

export function NurseDashboardView({ user, locale }: RoleViewProps) {
	const [availability, setAvailability] = useState<
		NurseAvailabilityData['disponibilidadesByNurse']
	>([]);
	const [missingProfile, setMissingProfile] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const loadData = useCallback(async () => {
		setLoading(true);
		setError('');
		setMissingProfile(false);
		try {
			const nurses = await gqlQuery<NursesData>(NURSES_QUERY);
			const currentNurse = nurses.nurses.find(
				(nurse) => nurse.usuarioId === user.id,
			);
			if (!currentNurse) {
				setMissingProfile(true);
				setAvailability([]);
				return;
			}
			const data = await gqlQuery<NurseAvailabilityData>(
				NURSE_AVAILABILITY_QUERY,
				{
					enfermeroId: currentNurse.id,
				},
			);
			setAvailability(data.disponibilidadesByNurse);
		} catch (err) {
			const message = err instanceof Error ? err.message : '';
			const lowerMessage = message.toLowerCase();
			setError(
				lowerMessage.includes('forbidden') ||
					lowerMessage.includes('unauthorized') ||
					lowerMessage.includes('permission')
					? m.dashboardRolePermissionError({}, { locale })
					: message || m.dashboardAlertPatientsLoadError({}, { locale }),
			);
		} finally {
			setLoading(false);
		}
	}, [locale, user.id]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	return (
		<RoleDashboardShell
			title={m.authRoleNurse({}, { locale })}
			subtitle={m.authRegisterRoleNurseDescription({}, { locale })}
		>
			<div className="flex justify-end">
				<Button
					type="button"
					variant="outline"
					onClick={loadData}
					disabled={loading}
				>
					<ArrowPathIcon className="mr-2 h-4 w-4" />
					{m.dashboardPatientsRefresh({}, { locale })}
				</Button>
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{loading ? (
				<div className="space-y-3">
					{['nurse-skeleton-1', 'nurse-skeleton-2', 'nurse-skeleton-3'].map(
						(key) => (
							<Skeleton key={key} className="h-16 rounded-xl" />
						),
					)}
				</div>
			) : availability.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{missingProfile
						? m.dashboardNurseMissingProfile({}, { locale })
						: m.dashboardPatientsEmptyDescription({}, { locale })}
				</p>
			) : (
				<ul className="space-y-2">
					{availability.map((slot) => (
						<li
							key={slot.id}
							className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/90 p-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="flex items-center gap-2 text-sm text-foreground">
								<ClockIcon className="h-4 w-4 text-muted-foreground" />
								<span>
									{slot.horaInicio} - {slot.horaFin}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<Badge variant="outline">{slot.diaSemana}</Badge>
								<Badge variant={slot.activo ? 'secondary' : 'outline'}>
									{slot.activo
										? m.dashboardHospitalStatusActive({}, { locale })
										: m.dashboardHospitalStatusInactive({}, { locale })}
								</Badge>
							</div>
						</li>
					))}
				</ul>
			)}
		</RoleDashboardShell>
	);
}
