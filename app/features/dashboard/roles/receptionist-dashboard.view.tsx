import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import { m } from '@/features/i18n/paraglide/messages';
import { gqlQuery } from '@/lib/graphql-client';
import type { RoleViewProps } from './dashboard-role.types';
import { RoleDashboardShell } from './role-dashboard-shell';

interface ReceptionistData {
	turnosPorHospital: Array<{
		id: string;
		numeroTurno: number;
		tipo: string;
		estado: string;
	}>;
	appointments: Array<{
		id: string;
		estado: string;
	}>;
}

const RECEPTIONIST_QUERY = `
	query ReceptionistDashboard {
		turnosPorHospital {
			id
			numeroTurno
			tipo
			estado
		}
		appointments: appoinments {
			id
			estado
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

export function ReceptionistDashboardView({ locale }: RoleViewProps) {
	const [data, setData] = useState<ReceptionistData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const loadData = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const result = await gqlQuery<ReceptionistData>(RECEPTIONIST_QUERY);
			setData(result);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.dashboardAlertPatientsLoadError({}, { locale }),
			);
		} finally {
			setLoading(false);
		}
	}, [locale]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	const queueCount = data?.turnosPorHospital.length ?? 0;
	const pendingAppointments = useMemo(
		() =>
			(data?.appointments ?? []).filter(
				(appointment) => appointment.estado === 'PENDIENTE',
			).length,
		[data],
	);

	return (
		<RoleDashboardShell
			title={m.authRoleReceptionist({}, { locale })}
			subtitle={m.authRegisterRoleReceptionistDescription({}, { locale })}
		>
			<div className="grid grid-cols-2 gap-3">
				<div className="rounded-xl border border-border/70 bg-background/80 p-3">
					<p className="text-xs text-muted-foreground">
						{m.dashboardSidebarQueue({}, { locale })}
					</p>
					<p className="text-2xl font-semibold text-foreground">{queueCount}</p>
				</div>
				<div className="rounded-xl border border-border/70 bg-background/80 p-3">
					<p className="text-xs text-muted-foreground">
						{m.dashboardSidebarAppointments({}, { locale })}
					</p>
					<p className="text-2xl font-semibold text-foreground">
						{pendingAppointments}
					</p>
				</div>
			</div>

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
				<Skeleton className="h-28 rounded-xl" />
			) : !data?.turnosPorHospital.length ? (
				<p className="text-sm text-muted-foreground">
					{m.dashboardPatientsEmptyDescription({}, { locale })}
				</p>
			) : (
				<ul className="space-y-2">
					{data.turnosPorHospital.slice(0, 8).map((turn) => (
						<li
							key={turn.id}
							className="flex items-center justify-between rounded-xl border border-border/70 bg-background/90 p-3"
						>
							<div>
								<p className="text-sm font-medium text-foreground">
									#{turn.numeroTurno}
								</p>
								<p className="text-xs text-muted-foreground">{turn.id}</p>
							</div>
							<div className="flex items-center gap-2">
								<Badge variant="outline">{turn.tipo}</Badge>
								<Badge variant="secondary">
									{getStatusLabel(turn.estado, locale)}
								</Badge>
							</div>
						</li>
					))}
				</ul>
			)}
		</RoleDashboardShell>
	);
}
