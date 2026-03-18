import { useEffect, useState } from 'react';
import { redirect, useNavigate } from 'react-router';
import type { Route } from './+types/dashboard.page';
import {
	BuildingOffice2Icon,
	UserGroupIcon,
	CalendarDaysIcon,
	QueueListIcon,
	ExclamationCircleIcon,
	PlusIcon,
	ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/auth.store';
import { apiGet } from '@/lib/api';
import { gqlQuery } from '@/lib/graphql-client';
import { SidebarNav, type NavSection } from '@/components/medical/sidebar-nav';
import { StatCard } from '@/components/medical/stat-card';
import { HospitalCard, type HospitalCardData } from '@/components/medical/hospital-card';
import { PatientTable, type PatientRow } from '@/components/medical/patient-table';
import { PageHeader } from '@/components/medical/page-header';
import { CreateHospitalModal } from '@/components/medical/create-hospital-modal';

interface GqlPatientsData {
	patients: PatientRow[];
}

const PATIENTS_QUERY = `
	query {
		patients {
			id
			nombre
			apellido
			email
			tipoDocumento
			numeroDocumento
			eps
			tipoSangre
			creadoEn
		}
	}
`;

export async function clientLoader() {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem('asclepio-auth');
	if (!raw) return redirect('/login');
	try {
		const parsed = JSON.parse(raw);
		if (!parsed.state?.accessToken) return redirect('/login');
	} catch {
		return redirect('/login');
	}
	return null;
}

export function meta(_: Route.MetaArgs) {
	return [{ title: 'Asclepio - Dashboard' }];
}

export default function DashboardPage() {
	const navigate = useNavigate();
	const { user, selectedHospital, logout, accessToken } = useAuthStore();

	const [activeSection, setActiveSection] = useState<NavSection>('overview');
	const [hospitals, setHospitals] = useState<HospitalCardData[]>([]);
	const [patients, setPatients] = useState<PatientRow[]>([]);
	const [loadingHospitals, setLoadingHospitals] = useState(false);
	const [loadingPatients, setLoadingPatients] = useState(false);
	const [error, setError] = useState('');
	const [showCreateHospital, setShowCreateHospital] = useState(false);

	const isAdmin = user?.rol === 'ADMIN';
	const isTempSession = selectedHospital?.id === 0;

	useEffect(() => {
		useAuthStore.persist.rehydrate();
	}, []);

	useEffect(() => {
		if (activeSection === 'hospitals' && hospitals.length === 0) {
			loadHospitals();
		}
		if (activeSection === 'patients' && patients.length === 0) {
			loadPatients();
		}
	}, [activeSection]);

	async function loadHospitals() {
		setLoadingHospitals(true);
		setError('');
		try {
			const data = await apiGet<HospitalCardData[]>('/hospitals', accessToken ?? undefined);
			setHospitals(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al cargar hospitales');
		} finally {
			setLoadingHospitals(false);
		}
	}

	async function loadPatients() {
		setLoadingPatients(true);
		setError('');
		try {
			const data = await gqlQuery<GqlPatientsData>(PATIENTS_QUERY);
			setPatients(data.patients);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al cargar pacientes');
		} finally {
			setLoadingPatients(false);
		}
	}

	function handleLogout() {
		logout();
		navigate('/login');
	}

	const sectionMap: Record<NavSection, string> = {
		overview: 'Inicio',
		hospitals: 'Hospitales',
		patients: 'Pacientes',
		appointments: 'Citas',
		queue: 'Turnos',
		medicines: 'Medicamentos',
		doctors: 'Médicos',
	};

	return (
		<div className="flex h-screen overflow-hidden bg-slate-50">
			<SidebarNav
				active={activeSection}
				onNavigate={setActiveSection}
				hospitalName={selectedHospital?.nombre}
				userName={user ? `${user.nombre} ${user.apellido}` : undefined}
				userRole={user?.rol}
				onLogout={handleLogout}
			/>

			<CreateHospitalModal
				open={showCreateHospital}
				onClose={() => setShowCreateHospital(false)}
				onCreated={(h) => {
					setHospitals((prev) => [...prev, h as HospitalCardData]);
					setShowCreateHospital(false);
				}}
			/>

			<main className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-6xl px-4 py-6 pt-16 sm:px-6 sm:pt-6 lg:p-8">
					{isTempSession && isAdmin && (
						<div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
							<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
							<p className="text-sm text-amber-800">
								Sesión temporal activa. Ve a{' '}
								<button
									type="button"
									className="font-semibold underline"
									onClick={() => setActiveSection('hospitals')}
								>
									Hospitales
								</button>{' '}
								para crear y vincular tu primer hospital.
							</p>
						</div>
					)}

					{error && (
						<div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
							<ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 text-red-500" />
							<p className="text-sm text-red-700">{error}</p>
						</div>
					)}

					{activeSection === 'overview' && (
						<OverviewSection
							hospitalName={selectedHospital?.id !== 0 ? selectedHospital?.nombre : undefined}
							hospitalCity={selectedHospital?.id !== 0 && selectedHospital ? `${selectedHospital.ciudad}, ${selectedHospital.departamento}` : undefined}
							hospitalsCount={hospitals.length}
							patientsCount={patients.length}
							isAdmin={isAdmin}
							isTempSession={isTempSession}
							onGoToHospitals={() => setActiveSection('hospitals')}
						/>
					)}

					{activeSection === 'hospitals' && (
						<>
							<div className="mb-6 flex items-start justify-between gap-4">
								<div>
									<h2 className="text-xl font-bold text-gray-900">Hospitales</h2>
									<p className="mt-0.5 text-sm text-gray-500">
										REST — <code className="text-xs bg-gray-100 px-1 rounded">GET /hospitals</code>
									</p>
								</div>
								<div className="flex gap-2 flex-shrink-0">
									{isAdmin && (
										<button
											type="button"
											onClick={() => setShowCreateHospital(true)}
											className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
										>
											<PlusIcon className="h-4 w-4" />
											<span className="hidden sm:inline">Crear hospital</span>
											<span className="sm:hidden">Crear</span>
										</button>
									)}
									<button
										type="button"
										onClick={loadHospitals}
										disabled={loadingHospitals}
										className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
									>
										{loadingHospitals ? 'Cargando...' : 'Actualizar'}
									</button>
								</div>
							</div>

						{loadingHospitals ? (
							<HospitalsLoading />
						) : hospitals.length === 0 ? (
							<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
								<BuildingOffice2Icon className="h-12 w-12 text-gray-300 mb-3" />
								<p className="text-sm font-medium text-gray-500">No hay hospitales registrados.</p>
								{isAdmin && (
									<button
										type="button"
										onClick={() => setShowCreateHospital(true)}
										className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
									>
										<PlusIcon className="h-4 w-4" />
										Crear primer hospital
									</button>
								)}
							</div>
						) : (
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
								{hospitals.map((h) => (
									<HospitalCard key={h.id} hospital={h} />
								))}
							</div>
						)}
						</>
					)}

					{activeSection === 'patients' && (
						<>
							<PageHeader
								title="Pacientes"
								subtitle={`GraphQL — query patients { ... }`}
								badge={patients.length > 0 ? String(patients.length) : undefined}
							/>
							<PatientTable
								patients={patients}
								loading={loadingPatients}
								onRefresh={loadPatients}
							/>
						</>
					)}

					{!['overview', 'hospitals', 'patients'].includes(activeSection) && (
						<ComingSoonSection label={sectionMap[activeSection]} />
					)}
				</div>
			</main>
		</div>
	);
}

function OverviewSection({
	hospitalName,
	hospitalCity,
	hospitalsCount,
	patientsCount,
	isAdmin,
	isTempSession,
	onGoToHospitals,
}: {
	hospitalName?: string;
	hospitalCity?: string;
	hospitalsCount: number;
	patientsCount: number;
	isAdmin?: boolean;
	isTempSession?: boolean;
	onGoToHospitals?: () => void;
}) {
	return (
		<div>
			<div className="mb-8">
				<h2 className="text-2xl font-bold text-gray-900">Panel de Control</h2>
				{hospitalName && !isTempSession && (
					<p className="mt-1 text-sm text-gray-500">
						{hospitalName}{hospitalCity ? ` — ${hospitalCity}` : ''}
					</p>
				)}
			</div>

			<div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatCard
					title="Hospitales"
					value={hospitalsCount || '—'}
					subtitle="en el sistema"
					icon={BuildingOffice2Icon}
					color="blue"
				/>
				<StatCard
					title="Pacientes"
					value={patientsCount || '—'}
					subtitle="registrados"
					icon={UserGroupIcon}
					color="green"
				/>
				<StatCard
					title="Citas"
					value="—"
					subtitle="disponible vía GraphQL"
					icon={CalendarDaysIcon}
					color="violet"
				/>
				<StatCard
					title="Turnos"
					value="—"
					subtitle="disponible vía GraphQL"
					icon={QueueListIcon}
					color="amber"
				/>
			</div>

		{isAdmin && (
				<div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-5">
					<h3 className="mb-3 font-semibold text-blue-900">Acciones de administrador</h3>
					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={onGoToHospitals}
							className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
						>
							<BuildingOffice2Icon className="h-4 w-4" />
							Gestionar hospitales
						</button>
					</div>
				</div>
			)}

			<div className="rounded-xl border border-gray-200 bg-white p-5">
				<h3 className="mb-3 font-semibold text-gray-800">Conexiones activas</h3>
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full bg-emerald-500" />
						<span className="text-sm text-gray-700">
							REST API — <code className="text-xs bg-gray-100 px-1 rounded">http://localhost:3000</code>
						</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full bg-emerald-500" />
						<span className="text-sm text-gray-700">
							GraphQL — <code className="text-xs bg-gray-100 px-1 rounded">http://localhost:3000/graphql</code>
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function HospitalsLoading() {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: 6 }).map((_, i) => (
				<div
					key={i}
					className="h-48 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
				/>
			))}
		</div>
	);
}

function ComingSoonSection({ label }: { label: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-24 text-center">
			<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
				<CalendarDaysIcon className="h-8 w-8 text-gray-400" />
			</div>
			<h3 className="text-lg font-semibold text-gray-700">{label}</h3>
			<p className="mt-1 text-sm text-gray-400">
				Sección disponible — conectar con GraphQL resolver correspondiente.
			</p>
		</div>
	);
}
