import {
	ArrowPathIcon,
	BuildingOffice2Icon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ClipboardDocumentListIcon,
	ClockIcon,
	CubeIcon,
	PaperAirplaneIcon,
	ShieldCheckIcon,
	UserGroupIcon,
} from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input/input.component';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select/select.component';
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import { m } from '@/features/i18n/paraglide/messages';
import { DEFAULT_OVERVIEW_BLOCKS } from '@/features/preferences/ui-preferences';
import { apiGet } from '@/lib/api';
import { gqlMutation, gqlQuery } from '@/lib/graphql-client';
import type { Hospital } from '@/store/auth.store';
import { AdminCreateUserForm } from './admin-create-user.form';
import { AdminRoleRowForm } from './admin-role-row.form';
import type {
	DashboardSection,
	OverviewBlockKey,
	RoleUpdatePayload,
	RoleViewProps,
	UserRole,
} from './dashboard-role.types';
import { RoleDashboardShell } from './role-dashboard-shell';
import { getLocalizedRoleLabel } from './role-label';

interface AdminGqlData {
	users: Array<{
		id: string;
		nombre: string;
		apellido: string;
		email: string;
		rol: UserRole;
	}>;
	patients: Array<{
		id: string;
		usuarioId: string;
		nombre: string;
		apellido: string;
		email: string;
		numeroDocumento?: string | null;
		eps?: string | null;
		tipoSangre?: string | null;
	}>;
	doctors: Array<{
		id: string;
		nombre: string;
		apellido: string;
		email: string;
		numeroRegistro: string;
		especialidadId: number;
		consultorio?: string | null;
	}>;
	nurses: Array<{ id: string }>;
	appointments: Array<{
		id: string;
		pacienteId: string;
		medicoId: string;
		fechaHora: string;
		estado: string;
		motivo?: string | null;
	}>;
	turnosPorHospital: Array<{
		id: string;
		numeroTurno: number;
		estado: string;
		tipo: string;
	}>;
	medicines: Array<{
		id: number;
		nombreComercial: string;
		requiereReceta: boolean;
		activo: boolean;
	}>;
}

interface UpdateUserRoleData {
	updateUser: {
		id: string;
		rol: UserRole;
	};
}

const ADMIN_DASHBOARD_QUERY = `
	query AdminDashboard {
		users {
			id
			nombre
			apellido
			email
			rol
		}
		patients {
			id
			usuarioId
			nombre
			apellido
			email
			numeroDocumento
			eps
			tipoSangre
		}
		doctors {
			id
			nombre
			apellido
			email
			numeroRegistro
			especialidadId
			consultorio
		}
		nurses {
			id
		}
		appointments: appoinments {
			id
			pacienteId
			medicoId
			fechaHora
			estado
			motivo
		}
		turnosPorHospital {
			id
			numeroTurno
			estado
			tipo
		}
		medicines {
			id
			nombreComercial
			requiereReceta
			activo
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

const CREATE_DOCTOR_MUTATION = `
	mutation CreateDoctorFromAdmin($input: CreateDoctorInput!) {
		createDoctor(input: $input) {
			id
		}
	}
`;

const STAFF_PROFILE_LINK_QUERY = `
	query StaffProfileLink {
		doctors {
			id
			usuarioId
			email
		}
		nurses {
			id
			usuarioId
		}
	}
`;

interface StaffProfileLinkData {
	doctors: Array<{
		id: string;
		usuarioId: string;
		email: string;
	}>;
	nurses: Array<{
		id: string;
		usuarioId: string;
	}>;
}

export function AdminDashboardView({
	locale,
	section = 'overview',
	selectedHospitalId,
	overviewBlocks,
}: RoleViewProps) {
	const pageSize = 8;
	const [data, setData] = useState<AdminGqlData | null>(null);
	const [hospitals, setHospitals] = useState<Hospital[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [successMsg, setSuccessMsg] = useState('');
	const [savingUserId, setSavingUserId] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [userSearch, setUserSearch] = useState('');
	const [userSearchInput, setUserSearchInput] = useState('');
	const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
	const [roleFilterInput, setRoleFilterInput] = useState<'ALL' | UserRole>(
		'ALL',
	);
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
			const [gqlResponse, hospitalsResponse] = await Promise.all([
				gqlQuery<AdminGqlData>(ADMIN_DASHBOARD_QUERY),
				apiGet<Hospital[]>('/hospitals').catch(() => []),
			]);
			setData(gqlResponse);
			setHospitals(hospitalsResponse);
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
			hospitals: hospitals.length,
			patients: data?.patients.length ?? 0,
			doctors: data?.doctors.length ?? 0,
			nurses: data?.nurses.length ?? 0,
			appointments: data?.appointments.length ?? 0,
			queue: data?.turnosPorHospital.length ?? 0,
			medicines: data?.medicines.length ?? 0,
		}),
		[data, hospitals.length],
	);

	const usersById = useMemo(
		() => new Map((data?.users ?? []).map((user) => [user.id, user])),
		[data?.users],
	);

	const patientsOnly = useMemo(
		() =>
			(data?.patients ?? []).filter(
				(patient) => usersById.get(patient.usuarioId)?.rol === 'PACIENTE',
			),
		[data?.patients, usersById],
	);

	const filteredUsers = useMemo(() => {
		const term = userSearch.trim().toLowerCase();
		return (data?.users ?? []).filter((user) => {
			const matchesRole = roleFilter === 'ALL' || user.rol === roleFilter;
			if (!matchesRole) return false;
			if (!term) return true;
			const fullName = `${user.nombre} ${user.apellido}`.toLowerCase();
			return fullName.includes(term) || user.email.toLowerCase().includes(term);
		});
	}, [data?.users, roleFilter, userSearch]);

	const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

	const pagedUsers = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredUsers.slice(start, start + pageSize);
	}, [currentPage, filteredUsers]);

	const recentAppointments = useMemo(
		() => [...(data?.appointments ?? [])].slice(0, 6),
		[data?.appointments],
	);

	const queuePreview = useMemo(
		() => [...(data?.turnosPorHospital ?? [])].slice(0, 6),
		[data?.turnosPorHospital],
	);

	const visibleBlocks = useMemo(
		() => new Set(overviewBlocks ?? DEFAULT_OVERVIEW_BLOCKS),
		[overviewBlocks],
	);

	const overviewOrder = useMemo(
		() =>
			overviewBlocks && overviewBlocks.length > 0
				? overviewBlocks
				: [...DEFAULT_OVERVIEW_BLOCKS],
		[overviewBlocks],
	);

	const orderedKpiBlocks = useMemo(
		() =>
			overviewOrder.filter((block) =>
				[
					'kpiUsers',
					'kpiHospitals',
					'kpiPatients',
					'kpiDoctors',
					'kpiNurses',
					'kpiAppointments',
					'kpiQueue',
					'kpiMedicines',
				].includes(block),
			) as OverviewBlockKey[],
		[overviewOrder],
	);

	const orderedCardBlocks = useMemo(
		() =>
			overviewOrder.filter((block) =>
				['recentAppointments', 'queuePreview'].includes(block),
			) as OverviewBlockKey[],
		[overviewOrder],
	);

	const showBlock = useCallback(
		(block: string) =>
			overviewBlocks === undefined ||
			visibleBlocks.has(block as OverviewBlockKey),
		[overviewBlocks, visibleBlocks],
	);

	function renderKpiBlock(block: OverviewBlockKey) {
		switch (block) {
			case 'kpiUsers':
				return (
					<MetricTile
						label={m.dashboardAdminUsersSectionTitle({}, { locale })}
						value={counts.users}
						icon={<UserGroupIcon className="h-4 w-4" />}
					/>
				);
			case 'kpiHospitals':
				return (
					<MetricTile
						label={m.dashboardSidebarHospitals({}, { locale })}
						value={counts.hospitals}
						icon={<BuildingOffice2Icon className="h-4 w-4" />}
					/>
				);
			case 'kpiPatients':
				return (
					<MetricTile
						label={m.authRolePatient({}, { locale })}
						value={counts.patients}
						icon={<UserGroupIcon className="h-4 w-4" />}
					/>
				);
			case 'kpiDoctors':
				return (
					<MetricTile
						label={m.authRoleDoctor({}, { locale })}
						value={counts.doctors}
						icon={<ShieldCheckIcon className="h-4 w-4" />}
					/>
				);
			case 'kpiNurses':
				return (
					<MetricTile
						label={m.authRoleNurse({}, { locale })}
						value={counts.nurses}
						icon={<ShieldCheckIcon className="h-4 w-4" />}
					/>
				);
			case 'kpiAppointments':
				return (
					<MetricTile
						label={m.dashboardSidebarAppointments({}, { locale })}
						value={counts.appointments}
						icon={<ClipboardDocumentListIcon className="h-4 w-4" />}
					/>
				);
			case 'kpiQueue':
				return (
					<MetricTile
						label={m.dashboardSidebarQueue({}, { locale })}
						value={counts.queue}
						icon={<ClockIcon className="h-4 w-4" />}
					/>
				);
			case 'kpiMedicines':
				return (
					<MetricTile
						label={m.dashboardSidebarMedicines({}, { locale })}
						value={counts.medicines}
						icon={<CubeIcon className="h-4 w-4" />}
					/>
				);
			default:
				return null;
		}
	}

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	function roleLabel(role: UserRole) {
		return getLocalizedRoleLabel(role, locale);
	}

	function getStatusLabel(status: string) {
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

	function flash(msg: string) {
		setSuccessMsg(msg);
		setTimeout(() => setSuccessMsg(''), 4000);
	}

	function applyUserFilters() {
		setUserSearch(userSearchInput);
		setRoleFilter(roleFilterInput);
		setCurrentPage(1);
	}

	async function handleRoleUpdate(
		user: AdminGqlData['users'][number],
		payload: RoleUpdatePayload,
	) {
		setSavingUserId(user.id);
		setError('');
		try {
			const isClinicalRole =
				payload.role === 'MEDICO' || payload.role === 'ENFERMERO';
			if (isClinicalRole && !selectedHospitalId) {
				setError(m.authRegisterErrorRequiredHospital({}, { locale }));
				return;
			}

			const input: Record<string, unknown> = {
				id: user.id,
				rol: payload.role,
				...(selectedHospitalId ? { hospitalId: selectedHospitalId } : {}),
			};
			if (payload.medicoData) {
				input.medicoData = payload.medicoData;
			}
			if (payload.enfermeroData) {
				input.enfermeroData = payload.enfermeroData;
			}

			const response = await gqlMutation<UpdateUserRoleData>(
				UPDATE_USER_ROLE_MUTATION,
				{ input },
			);

			const hasDoctorPayload = Boolean(payload.medicoData);
			const hasNursePayload = Boolean(payload.enfermeroData);
			if (hasDoctorPayload || hasNursePayload) {
				const normalizedUserId = String(user.id);
				const normalizedUserEmail = user.email.trim().toLowerCase();

				const hasLinkedProfile = async () => {
					const linkData = await gqlQuery<StaffProfileLinkData>(
						STAFF_PROFILE_LINK_QUERY,
					);

					if (hasDoctorPayload) {
						return linkData.doctors.some(
							(doctor) =>
								String(doctor.usuarioId) === normalizedUserId ||
								doctor.email.trim().toLowerCase() === normalizedUserEmail,
						);
					}

					return linkData.nurses.some(
						(nurse) => String(nurse.usuarioId) === normalizedUserId,
					);
				};

				let linked = await hasLinkedProfile();
				if (!linked && hasDoctorPayload && payload.medicoData) {
					await gqlMutation(CREATE_DOCTOR_MUTATION, {
						input: {
							usuarioId: user.id,
							especialidadId: payload.medicoData.especialidadId,
							numeroRegistro: payload.medicoData.numeroRegistro,
							consultorio: payload.medicoData.consultorio,
						},
					});
					linked = await hasLinkedProfile();
				}

				if (!linked) {
					await gqlMutation<UpdateUserRoleData>(UPDATE_USER_ROLE_MUTATION, {
						input,
					});
					linked = await hasLinkedProfile();
				}

				if (!linked) {
					throw new Error(
						hasDoctorPayload
							? m.dashboardDoctorMissingProfile({}, { locale })
							: m.dashboardNurseMissingProfile({}, { locale }),
					);
				}
			}

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

	const roleManagementSection = (
		<>
			{/* Formulario de creación de cuentas — solo disponible si hay hospital seleccionado */}
			{selectedHospitalId && (
				<AdminCreateUserForm
					locale={locale}
					hospitalId={selectedHospitalId}
					onSuccess={(msg) => {
						// Recargar la tabla de usuarios tras crear uno nuevo
						setLastRoleChange(null);
						flash(msg);
						void loadData();
					}}
				/>
			)}

			<div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
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
					</div>
				</div>
				<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
					<Input
						value={userSearchInput}
						onChange={(event) => setUserSearchInput(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								applyUserFilters();
							}
						}}
						placeholder={m.dashboardAdminSearchPlaceholder({}, { locale })}
					/>
					<Select
						value={roleFilterInput}
						onValueChange={(value) => {
							setRoleFilterInput((value as 'ALL' | UserRole | null) ?? 'ALL');
						}}
					>
						<SelectTrigger className="w-full min-w-55">
							<SelectValue>
								{roleFilterInput === 'ALL'
									? m.dashboardAdminFilterAllRoles({}, { locale })
									: getLocalizedRoleLabel(roleFilterInput, locale)}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem
								value="ALL"
								label={m.dashboardAdminFilterAllRoles({}, { locale })}
							>
								{m.dashboardAdminFilterAllRoles({}, { locale })}
							</SelectItem>
							<SelectItem
								value="ADMIN"
								label={getLocalizedRoleLabel('ADMIN', locale)}
							>
								{getLocalizedRoleLabel('ADMIN', locale)}
							</SelectItem>
							<SelectItem
								value="MEDICO"
								label={getLocalizedRoleLabel('MEDICO', locale)}
							>
								{getLocalizedRoleLabel('MEDICO', locale)}
							</SelectItem>
							<SelectItem
								value="ENFERMERO"
								label={getLocalizedRoleLabel('ENFERMERO', locale)}
							>
								{getLocalizedRoleLabel('ENFERMERO', locale)}
							</SelectItem>
							<SelectItem
								value="RECEPCIONISTA"
								label={getLocalizedRoleLabel('RECEPCIONISTA', locale)}
							>
								{getLocalizedRoleLabel('RECEPCIONISTA', locale)}
							</SelectItem>
							<SelectItem
								value="PACIENTE"
								label={getLocalizedRoleLabel('PACIENTE', locale)}
							>
								{getLocalizedRoleLabel('PACIENTE', locale)}
							</SelectItem>
						</SelectContent>
					</Select>
					<Button
						type="button"
						onClick={applyUserFilters}
						size="icon-sm"
						aria-label={m.dashboardAdminSearchPlaceholder({}, { locale })}
						title={m.dashboardAdminSearchPlaceholder({}, { locale })}
					>
						<PaperAirplaneIcon className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{lastRoleChange && (
				<Alert>
					<AlertDescription>
						{m.dashboardAdminLastRoleChange(
							{
								user: lastRoleChange.userName,
								from: roleLabel(lastRoleChange.fromRole),
								to: roleLabel(lastRoleChange.toRole),
								at: lastRoleChange.timestamp,
							},
							{ locale },
						)}
					</AlertDescription>
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
			) : filteredUsers.length ? (
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
							onSubmit={(payload) => handleRoleUpdate(user, payload)}
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
					{m.dashboardAdminUsersNoMatches({}, { locale })}
				</p>
			)}
		</>
	);

	const sectionTitle = {
		overview: m.dashboardSidebarOverview({}, { locale }),
		hospitals: m.dashboardSidebarHospitals({}, { locale }),
		patients: m.dashboardSidebarPatients({}, { locale }),
		appointments: m.dashboardSidebarAppointments({}, { locale }),
		queue: m.dashboardSidebarQueue({}, { locale }),
		ai: m.dashboardSidebarAi({}, { locale }),
		medicines: m.dashboardSidebarMedicines({}, { locale }),
		doctors: m.dashboardSidebarDoctors({}, { locale }),
		userManagement: m.dashboardSidebarUserManagement({}, { locale }),
		// Admin no usa estas secciones pero el tipo las requiere por exhaustividad
		disponibilidad: m.dashboardSidebarDisponibilidad({}, { locale }),
		historial: m.dashboardSidebarHistorial({}, { locale }),
	} as const satisfies Record<Exclude<DashboardSection, 'settings'>, string>;

	function sectionListItem(
		primary: string,
		secondary: string,
		badge: string,
		key: string,
	) {
		return (
			<div
				key={key}
				className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-2"
			>
				<div className="min-w-0">
					<p className="truncate text-sm font-medium text-foreground">
						{primary}
					</p>
					<p className="truncate text-xs text-muted-foreground">{secondary}</p>
				</div>
				<Badge variant="outline">{badge}</Badge>
			</div>
		);
	}

	function sectionContent() {
		switch (section) {
			case 'hospitals':
				if (loading) return <Skeleton className="h-24 rounded-lg" />;
				if (!hospitals.length) {
					return (
						<p className="text-sm text-muted-foreground">
							{m.dashboardHospitalsEmpty({}, { locale })}
						</p>
					);
				}
				return (
					<div className="space-y-2">
						{hospitals
							.slice(0, 12)
							.map((hospital) =>
								sectionListItem(
									hospital.nombre,
									`${hospital.ciudad} - ${hospital.departamento}`,
									hospital.activo
										? m.dashboardHospitalStatusActive({}, { locale })
										: m.dashboardHospitalStatusInactive({}, { locale }),
									`hospital-${hospital.id}`,
								),
							)}
					</div>
				);
			case 'patients':
				if (loading) return <Skeleton className="h-24 rounded-lg" />;
				if (!patientsOnly.length) {
					return (
						<p className="text-sm text-muted-foreground">
							{m.dashboardPatientsEmptyDescription({}, { locale })}
						</p>
					);
				}
				return (
					<div className="space-y-2">
						{patientsOnly
							.slice(0, 12)
							.map((patient) =>
								sectionListItem(
									`${patient.nombre} ${patient.apellido}`,
									patient.email,
									patient.eps ?? patient.numeroDocumento ?? '-',
									`patient-${patient.id}`,
								),
							)}
					</div>
				);
			case 'appointments':
				if (loading) return <Skeleton className="h-24 rounded-lg" />;
				if (!data?.appointments.length) {
					return (
						<p className="text-sm text-muted-foreground">
							{m.dashboardPatientsEmptyDescription({}, { locale })}
						</p>
					);
				}
				return (
					<div className="space-y-2">
						{data.appointments
							.slice(0, 12)
							.map((appointment) =>
								sectionListItem(
									new Date(appointment.fechaHora).toLocaleString(locale),
									appointment.motivo || appointment.id,
									getStatusLabel(appointment.estado),
									`appointment-${appointment.id}`,
								),
							)}
					</div>
				);
			case 'queue':
				if (loading) return <Skeleton className="h-24 rounded-lg" />;
				if (!data?.turnosPorHospital.length) {
					return (
						<p className="text-sm text-muted-foreground">
							{m.dashboardPatientsEmptyDescription({}, { locale })}
						</p>
					);
				}
				return (
					<div className="space-y-2">
						{data.turnosPorHospital
							.slice(0, 12)
							.map((turn) =>
								sectionListItem(
									`#${turn.numeroTurno}`,
									turn.tipo,
									getStatusLabel(turn.estado),
									`turn-${turn.id}`,
								),
							)}
					</div>
				);
			case 'medicines':
				if (loading) return <Skeleton className="h-24 rounded-lg" />;
				if (!data?.medicines.length) {
					return (
						<p className="text-sm text-muted-foreground">
							{m.dashboardPatientsEmptyDescription({}, { locale })}
						</p>
					);
				}
				return (
					<div className="space-y-2">
						{data.medicines
							.slice(0, 12)
							.map((medicine) =>
								sectionListItem(
									medicine.nombreComercial,
									medicine.requiereReceta ? 'Rx' : 'OTC',
									medicine.activo
										? m.dashboardHospitalStatusActive({}, { locale })
										: m.dashboardHospitalStatusInactive({}, { locale }),
									`medicine-${medicine.id}`,
								),
							)}
					</div>
				);
			case 'doctors':
				if (loading) return <Skeleton className="h-24 rounded-lg" />;
				if (!data?.doctors.length) {
					return (
						<p className="text-sm text-muted-foreground">
							{m.dashboardPatientsEmptyDescription({}, { locale })}
						</p>
					);
				}
				return (
					<div className="space-y-2">
						{data.doctors
							.slice(0, 12)
							.map((doctor) =>
								sectionListItem(
									`${doctor.nombre} ${doctor.apellido}`,
									doctor.email,
									doctor.consultorio ?? String(doctor.especialidadId),
									`doctor-${doctor.id}`,
								),
							)}
					</div>
				);
			case 'userManagement':
				return roleManagementSection;
			default:
				return null;
		}
	}

	return (
		<RoleDashboardShell
			title={sectionTitle[section as Exclude<DashboardSection, 'settings'>]}
			subtitle={m.dashboardOverviewAdminActionsTitle({}, { locale })}
		>
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			{successMsg && (
				<Alert>
					<AlertDescription>{successMsg}</AlertDescription>
				</Alert>
			)}

			{section === 'overview' && (
				<>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{orderedKpiBlocks
							.filter((block) => showBlock(block))
							.map((block) => (
								<div key={block}>{renderKpiBlock(block)}</div>
							))}
					</div>

					<div className="grid gap-4 lg:grid-cols-2">
						{orderedCardBlocks.includes('recentAppointments') &&
							showBlock('recentAppointments') && (
								<Card className="border-border/70">
									<CardHeader className="pb-2">
										<CardTitle className="text-base">
											{m.dashboardSidebarAppointments({}, { locale })}
										</CardTitle>
										<CardDescription>
											{m.dashboardOverviewActiveConnections({}, { locale })}
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-2">
										{loading ? (
											<Skeleton className="h-20 rounded-lg" />
										) : recentAppointments.length ? (
											recentAppointments.map((appointment) => (
												<div
													key={appointment.id}
													className="rounded-lg border border-border/60 bg-muted/20 p-2"
												>
													<div className="flex items-center justify-between gap-2">
														<p className="text-xs text-muted-foreground">
															{appointment.id}
														</p>
														<Badge variant="outline">
															{getStatusLabel(appointment.estado)}
														</Badge>
													</div>
													<p className="text-xs text-foreground">
														{new Date(appointment.fechaHora).toLocaleString(
															locale,
														)}
													</p>
												</div>
											))
										) : (
											<p className="text-xs text-muted-foreground">
												{m.dashboardPatientsEmptyDescription({}, { locale })}
											</p>
										)}
									</CardContent>
								</Card>
							)}

						{orderedCardBlocks.includes('queuePreview') &&
							showBlock('queuePreview') && (
								<Card className="border-border/70">
									<CardHeader className="pb-2">
										<CardTitle className="text-base">
											{m.dashboardSidebarQueue({}, { locale })}
										</CardTitle>
										<CardDescription>
											{m.dashboardOverviewManageHospitals({}, { locale })}
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-2">
										{loading ? (
											<Skeleton className="h-20 rounded-lg" />
										) : queuePreview.length ? (
											queuePreview.map((turn) => (
												<div
													key={turn.id}
													className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-2"
												>
													<div>
														<p className="text-sm font-medium text-foreground">
															#{turn.numeroTurno}
														</p>
														<p className="text-xs text-muted-foreground">
															{turn.tipo}
														</p>
													</div>
													<Badge variant="secondary">
														{getStatusLabel(turn.estado)}
													</Badge>
												</div>
											))
										) : (
											<p className="text-xs text-muted-foreground">
												{m.dashboardPatientsEmptyDescription({}, { locale })}
											</p>
										)}
									</CardContent>
								</Card>
							)}
					</div>

					{!showBlock('kpiUsers') &&
						!showBlock('kpiHospitals') &&
						!showBlock('kpiPatients') &&
						!showBlock('kpiDoctors') &&
						!showBlock('kpiNurses') &&
						!showBlock('kpiAppointments') &&
						!showBlock('kpiQueue') &&
						!showBlock('kpiMedicines') &&
						!showBlock('recentAppointments') &&
						!showBlock('queuePreview') && (
							<p className="text-sm text-muted-foreground">
								{m.dashboardOverviewNoBlocksSelected({}, { locale })}
							</p>
						)}
				</>
			)}

			{section !== 'overview' && (
				<>
					{sectionContent()}
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
				</>
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
	icon: ReactNode;
}) {
	return (
		<div className="rounded-xl border border-border/70 bg-background/80 p-3">
			<div className="mb-2 flex items-start gap-2 text-xs font-medium text-muted-foreground">
				{icon}
				<span className="line-clamp-2 text-left">{label}</span>
			</div>
			<p className="text-2xl font-semibold text-foreground">{value}</p>
		</div>
	);
}

// Daniel Useche
