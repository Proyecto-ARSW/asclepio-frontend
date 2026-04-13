import {
	ArrowPathIcon,
	BuildingOffice2Icon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ClipboardDocumentListIcon,
	ClockIcon,
	CubeIcon,
	PaperAirplaneIcon,
	PlusIcon,
	ShieldCheckIcon,
	TrashIcon,
	UserGroupIcon,
} from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	type AvailabilitySlot,
	AvailabilityWeekView,
} from '@/components/medical/availability-week-view';
import { CreateHospitalModal } from '@/components/medical/create-hospital-modal';
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
import { Switch } from '@/components/ui/switch/switch.component';
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
		usuarioId: string;
		nombre: string;
		apellido: string;
		email: string;
		numeroRegistro: string;
		especialidadId: number;
		consultorio?: string | null;
	}>;
	nurses: Array<{
		id: string;
		usuarioId: string;
		numeroRegistro: string;
		nivelFormacion: number;
		areaEspecializacion: number;
		certificacionTriage: boolean;
	}>;
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
		pacienteId: string;
		hospitalId?: number | null;
		numeroTurno: number;
		estado: string;
		tipo: string;
	}>;
	medicines: Array<{
		id: number;
		nombreComercial: string;
		nombreGenerico?: string | null;
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
			usuarioId
			nombre
			apellido
			email
			numeroRegistro
			especialidadId
			consultorio
		}
		nurses {
			id
			usuarioId
			numeroRegistro
			nivelFormacion
			areaEspecializacion
			certificacionTriage
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
			pacienteId
			hospitalId
			numeroTurno
			estado
			tipo
		}
		medicines {
			id
			nombreComercial
			nombreGenerico
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

const CALL_NEXT_TURN = `
	mutation AdminCallNextTurn {
		llamarSiguienteTurno {
			id
			numeroTurno
			estado
			tipo
		}
	}
`;

const CREATE_DOCTOR_PROFILE_MUTATION = `
	mutation AdminCreateDoctorProfile($input: CreateDoctorInput!) {
		createDoctor(input: $input) {
			id
		}
	}
`;

const UPDATE_DOCTOR_PROFILE_MUTATION = `
	mutation AdminUpdateDoctorProfile($input: UpdateDoctorInput!) {
		updateDoctor(input: $input) {
			id
		}
	}
`;

const CREATE_NURSE_PROFILE_MUTATION = `
	mutation AdminCreateNurseProfile($input: CreateNurseInput!) {
		createNurse(input: $input) {
			id
		}
	}
`;

const UPDATE_NURSE_PROFILE_MUTATION = `
	mutation AdminUpdateNurseProfile($input: UpdateNurseInput!) {
		updateNurse(input: $input) {
			id
		}
	}
`;

const DEFAULT_SPECIALTY_OPTIONS = [
	{ id: 1, nombre: 'Medicina General' },
	{ id: 2, nombre: 'Cardiologia' },
	{ id: 3, nombre: 'Pediatria' },
	{ id: 4, nombre: 'Dermatologia' },
	{ id: 5, nombre: 'Ginecologia' },
	{ id: 6, nombre: 'Neurologia' },
	{ id: 7, nombre: 'Ortopedia' },
];

const ATTEND_TURN = `
	mutation AdminAttendTurn($id: ID!) {
		atenderTurno(id: $id) {
			id
			estado
		}
	}
`;

const CANCEL_TURN = `
	mutation AdminCancelTurn($id: ID!) {
		cancelarTurno(id: $id) {
			id
			estado
		}
	}
`;

const CANCEL_APPOINTMENT = `
	mutation AdminCancelAppointment($input: CancelAppoinmentInput!) {
		cancelAppoinment(input: $input) {
			id
			estado
		}
	}
`;

const REMOVE_USER = `
	mutation AdminRemoveUser($id: ID!) {
		removeUser(id: $id) {
			id
			activo
		}
	}
`;

const REMOVE_MEDICINE = `
	mutation AdminRemoveMedicine($id: Int!) {
		removeMedicine(id: $id) {
			id
			activo
		}
	}
`;

const CREATE_MEDICINE = `
	mutation AdminCreateMedicine($input: CreateMedicineInput!) {
		createMedicine(input: $input) {
			id
			nombreComercial
			nombreGenerico
			presentacion
			requiereReceta
			activo
		}
	}
`;

// El backend expone `doctors(hospitalId: Int)` y `nurses` (sin filtro).
// Los campos nombre/apellido están aplanados directamente en la entidad,
// no dentro de un sub-objeto `usuario`.
const ADMIN_DOCTORS_BY_HOSPITAL_QUERY = `
	query AdminDoctorsByHospital($hospitalId: Int!) {
		doctors(hospitalId: $hospitalId) {
			id usuarioId nombre apellido numeroRegistro especialidadId consultorio
		}
	}
`;

const ADMIN_ALL_NURSES_QUERY = `
	query AdminAllNurses {
		nurses {
			id usuarioId nombre apellido numeroRegistro nivelFormacion
		}
	}
`;

const DOCTOR_DISPONIBILIDAD_QUERY = `
	query AdminDoctorDisponibilidad($medicoId: ID!) {
		disponibilidadesByDoctor(medicoId: $medicoId) {
			id diaSemana horaInicio horaFin duracionCita activo
		}
	}
`;

const NURSE_DISPONIBILIDAD_QUERY = `
	query AdminNurseDisponibilidad($enfermeroId: ID!) {
		disponibilidadesByNurse(enfermeroId: $enfermeroId) {
			id diaSemana horaInicio horaFin activo
		}
	}
`;

interface StaffMember {
	id: string;
	usuarioId: string;
	type: 'doctor' | 'nurse';
	nombre: string;
	apellido: string;
}

export function AdminDashboardView({
	user,
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
	const [sectionActionLoading, setSectionActionLoading] = useState<
		string | null
	>(null);
	const [hospitalModalOpen, setHospitalModalOpen] = useState(false);
	const [medicineFormOpen, setMedicineFormOpen] = useState(false);
	const [newMedicine, setNewMedicine] = useState({
		nombreComercial: '',
		nombreGenerico: '',
		presentacion: '',
		requiereReceta: true,
	});
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

	// ── Estado para la sección de disponibilidad del personal ──
	const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
	const [staffSearch, setStaffSearch] = useState('');
	const [staffFilter, setStaffFilter] = useState<'all' | 'doctor' | 'nurse'>(
		'all',
	);
	const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
	const [selectedStaffType, setSelectedStaffType] = useState<
		'doctor' | 'nurse' | null
	>(null);
	const [staffSlots, setStaffSlots] = useState<AvailabilitySlot[]>([]);
	const [staffSlotsLoading, setStaffSlotsLoading] = useState(false);
	const [staffLoaded, setStaffLoaded] = useState(false);

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

	// Cargar médicos y enfermeros al entrar en disponibilidad.
	// doctors(hospitalId) filtra por hospital; nurses no soporta filtro.
	useEffect(() => {
		if (section !== 'disponibilidad') return;
		if (!selectedHospitalId || staffLoaded) return;
		setStaffLoaded(true);

		Promise.all([
			gqlQuery<{
				doctors: Array<{
					id: string;
					usuarioId: string;
					nombre: string;
					apellido: string;
				}>;
			}>(ADMIN_DOCTORS_BY_HOSPITAL_QUERY, {
				hospitalId: selectedHospitalId,
			}),
			gqlQuery<{
				nurses: Array<{
					id: string;
					usuarioId: string;
					nombre: string;
					apellido: string;
				}>;
			}>(ADMIN_ALL_NURSES_QUERY),
		])
			.then(([docRes, nurseRes]) => {
				const docs: StaffMember[] = docRes.doctors.map((d) => ({
					id: d.id,
					usuarioId: d.usuarioId,
					type: 'doctor',
					nombre: d.nombre,
					apellido: d.apellido,
				}));
				const nurses: StaffMember[] = nurseRes.nurses.map((n) => ({
					id: n.id,
					usuarioId: n.usuarioId,
					type: 'nurse',
					nombre: n.nombre,
					apellido: n.apellido,
				}));
				setStaffMembers([...docs, ...nurses]);
			})
			.catch(() => {});
	}, [section, selectedHospitalId, staffLoaded]);

	// Cargar disponibilidad del staff seleccionado
	useEffect(() => {
		if (!selectedStaffId || !selectedStaffType) {
			setStaffSlots([]);
			return;
		}
		setStaffSlotsLoading(true);
		const query =
			selectedStaffType === 'doctor'
				? DOCTOR_DISPONIBILIDAD_QUERY
				: NURSE_DISPONIBILIDAD_QUERY;
		const variables =
			selectedStaffType === 'doctor'
				? { medicoId: selectedStaffId }
				: { enfermeroId: selectedStaffId };
		const dataKey =
			selectedStaffType === 'doctor'
				? 'disponibilidadesByDoctor'
				: 'disponibilidadesByNurse';

		gqlQuery<Record<string, AvailabilitySlot[]>>(query, variables)
			.then((res) => setStaffSlots(res[dataKey] ?? []))
			.catch(() => setStaffSlots([]))
			.finally(() => setStaffSlotsLoading(false));
	}, [selectedStaffId, selectedStaffType]);

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

	const doctorProfileByUserId = useMemo(
		() =>
			new Map(
				(data?.doctors ?? []).map((doctor) => [doctor.usuarioId, doctor]),
			),
		[data?.doctors],
	);

	const nurseProfileByUserId = useMemo(
		() =>
			new Map((data?.nurses ?? []).map((nurse) => [nurse.usuarioId, nurse])),
		[data?.nurses],
	);

	const specialtyOptions = useMemo(() => {
		const merged = new Map<number, string>(
			DEFAULT_SPECIALTY_OPTIONS.map((item) => [item.id, item.nombre]),
		);

		for (const doctor of data?.doctors ?? []) {
			if (!merged.has(doctor.especialidadId)) {
				merged.set(
					doctor.especialidadId,
					locale === 'es'
						? `Especialidad ${doctor.especialidadId}`
						: `Specialty ${doctor.especialidadId}`,
				);
			}
		}

		for (const nurse of data?.nurses ?? []) {
			if (!merged.has(nurse.areaEspecializacion)) {
				merged.set(
					nurse.areaEspecializacion,
					locale === 'es'
						? `Especialidad ${nurse.areaEspecializacion}`
						: `Specialty ${nurse.areaEspecializacion}`,
				);
			}
		}

		return [...merged.entries()]
			.sort((a, b) => a[0] - b[0])
			.map(([id, nombre]) => ({ id, nombre }));
	}, [data?.doctors, data?.nurses, locale]);

	const specialtyById = useMemo(
		() =>
			new Map(specialtyOptions.map((specialty) => [specialty.id, specialty])),
		[specialtyOptions],
	);

	const patientById = useMemo(
		() =>
			new Map((data?.patients ?? []).map((patient) => [patient.id, patient])),
		[data?.patients],
	);

	const doctorById = useMemo(
		() => new Map((data?.doctors ?? []).map((doctor) => [doctor.id, doctor])),
		[data?.doctors],
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

	const hospitalTurns = useMemo(() => data?.turnosPorHospital ?? [], [data]);

	const currentTurn = useMemo(
		() =>
			[...hospitalTurns]
				.filter((turn) => /^EN_CONSULTA$/i.test(turn.estado))
				.sort((a, b) => b.numeroTurno - a.numeroTurno)[0],
		[hospitalTurns],
	);

	const turnHistory = useMemo(
		() =>
			[...hospitalTurns]
				.filter((turn) =>
					/^(ATENDIDO|ATENDIDA|CANCELADO|CANCELADA)$/i.test(turn.estado),
				)
				.sort((a, b) => b.numeroTurno - a.numeroTurno)
				.slice(0, 6),
		[hospitalTurns],
	);

	const upcomingTurns = useMemo(
		() =>
			[...hospitalTurns]
				.filter((turn) => /^(EN_ESPERA|EN_CONSULTA)$/i.test(turn.estado))
				.sort((a, b) => a.numeroTurno - b.numeroTurno),
		[hospitalTurns],
	);

	const nextUpcomingTurn = useMemo(() => upcomingTurns[0], [upcomingTurns]);

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
			case 'EN_ESPERA':
				return m.dashboardStatusWaiting({}, { locale });
			case 'CONFIRMADA':
				return m.dashboardStatusConfirmed({}, { locale });
			case 'EN_CONSULTA':
				return m.dashboardStatusInConsultation({}, { locale });
			case 'CANCELADA':
			case 'CANCELADO':
				return m.dashboardStatusCancelled({}, { locale });
			case 'ATENDIDA':
			case 'ATENDIDO':
				return m.dashboardStatusAttended({}, { locale });
			default:
				return status;
		}
	}

	function isTurnClosed(status: string) {
		return /^(ATENDIDO|ATENDIDA|CANCELADO|CANCELADA)$/i.test(status);
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
		targetUser: AdminGqlData['users'][number],
		payload: RoleUpdatePayload,
	) {
		setSavingUserId(targetUser.id);
		setError('');
		try {
			const isClinicalRole =
				payload.role === 'MEDICO' || payload.role === 'ENFERMERO';
			if (isClinicalRole && !selectedHospitalId) {
				setError(m.authRegisterErrorRequiredHospital({}, { locale }));
				return;
			}

			const input: Record<string, unknown> = {
				id: targetUser.id,
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

			if (payload.medicoData) {
				const currentDoctorProfile = doctorProfileByUserId.get(targetUser.id);
				if (currentDoctorProfile) {
					await gqlMutation(UPDATE_DOCTOR_PROFILE_MUTATION, {
						input: {
							id: currentDoctorProfile.id,
							numeroRegistro: payload.medicoData.numeroRegistro,
							especialidadId: payload.medicoData.especialidadId,
							consultorio: payload.medicoData.consultorio,
						},
					});
				} else {
					await gqlMutation(CREATE_DOCTOR_PROFILE_MUTATION, {
						input: {
							usuarioId: targetUser.id,
							numeroRegistro: payload.medicoData.numeroRegistro,
							especialidadId: payload.medicoData.especialidadId,
							consultorio: payload.medicoData.consultorio,
						},
					});
				}
			}

			if (payload.enfermeroData) {
				const currentNurseProfile = nurseProfileByUserId.get(targetUser.id);
				if (currentNurseProfile) {
					await gqlMutation(UPDATE_NURSE_PROFILE_MUTATION, {
						input: {
							id: currentNurseProfile.id,
							numeroRegistro: payload.enfermeroData.numeroRegistro,
							nivelFormacion: payload.enfermeroData.nivelFormacion,
							areaEspecializacion: payload.enfermeroData.areaEspecializacion,
							certificacionTriage: payload.enfermeroData.certificacionTriage,
						},
					});
				} else {
					await gqlMutation(CREATE_NURSE_PROFILE_MUTATION, {
						input: {
							usuarioId: targetUser.id,
							numeroRegistro: payload.enfermeroData.numeroRegistro,
							nivelFormacion: payload.enfermeroData.nivelFormacion,
							areaEspecializacion: payload.enfermeroData.areaEspecializacion,
							certificacionTriage: payload.enfermeroData.certificacionTriage,
						},
					});
				}
			}

			await loadData();
			setLastRoleChange({
				userId: targetUser.id,
				userName: `${targetUser.nombre} ${targetUser.apellido}`,
				fromRole: targetUser.rol,
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

	async function handleDeleteUser(targetUser: AdminGqlData['users'][number]) {
		setSavingUserId(targetUser.id);
		setError('');
		try {
			await gqlMutation(REMOVE_USER, { id: targetUser.id });
			await loadData();
			flash(m.dashboardActionSuccess({}, { locale }));
		} catch (err) {
			setError(
				err instanceof Error ? err.message : m.rootErrorTitle({}, { locale }),
			);
		} finally {
			setSavingUserId(null);
		}
	}

	async function handleCallNextTurn() {
		setSectionActionLoading('call-next');
		setError('');
		try {
			const response = await gqlMutation<{
				llamarSiguienteTurno: { id: string; numeroTurno: number };
			}>(CALL_NEXT_TURN);
			flash(
				m.dashboardTurnCalled(
					{ number: String(response.llamarSiguienteTurno.numeroTurno) },
					{ locale },
				),
			);
			await loadData();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.rootErrorUnexpected({}, { locale }),
			);
		} finally {
			setSectionActionLoading(null);
		}
	}

	async function handleAttendTurn(id: string) {
		setSectionActionLoading(`attend-${id}`);
		setError('');
		try {
			await gqlMutation(ATTEND_TURN, { id });
			flash(m.dashboardActionSuccess({}, { locale }));
			await loadData();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.rootErrorUnexpected({}, { locale }),
			);
		} finally {
			setSectionActionLoading(null);
		}
	}

	async function handleCancelTurn(id: string) {
		setSectionActionLoading(`cancel-turn-${id}`);
		setError('');
		try {
			await gqlMutation(CANCEL_TURN, { id });
			flash(m.dashboardActionSuccess({}, { locale }));
			await loadData();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.rootErrorUnexpected({}, { locale }),
			);
		} finally {
			setSectionActionLoading(null);
		}
	}

	async function handleCancelAppointment(id: string) {
		setSectionActionLoading(`cancel-appointment-${id}`);
		setError('');
		try {
			await gqlMutation(CANCEL_APPOINTMENT, {
				input: {
					id,
					canceladaPor: user.id,
					motivoCancelacion: m.dashboardDoctorCancellationReason(
						{},
						{ locale },
					),
				},
			});
			flash(m.dashboardActionSuccess({}, { locale }));
			await loadData();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.rootErrorUnexpected({}, { locale }),
			);
		} finally {
			setSectionActionLoading(null);
		}
	}

	async function handleRemoveMedicine(id: number) {
		setSectionActionLoading(`remove-medicine-${id}`);
		setError('');
		try {
			await gqlMutation(REMOVE_MEDICINE, { id });
			flash(m.dashboardActionSuccess({}, { locale }));
			await loadData();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.rootErrorUnexpected({}, { locale }),
			);
		} finally {
			setSectionActionLoading(null);
		}
	}

	async function handleCreateMedicine() {
		if (!newMedicine.nombreComercial.trim()) {
			setError(m.dashboardMedicinesNameRequired({}, { locale }));
			return;
		}

		setSectionActionLoading('create-medicine');
		setError('');
		try {
			await gqlMutation(CREATE_MEDICINE, {
				input: {
					nombreComercial: newMedicine.nombreComercial.trim(),
					nombreGenerico: newMedicine.nombreGenerico.trim() || undefined,
					presentacion: newMedicine.presentacion.trim() || undefined,
					requiereReceta: newMedicine.requiereReceta,
				},
			});

			setNewMedicine({
				nombreComercial: '',
				nombreGenerico: '',
				presentacion: '',
				requiereReceta: true,
			});
			setMedicineFormOpen(false);
			flash(m.dashboardActionSuccess({}, { locale }));
			await loadData();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.rootErrorUnexpected({}, { locale }),
			);
		} finally {
			setSectionActionLoading(null);
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
					{pagedUsers.map((u) => (
						<div key={u.id} className="space-y-1">
							<AdminRoleRowForm
								user={u}
								locale={locale}
								doctorProfile={doctorProfileByUserId.get(u.id)}
								nurseProfile={nurseProfileByUserId.get(u.id)}
								doctorProfilesCount={data?.doctors.length ?? 0}
								nurseProfilesCount={data?.nurses.length ?? 0}
								specialties={specialtyOptions}
								saving={savingUserId === u.id}
								lastUpdatedAt={
									lastRoleChange?.userId === u.id
										? lastRoleChange.timestamp
										: undefined
								}
								onSubmit={(payload) => handleRoleUpdate(u, payload)}
							/>
							<Button
								type="button"
								variant="destructive"
								size="sm"
								disabled={savingUserId === u.id || u.id === user.id}
								onClick={() => {
									if (
										window.confirm(
											m.dashboardAdminDeleteUserConfirm(
												{ name: `${u.nombre} ${u.apellido}` },
												{ locale },
											),
										)
									) {
										void handleDeleteUser(u);
									}
								}}
								className="gap-1 text-xs"
							>
								<TrashIcon className="h-3.5 w-3.5" />
								{m.dashboardAdminDeleteUserAction({}, { locale })}
							</Button>
						</div>
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
		consentimientos: m.dashboardSidebarConsentimientos({}, { locale }),
		recetas: m.dashboardSidebarRecetas({}, { locale }),
		profile: m.dashboardSidebarProfile({}, { locale }),
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
				return (
					<div className="space-y-3">
						<div className="flex justify-end">
							<Button
								type="button"
								onClick={() => setHospitalModalOpen(true)}
								className="gap-2"
							>
								<PlusIcon className="h-4 w-4" />
								{m.dashboardHospitalsCreate({}, { locale })}
							</Button>
						</div>
						{loading ? (
							<Skeleton className="h-24 rounded-lg" />
						) : hospitals.length ? (
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
						) : (
							<p className="text-sm text-muted-foreground">
								{m.dashboardHospitalsEmpty({}, { locale })}
							</p>
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
						{data.appointments.slice(0, 20).map((appointment) => {
							const patient = patientById.get(appointment.pacienteId);
							const doctor = doctorById.get(appointment.medicoId);
							const isClosed =
								appointment.estado === 'CANCELADA' ||
								appointment.estado === 'ATENDIDA';
							return (
								<div
									key={`appointment-${appointment.id}`}
									className="rounded-lg border border-border/60 bg-muted/20 p-3"
								>
									<div className="flex flex-wrap items-start justify-between gap-2">
										<div className="min-w-0">
											<p className="truncate text-sm font-medium text-foreground">
												{new Date(appointment.fechaHora).toLocaleString(locale)}
											</p>
											<p className="truncate text-xs text-muted-foreground">
												{patient
													? `${patient.nombre} ${patient.apellido}`
													: appointment.pacienteId}
												{' - '}
												{doctor
													? `${doctor.nombre} ${doctor.apellido}`
													: appointment.medicoId}
											</p>
											<p className="truncate text-xs text-muted-foreground">
												{appointment.motivo || appointment.id}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant="outline">
												{getStatusLabel(appointment.estado)}
											</Badge>
											<Button
												type="button"
												variant="outline"
												disabled={
													isClosed ||
													sectionActionLoading ===
														`cancel-appointment-${appointment.id}`
												}
												onClick={() => handleCancelAppointment(appointment.id)}
											>
												{m.dashboardDoctorCancelAppointment({}, { locale })}
											</Button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				);
			case 'queue':
				if (loading) return <Skeleton className="h-24 rounded-lg" />;
				return (
					<div className="space-y-3">
						<div className="flex justify-end">
							<Button
								type="button"
								onClick={handleCallNextTurn}
								disabled={sectionActionLoading === 'call-next'}
								className="gap-2"
							>
								{sectionActionLoading === 'call-next'
									? m.dashboardActionCreating({}, { locale })
									: m.dashboardReceptionistCallNext({}, { locale })}
							</Button>
						</div>
						{!hospitalTurns.length ? (
							<p className="text-sm text-muted-foreground">
								{m.dashboardPatientsEmptyDescription({}, { locale })}
							</p>
						) : (
							<>
								<Card className="border-border/70">
									<CardHeader className="pb-2">
										<CardTitle className="text-base">
											{m.dashboardSidebarQueue({}, { locale })}
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3">
										<div className="grid gap-3 sm:grid-cols-2">
											<div className="rounded-lg border border-border/70 bg-muted/20 p-3">
												<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
													{m.dashboardPatientCalledTurnLabel({}, { locale })}
												</p>
												<p className="mt-1 text-2xl font-bold tabular-nums text-primary">
													{currentTurn ? `#${currentTurn.numeroTurno}` : '--'}
												</p>
												<p className="mt-1 text-xs text-muted-foreground">
													{currentTurn
														? `${currentTurn.tipo} - ${getStatusLabel(currentTurn.estado)}`
														: m.dashboardPatientNoCalledTurnInfo(
																{},
																{ locale },
															)}
												</p>
											</div>

											<div className="rounded-lg border border-border/70 bg-background/90 p-3">
												<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
													{m.dashboardStatusWaiting({}, { locale })}
												</p>
												<p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
													{nextUpcomingTurn
														? `#${nextUpcomingTurn.numeroTurno}`
														: '--'}
												</p>
												<p className="mt-1 text-xs text-muted-foreground">
													{nextUpcomingTurn
														? `${nextUpcomingTurn.tipo} - ${getStatusLabel(nextUpcomingTurn.estado)}`
														: m.dashboardPatientsEmptyDescription(
																{},
																{ locale },
															)}
												</p>
											</div>
										</div>

										{turnHistory.length > 0 && (
											<div className="space-y-2 border-t border-border/60 pt-3">
												<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
													{m.dashboardSidebarHistorial({}, { locale })}
												</p>
												<ul className="space-y-1.5">
													{turnHistory.map((turn) => (
														<li
															key={turn.id}
															className="flex items-center justify-between rounded-md bg-background/80 px-2 py-1.5"
														>
															<span className="text-sm font-semibold tabular-nums text-foreground">
																#{turn.numeroTurno}
															</span>
															<span className="text-xs text-muted-foreground">
																{getStatusLabel(turn.estado)}
															</span>
														</li>
													))}
												</ul>
											</div>
										)}
									</CardContent>
								</Card>

								<div className="space-y-2">
									<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
										{m.dashboardStatusWaiting({}, { locale })}
									</p>
									{upcomingTurns.length === 0 ? (
										<p className="text-sm text-muted-foreground">
											{m.dashboardPatientsEmptyDescription({}, { locale })}
										</p>
									) : (
										upcomingTurns.slice(0, 20).map((turn) => {
											const patient = patientById.get(turn.pacienteId);
											const canMutate = !isTurnClosed(turn.estado);
											return (
												<div
													key={`turn-${turn.id}`}
													className="rounded-lg border border-border/60 bg-muted/20 p-3"
												>
													<div className="flex flex-wrap items-start justify-between gap-2">
														<div className="min-w-0">
															<p className="truncate text-sm font-medium text-foreground">
																#{turn.numeroTurno} - {turn.tipo}
															</p>
															<p className="truncate text-xs text-muted-foreground">
																{patient
																	? `${patient.nombre} ${patient.apellido}`
																	: turn.pacienteId}
															</p>
														</div>
														<div className="flex flex-wrap items-center gap-2">
															<Badge variant="outline">
																{getStatusLabel(turn.estado)}
															</Badge>
															<Button
																type="button"
																variant="outline"
																disabled={
																	!canMutate ||
																	sectionActionLoading === `attend-${turn.id}`
																}
																onClick={() => handleAttendTurn(turn.id)}
															>
																{m.dashboardReceptionistAttendTurn(
																	{},
																	{ locale },
																)}
															</Button>
															<Button
																type="button"
																variant="outline"
																disabled={
																	!canMutate ||
																	sectionActionLoading ===
																		`cancel-turn-${turn.id}`
																}
																onClick={() => handleCancelTurn(turn.id)}
															>
																{m.dashboardReceptionistCancelTurn(
																	{},
																	{ locale },
																)}
															</Button>
														</div>
													</div>
												</div>
											);
										})
									)}
								</div>
							</>
						)}
					</div>
				);
			case 'medicines':
				if (loading) return <Skeleton className="h-24 rounded-lg" />;
				return (
					<div className="space-y-2">
						<div className="flex justify-end">
							<Button
								type="button"
								onClick={() => setMedicineFormOpen((prev) => !prev)}
								className="gap-2"
							>
								<PlusIcon className="h-4 w-4" />
								{m.dashboardMedicinesCreateButton({}, { locale })}
							</Button>
						</div>

						{medicineFormOpen && (
							<div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
								<p className="text-sm font-medium text-foreground">
									{m.dashboardMedicinesFormTitle({}, { locale })}
								</p>
								<div className="grid gap-2 sm:grid-cols-2">
									<div className="space-y-1">
										<label
											htmlFor="admin-medicine-commercial-name"
											className="text-xs font-medium text-muted-foreground"
										>
											{m.dashboardMedicinesFieldCommercialName({}, { locale })}
										</label>
										<Input
											id="admin-medicine-commercial-name"
											value={newMedicine.nombreComercial}
											onChange={(event) =>
												setNewMedicine((prev) => ({
													...prev,
													nombreComercial: event.target.value,
												}))
											}
										/>
									</div>
									<div className="space-y-1">
										<label
											htmlFor="admin-medicine-generic-name"
											className="text-xs font-medium text-muted-foreground"
										>
											{m.dashboardMedicinesFieldGenericName({}, { locale })}
										</label>
										<Input
											id="admin-medicine-generic-name"
											value={newMedicine.nombreGenerico}
											onChange={(event) =>
												setNewMedicine((prev) => ({
													...prev,
													nombreGenerico: event.target.value,
												}))
											}
										/>
									</div>
									<div className="space-y-1">
										<label
											htmlFor="admin-medicine-presentation"
											className="text-xs font-medium text-muted-foreground"
										>
											{m.dashboardMedicinesFieldPresentation({}, { locale })}
										</label>
										<Input
											id="admin-medicine-presentation"
											value={newMedicine.presentacion}
											onChange={(event) =>
												setNewMedicine((prev) => ({
													...prev,
													presentacion: event.target.value,
												}))
											}
										/>
									</div>
									<div className="sm:col-span-2">
										<div className="flex h-10 items-center justify-between rounded-md border border-input px-3">
											<label
												htmlFor="admin-medicine-requires-prescription"
												className="text-xs font-medium text-muted-foreground"
											>
												{m.dashboardMedicinesFieldRequiresPrescription(
													{},
													{ locale },
												)}
											</label>
											<Switch
												id="admin-medicine-requires-prescription"
												checked={newMedicine.requiereReceta}
												onCheckedChange={(checked) =>
													setNewMedicine((prev) => ({
														...prev,
														requiereReceta: Boolean(checked),
													}))
												}
											/>
										</div>
									</div>
								</div>
								<div className="flex gap-2">
									<Button
										type="button"
										onClick={handleCreateMedicine}
										disabled={sectionActionLoading === 'create-medicine'}
									>
										{sectionActionLoading === 'create-medicine'
											? m.dashboardActionCreating({}, { locale })
											: m.dashboardMedicinesCreateSubmit({}, { locale })}
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={() => setMedicineFormOpen(false)}
									>
										{m.dashboardMedicinesCreateCancel({}, { locale })}
									</Button>
								</div>
							</div>
						)}

						{!data?.medicines.length && (
							<p className="text-sm text-muted-foreground">
								{m.dashboardPatientsEmptyDescription({}, { locale })}
							</p>
						)}

						{(data?.medicines ?? []).slice(0, 20).map((medicine) => (
							<div
								key={`medicine-${medicine.id}`}
								className="rounded-lg border border-border/60 bg-muted/20 p-3"
							>
								<div className="flex flex-wrap items-start justify-between gap-2">
									<div className="min-w-0">
										<p className="truncate text-sm font-medium text-foreground">
											{medicine.nombreComercial}
										</p>
										<p className="truncate text-xs text-muted-foreground">
											{medicine.nombreGenerico || String(medicine.id)}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="outline">
											{medicine.requiereReceta ? 'Rx' : 'OTC'}
										</Badge>
										<Badge variant="outline">
											{medicine.activo
												? m.dashboardHospitalStatusActive({}, { locale })
												: m.dashboardHospitalStatusInactive({}, { locale })}
										</Badge>
										<Button
											type="button"
											variant="outline"
											disabled={
												!medicine.activo ||
												sectionActionLoading ===
													`remove-medicine-${medicine.id}`
											}
											onClick={() => handleRemoveMedicine(medicine.id)}
											size="icon-sm"
											aria-label={m.dashboardDoctorDisponibilidadDelete(
												{},
												{ locale },
											)}
											title={m.dashboardDoctorDisponibilidadDelete(
												{},
												{ locale },
											)}
										>
											<TrashIcon className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</div>
						))}
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
									doctor.consultorio ??
										specialtyById.get(doctor.especialidadId)?.nombre ??
										String(doctor.especialidadId),
									`doctor-${doctor.id}`,
								),
							)}
					</div>
				);
			case 'userManagement':
				return roleManagementSection;
			case 'disponibilidad':
				return (
					<div className="space-y-4">
						<Card className="border-border/70">
							<CardHeader className="pb-2">
								<CardTitle className="text-base">
									{m.availabilityStaffTitle({}, { locale })}
								</CardTitle>
								<CardDescription>
									{m.availabilityStaffSubtitle({}, { locale })}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{/* Filtro por tipo y búsqueda por nombre */}
								<div className="flex flex-wrap gap-2">
									<div className="flex gap-1 rounded-lg border border-border/60 p-0.5">
										{(['all', 'doctor', 'nurse'] as const).map((f) => (
											<Button
												key={f}
												type="button"
												variant={staffFilter === f ? 'default' : 'ghost'}
												size="sm"
												onClick={() => {
													setStaffFilter(f);
													setSelectedStaffId(null);
													setSelectedStaffType(null);
												}}
											>
												{f === 'all'
													? m.availabilityAllLabel({}, { locale })
													: f === 'doctor'
														? m.availabilityDoctorLabel({}, { locale })
														: m.availabilityNurseLabel({}, { locale })}
											</Button>
										))}
									</div>
									<Input
										type="search"
										placeholder={m.availabilitySearchPlaceholder(
											{},
											{ locale },
										)}
										value={staffSearch}
										onChange={(e) => {
											setStaffSearch(e.target.value);
											setSelectedStaffId(null);
											setSelectedStaffType(null);
										}}
										className="max-w-xs"
									/>
								</div>

								{(() => {
									const q = staffSearch.toLowerCase().trim();
									const filtered = staffMembers.filter((s) => {
										if (staffFilter !== 'all' && s.type !== staffFilter)
											return false;
										if (!q) return true;
										return (
											s.nombre.toLowerCase().includes(q) ||
											s.apellido.toLowerCase().includes(q)
										);
									});

									if (staffMembers.length === 0) {
										return loading ? (
											<Skeleton className="h-20 rounded-lg" />
										) : (
											<p className="py-4 text-center text-sm text-muted-foreground">
												{m.availabilitySearchEmpty({}, { locale })}
											</p>
										);
									}

									return (
										<div className="space-y-3">
											<div className="flex flex-wrap gap-1.5">
												{filtered.map((s) => {
													const active = selectedStaffId === s.id;
													return (
														<Button
															key={`${s.type}-${s.id}`}
															type="button"
															variant={active ? 'default' : 'outline'}
															size="sm"
															onClick={() => {
																if (active) {
																	setSelectedStaffId(null);
																	setSelectedStaffType(null);
																} else {
																	setSelectedStaffId(s.id);
																	setSelectedStaffType(s.type);
																}
															}}
															className="gap-1.5"
														>
															<Badge
																variant="secondary"
																className="px-1 py-0 text-[9px]"
															>
																{s.type === 'doctor'
																	? m.availabilityDoctorLabel({}, { locale })
																	: m.availabilityNurseLabel({}, { locale })}
															</Badge>
															{s.nombre} {s.apellido}
														</Button>
													);
												})}
												{filtered.length === 0 && (
													<p className="py-2 text-sm text-muted-foreground">
														{m.availabilitySearchEmpty({}, { locale })}
													</p>
												)}
											</div>
											{selectedStaffId &&
												selectedStaffType &&
												(staffSlotsLoading ? (
													<Skeleton className="h-32 rounded-lg" />
												) : (
													<AvailabilityWeekView
														slots={staffSlots}
														locale={locale}
														personName={(() => {
															const s = staffMembers.find(
																(item) => item.id === selectedStaffId,
															);
															return s ? `${s.nombre} ${s.apellido}` : '';
														})()}
														personRole={
															selectedStaffType === 'doctor'
																? m.availabilityDoctorLabel({}, { locale })
																: m.availabilityNurseLabel({}, { locale })
														}
													/>
												))}
										</div>
									);
								})()}
							</CardContent>
						</Card>
					</div>
				);
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

			<CreateHospitalModal
				open={hospitalModalOpen}
				onClose={() => setHospitalModalOpen(false)}
				onCreated={() => {
					setHospitalModalOpen(false);
					flash(m.dashboardActionSuccess({}, { locale }));
					void loadData();
				}}
			/>
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
