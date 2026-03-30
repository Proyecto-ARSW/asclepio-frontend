import { ArrowPathIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import { m } from '@/features/i18n/paraglide/messages';
import { gqlQuery } from '@/lib/graphql-client';
import type { RoleViewProps } from './dashboard-role.types';
import { RoleDashboardShell } from './role-dashboard-shell';

interface DoctorsData {
	doctors: Array<{
		id: string;
		usuarioId: string;
		especialidadId: number;
		consultorio?: string | null;
	}>;
}

interface DoctorAppointmentsData {
	appointmentsByDoctor: Array<{
		id: string;
		fechaHora: string;
		estado: string;
		motivo?: string | null;
	}>;
}

const DOCTORS_QUERY = `
	query DashboardDoctors {
		doctors {
			id
			usuarioId
			especialidadId
			consultorio
		}
	}
`;

const DOCTOR_APPOINTMENTS_QUERY = `
	query DashboardDoctorAppointments($medicoId: ID!) {
		appointmentsByDoctor: appoinmentsByDoctor(medicoId: $medicoId) {
			id
			fechaHora
			estado
			motivo
		}
	}
`;

function getStatusLabel(status: string, locale: 'es' | 'en') {
	switch (status) {
		case 'PENDIENTE':
			return m.dashboardStatusPending({}, { locale });
		case 'CONFIRMADA':
			return m.dashboardStatusConfirmed({}, { locale });
		case 'CANCELADA':
			return m.dashboardStatusCancelled({}, { locale });
		case 'ATENDIDA':
			return m.dashboardStatusAttended({}, { locale });
		default:
			return status;
	}
}

export function DoctorDashboardView({ user, locale }: RoleViewProps) {
	const [doctorId, setDoctorId] = useState<string | null>(null);
	const [missingProfile, setMissingProfile] = useState(false);
	const [appointments, setAppointments] = useState<
		DoctorAppointmentsData['appointmentsByDoctor']
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const loadData = useCallback(async () => {
		setLoading(true);
		setError('');
		setMissingProfile(false);
		try {
			const doctors = await gqlQuery<DoctorsData>(DOCTORS_QUERY);
			const currentDoctor = doctors.doctors.find(
				(doctor) => doctor.usuarioId === user.id,
			);
			if (!currentDoctor) {
				setMissingProfile(true);
				setDoctorId(null);
				setAppointments([]);
				return;
			}
			setDoctorId(currentDoctor.id);
			const doctorAppointments = await gqlQuery<DoctorAppointmentsData>(
				DOCTOR_APPOINTMENTS_QUERY,
				{ medicoId: currentDoctor.id },
			);
			setAppointments(doctorAppointments.appointmentsByDoctor);
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

	const pendingCount = useMemo(
		() =>
			appointments.filter((appointment) => appointment.estado === 'PENDIENTE')
				.length,
		[appointments],
	);

	return (
		<RoleDashboardShell
			title={m.authRoleDoctor({}, { locale })}
			subtitle={m.authRegisterRoleDoctorDescription({}, { locale })}
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap gap-2">
					<Badge variant="secondary">
						{m.dashboardSidebarAppointments({}, { locale })}
					</Badge>
					<Badge variant="outline">{pendingCount}</Badge>
				</div>
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
					{['doctor-skeleton-1', 'doctor-skeleton-2', 'doctor-skeleton-3'].map(
						(key) => (
							<Skeleton key={key} className="h-16 rounded-xl" />
						),
					)}
				</div>
			) : !doctorId ? (
				<p className="text-sm text-muted-foreground">
					{missingProfile
						? m.dashboardDoctorMissingProfile({}, { locale })
						: m.dashboardPatientsEmptyDescription({}, { locale })}
				</p>
			) : appointments.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{m.dashboardPatientsEmptyTitle({}, { locale })}
				</p>
			) : (
				<ul className="space-y-2">
					{appointments.map((appointment) => (
						<li
							key={appointment.id}
							className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/90 p-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div>
								<p className="text-sm font-medium text-foreground">
									{appointment.id}
								</p>
								<p className="text-xs text-muted-foreground">
									{appointment.motivo || '—'}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<CalendarDaysIcon className="h-4 w-4 text-muted-foreground" />
								<span className="text-xs text-muted-foreground">
									{new Date(appointment.fechaHora).toLocaleString(locale)}
								</span>
								<Badge variant="outline">
									{getStatusLabel(appointment.estado, locale)}
								</Badge>
							</div>
						</li>
					))}
				</ul>
			)}
		</RoleDashboardShell>
	);
}
