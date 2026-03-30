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

interface PatientsData {
	patients: Array<{
		id: string;
		usuarioId: string;
		tipoSangre?: string | null;
		eps?: string | null;
	}>;
}

interface PatientAppointmentsData {
	appointmentsByPatient: Array<{
		id: string;
		fechaHora: string;
		estado: string;
		motivo?: string | null;
	}>;
}

interface PatientTurnsData {
	turnosPorPaciente: Array<{
		id: string;
		numeroTurno: number;
		estado: string;
		tipo: string;
	}>;
}

const PATIENTS_QUERY = `
	query DashboardPatients {
		patients {
			id
			usuarioId
			tipoSangre
			eps
		}
	}
`;

const PATIENT_APPOINTMENTS_QUERY = `
	query DashboardPatientAppointments($pacienteId: ID!) {
		appointmentsByPatient: appoinmentsByPatient(pacienteId: $pacienteId) {
			id
			fechaHora
			estado
			motivo
		}
	}
`;

const PATIENT_TURNS_QUERY = `
	query DashboardPatientTurns($pacienteId: ID!) {
		turnosPorPaciente(pacienteId: $pacienteId) {
			id
			numeroTurno
			estado
			tipo
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

export function PatientDashboardView({ user, locale }: RoleViewProps) {
	const [appointments, setAppointments] = useState<
		PatientAppointmentsData['appointmentsByPatient']
	>([]);
	const [turns, setTurns] = useState<PatientTurnsData['turnosPorPaciente']>([]);
	const [missingProfile, setMissingProfile] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const loadData = useCallback(async () => {
		setLoading(true);
		setError('');
		setMissingProfile(false);
		try {
			const patients = await gqlQuery<PatientsData>(PATIENTS_QUERY);
			const currentPatient = patients.patients.find(
				(patient) => patient.usuarioId === user.id,
			);
			if (!currentPatient) {
				setMissingProfile(true);
				setAppointments([]);
				setTurns([]);
				return;
			}
			const [appointmentsResult, turnsResult] = await Promise.all([
				gqlQuery<PatientAppointmentsData>(PATIENT_APPOINTMENTS_QUERY, {
					pacienteId: currentPatient.id,
				}),
				gqlQuery<PatientTurnsData>(PATIENT_TURNS_QUERY, {
					pacienteId: currentPatient.id,
				}),
			]);
			setAppointments(appointmentsResult.appointmentsByPatient);
			setTurns(turnsResult.turnosPorPaciente);
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
			title={m.authRolePatient({}, { locale })}
			subtitle={m.authRegisterRolePatientDescription({}, { locale })}
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

			<div className="grid gap-4 lg:grid-cols-2">
				<section className="space-y-2 rounded-xl border border-border/70 p-3">
					<h3 className="text-sm font-semibold text-foreground">
						{m.dashboardSidebarAppointments({}, { locale })}
					</h3>
					{loading ? (
						<Skeleton className="h-16 rounded-lg" />
					) : appointments.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							{missingProfile
								? m.dashboardPatientMissingProfile({}, { locale })
								: m.dashboardPatientsEmptyDescription({}, { locale })}
						</p>
					) : (
						<ul className="space-y-2">
							{appointments.slice(0, 4).map((appointment) => (
								<li key={appointment.id} className="rounded-lg bg-muted/30 p-2">
									<div className="flex items-center justify-between gap-2">
										<span className="text-xs text-muted-foreground">
											{appointment.id}
										</span>
										<Badge variant="outline">
											{getStatusLabel(appointment.estado, locale)}
										</Badge>
									</div>
									<p className="mt-1 flex items-center gap-1 text-xs text-foreground">
										<ClockIcon className="h-3.5 w-3.5" />
										{new Date(appointment.fechaHora).toLocaleString(locale)}
									</p>
								</li>
							))}
						</ul>
					)}
				</section>
				<section className="space-y-2 rounded-xl border border-border/70 p-3">
					<h3 className="text-sm font-semibold text-foreground">
						{m.dashboardSidebarQueue({}, { locale })}
					</h3>
					{loading ? (
						<Skeleton className="h-16 rounded-lg" />
					) : turns.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							{missingProfile
								? m.dashboardPatientMissingProfile({}, { locale })
								: m.dashboardPatientsEmptyDescription({}, { locale })}
						</p>
					) : (
						<ul className="space-y-2">
							{turns.slice(0, 4).map((turn) => (
								<li
									key={turn.id}
									className="flex items-center justify-between rounded-lg bg-muted/30 p-2"
								>
									<div>
										<p className="text-sm font-medium text-foreground">
											#{turn.numeroTurno}
										</p>
										<p className="text-xs text-muted-foreground">{turn.tipo}</p>
									</div>
									<Badge variant="secondary">
										{getStatusLabel(turn.estado, locale)}
									</Badge>
								</li>
							))}
						</ul>
					)}
				</section>
			</div>
		</RoleDashboardShell>
	);
}
