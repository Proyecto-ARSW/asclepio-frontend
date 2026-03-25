import {
	ArrowPathIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ShieldCheckIcon,
	UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import { m } from '@/features/i18n/paraglide/messages';
import { gqlMutation, gqlQuery } from '@/lib/graphql-client';
import { AdminRoleRowForm } from './admin-role-row.form';
import type { RoleViewProps, UserRole } from './dashboard-role.types';
import { RoleDashboardShell } from './role-dashboard-shell';

interface AdminUsersData {
	users: Array<{
		id: string;
		nombre: string;
		apellido: string;
		email: string;
		rol: UserRole;
	}>;
	patients: Array<{ id: string }>;
	doctors: Array<{ id: string }>;
	nurses: Array<{ id: string }>;
}

interface UpdateUserRoleData {
	updateUser: {
		id: string;
		rol: UserRole;
	};
}

const ADMIN_USERS_QUERY = `
	query AdminDashboardUsers {
		users {
			id
			nombre
			apellido
			email
			rol
		}
		patients {
			id
		}
		doctors {
			id
		}
		nurses {
			id
		}
	}
`;

const UPDATE_USER_ROLE_MUTATION = `
	mutation UpdateRole($input: UpdateUserInput!) {
		updateUser(input: $input) {
			id
			rol
		}
	}
`;

export function AdminDashboardView({ locale }: RoleViewProps) {
	const pageSize = 8;
	const [data, setData] = useState<AdminUsersData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [savingUserId, setSavingUserId] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [lastRoleChange, setLastRoleChange] = useState<{
		userId: string;
		userName: string;
		fromRole: UserRole;
		toRole: UserRole;
		timestamp: string;
	} | null>(null);

	const loadData = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const response = await gqlQuery<AdminUsersData>(ADMIN_USERS_QUERY);
			setData(response);
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

	const counts = useMemo(
		() => ({
			users: data?.users.length ?? 0,
			patients: data?.patients.length ?? 0,
			doctors: data?.doctors.length ?? 0,
			nurses: data?.nurses.length ?? 0,
		}),
		[data],
	);

	const totalPages = Math.max(
		1,
		Math.ceil((data?.users.length ?? 0) / pageSize),
	);

	const pagedUsers = useMemo(() => {
		const allUsers = data?.users ?? [];
		const start = (currentPage - 1) * pageSize;
		return allUsers.slice(start, start + pageSize);
	}, [currentPage, data?.users]);

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	async function handleRoleUpdate(
		user: AdminUsersData['users'][number],
		role: UserRole,
	) {
		setSavingUserId(user.id);
		setError('');
		try {
			const response = await gqlMutation<UpdateUserRoleData>(
				UPDATE_USER_ROLE_MUTATION,
				{ input: { id: user.id, rol: role } },
			);
			setData((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					users: prev.users.map((user) =>
						user.id === response.updateUser.id
							? { ...user, rol: response.updateUser.rol }
							: user,
					),
				};
			});
			setLastRoleChange({
				userId: user.id,
				userName: `${user.nombre} ${user.apellido}`,
				fromRole: user.rol,
				toRole: response.updateUser.rol,
				timestamp: new Date().toLocaleString(locale),
			});
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.authRegisterErrorSubmit({}, { locale }),
			);
		} finally {
			setSavingUserId(null);
		}
	}

	return (
		<RoleDashboardShell
			title={m.dashboardOverviewTitle({}, { locale })}
			subtitle={m.dashboardOverviewAdminActionsTitle({}, { locale })}
		>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<MetricTile
					label={m.authRoleAdmin({}, { locale })}
					value={counts.users}
					icon={<UserGroupIcon className="h-4 w-4" />}
				/>
				<MetricTile
					label={m.authRolePatient({}, { locale })}
					value={counts.patients}
					icon={<UserGroupIcon className="h-4 w-4" />}
				/>
				<MetricTile
					label={m.authRoleDoctor({}, { locale })}
					value={counts.doctors}
					icon={<ShieldCheckIcon className="h-4 w-4" />}
				/>
				<MetricTile
					label={m.authRoleNurse({}, { locale })}
					value={counts.nurses}
					icon={<ShieldCheckIcon className="h-4 w-4" />}
				/>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-sm font-medium text-foreground">
					{m.dashboardAdminUsersSectionTitle({}, { locale })}
				</p>
				<div className="flex items-center gap-2">
					<Badge variant="outline">
						{m.dashboardAdminUsersPageIndicator(
							{ current: String(currentPage), total: String(totalPages) },
							{ locale },
						)}
					</Badge>
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
			</div>

			{lastRoleChange && (
				<Alert>
					<AlertDescription>
						{m.dashboardAdminLastRoleChange(
							{
								user: lastRoleChange.userName,
								from: lastRoleChange.fromRole,
								to: lastRoleChange.toRole,
								at: lastRoleChange.timestamp,
							},
							{ locale },
						)}
					</AlertDescription>
				</Alert>
			)}

			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{loading ? (
				<div className="space-y-3">
					{[
						'admin-role-skeleton-1',
						'admin-role-skeleton-2',
						'admin-role-skeleton-3',
						'admin-role-skeleton-4',
					].map((key) => (
						<Skeleton key={key} className="h-30 rounded-xl" />
					))}
				</div>
			) : data?.users.length ? (
				<div className="space-y-3">
					{pagedUsers.map((user) => (
						<AdminRoleRowForm
							key={user.id}
							user={user}
							locale={locale}
							saving={savingUserId === user.id}
							lastUpdatedAt={
								lastRoleChange?.userId === user.id
									? lastRoleChange.timestamp
									: undefined
							}
							onSubmit={(nextRole) => handleRoleUpdate(user, nextRole)}
						/>
					))}
					{totalPages > 1 && (
						<div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/20 p-2">
							<Button
								type="button"
								variant="outline"
								disabled={currentPage === 1}
								onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
							>
								<ChevronLeftIcon className="mr-2 h-4 w-4" />
								{m.dashboardAdminPaginationPrev({}, { locale })}
							</Button>
							<p className="text-xs text-muted-foreground sm:text-sm">
								{m.dashboardAdminUsersPageIndicator(
									{ current: String(currentPage), total: String(totalPages) },
									{ locale },
								)}
							</p>
							<Button
								type="button"
								variant="outline"
								disabled={currentPage === totalPages}
								onClick={() =>
									setCurrentPage((prev) => Math.min(totalPages, prev + 1))
								}
							>
								{m.dashboardAdminPaginationNext({}, { locale })}
								<ChevronRightIcon className="ml-2 h-4 w-4" />
							</Button>
						</div>
					)}
				</div>
			) : (
				<p className="text-sm text-muted-foreground">
					{m.dashboardPatientsEmptyDescription({}, { locale })}
				</p>
			)}
		</RoleDashboardShell>
	);
}

function MetricTile({
	label,
	value,
	icon,
}: {
	label: string;
	value: number;
	icon: React.ReactNode;
}) {
	return (
		<div className="rounded-xl border border-border/70 bg-background/80 p-3">
			<div className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
				{icon}
				{label}
			</div>
			<p className="text-2xl font-semibold text-foreground">{value}</p>
		</div>
	);
}
