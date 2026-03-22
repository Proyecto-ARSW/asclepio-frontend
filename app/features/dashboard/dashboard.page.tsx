import {
	BuildingOffice2Icon,
	CalendarDaysIcon,
	ExclamationCircleIcon,
	ExclamationTriangleIcon,
	PlusIcon,
	QueueListIcon,
	UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import { redirect, useNavigate } from 'react-router';
import { CreateHospitalModal } from '@/components/medical/create-hospital-modal';
import {
	HospitalCard,
	type HospitalCardData,
} from '@/components/medical/hospital-card';
import { PageHeader } from '@/components/medical/page-header';
import {
	type PatientRow,
	PatientTable,
} from '@/components/medical/patient-table';
import { type NavSection, SidebarNav } from '@/components/medical/sidebar-nav';
import { StatCard } from '@/components/medical/stat-card';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import { getDashboardContent } from '@/features/dashboard/dashboard.content';
import { currentLocale, localePath } from '@/features/i18n/locale-path';
import { apiGet } from '@/lib/api';
import { gqlQuery } from '@/lib/graphql-client';
import { useAuthStore } from '@/store/auth.store';
import type { Route } from './+types/dashboard.page';

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
	const locale = currentLocale(window.location.pathname);
	const raw = localStorage.getItem('asclepio-auth');
	if (!raw) return redirect(localePath('/login', locale));
	try {
		const parsed = JSON.parse(raw);
		if (!parsed.state?.accessToken)
			return redirect(localePath('/login', locale));
	} catch {
		return redirect(localePath('/login', locale));
	}
	return null;
}

export function meta(_: Route.MetaArgs) {
	return [{ title: 'Asclepio - Dashboard' }];
}

export default function DashboardPage() {
	const navigate = useNavigate();
	const locale = currentLocale();
	const content = getDashboardContent(locale);
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

	const loadHospitals = useCallback(async () => {
		setLoadingHospitals(true);
		setError('');
		try {
			const data = await apiGet<HospitalCardData[]>(
				'/hospitals',
				accessToken ?? undefined,
			);
			setHospitals(data);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : content.alerts.hospitalsLoadError,
			);
		} finally {
			setLoadingHospitals(false);
		}
	}, [accessToken, content.alerts.hospitalsLoadError]);

	const loadPatients = useCallback(async () => {
		setLoadingPatients(true);
		setError('');
		try {
			const data = await gqlQuery<GqlPatientsData>(PATIENTS_QUERY);
			setPatients(data.patients);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : content.alerts.patientsLoadError,
			);
		} finally {
			setLoadingPatients(false);
		}
	}, [content.alerts.patientsLoadError]);

	useEffect(() => {
		if (activeSection === 'hospitals' && hospitals.length === 0) {
			void loadHospitals();
		}
		if (activeSection === 'patients' && patients.length === 0) {
			void loadPatients();
		}
	}, [
		activeSection,
		hospitals.length,
		loadHospitals,
		loadPatients,
		patients.length,
	]);

	function handleLogout() {
		logout();
		navigate(localePath('/login', locale));
	}

	const sectionMap = content.sidebar.sections;

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			<SidebarNav
				active={activeSection}
				onNavigate={setActiveSection}
				hospitalName={selectedHospital?.nombre}
				userName={user ? `${user.nombre} ${user.apellido}` : undefined}
				userRole={user?.rol}
				onLogout={handleLogout}
				labels={{
					brandName: content.sidebar.brandName,
					logout: content.sidebar.logout,
					sections: content.sidebar.sections,
				}}
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
						<Alert className="mb-5 border-l-4 border-l-accent">
							<ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
							<AlertDescription className="text-sm text-foreground">
								{content.alerts.tempSession}{' '}
								<Button
									type="button"
									variant="link"
									className="h-auto p-0 font-semibold"
									onClick={() => setActiveSection('hospitals')}
								>
									{content.alerts.tempSessionAction}
								</Button>
							</AlertDescription>
						</Alert>
					)}

					{error && (
						<Alert variant="destructive" className="mb-6">
							<ExclamationCircleIcon className="h-5 w-5 shrink-0" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{activeSection === 'overview' && (
						<OverviewSection
							content={content}
							hospitalName={
								selectedHospital?.id !== 0
									? selectedHospital?.nombre
									: undefined
							}
							hospitalCity={
								selectedHospital?.id !== 0 && selectedHospital
									? `${selectedHospital.ciudad}, ${selectedHospital.departamento}`
									: undefined
							}
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
									<h2 className="text-xl font-bold text-foreground">
										{content.hospitals.title}
									</h2>
									<p className="mt-0.5 text-sm text-muted-foreground">
										{content.hospitals.subtitle}
									</p>
								</div>
								<div className="flex shrink-0 gap-2">
									{isAdmin && (
										<Button
											type="button"
											onClick={() => setShowCreateHospital(true)}
											className="gap-2"
										>
											<PlusIcon className="h-4 w-4" />
											<span className="hidden sm:inline">
												{content.hospitals.createHospital}
											</span>
											<span className="sm:hidden">
												{content.hospitals.createHospital}
											</span>
										</Button>
									)}
									<Button
										type="button"
										onClick={loadHospitals}
										disabled={loadingHospitals}
										variant="outline"
									>
										{loadingHospitals
											? content.hospitals.refreshLoading
											: content.hospitals.refresh}
									</Button>
								</div>
							</div>

							{loadingHospitals ? (
								<HospitalsLoading />
							) : hospitals.length === 0 ? (
								<Card className="border-dashed py-10 text-center">
									<CardContent className="flex flex-col items-center justify-center">
										<BuildingOffice2Icon className="mb-3 h-12 w-12 text-muted-foreground/40" />
										<p className="text-sm font-medium text-muted-foreground">
											{content.hospitals.empty}
										</p>
										{isAdmin && (
											<Button
												type="button"
												onClick={() => setShowCreateHospital(true)}
												className="mt-4 gap-2"
											>
												<PlusIcon className="h-4 w-4" />
												{content.hospitals.createFirstHospital}
											</Button>
										)}
									</CardContent>
								</Card>
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
								title={content.patients.title}
								subtitle={content.patients.subtitle}
								badge={
									patients.length > 0 ? String(patients.length) : undefined
								}
							/>
							<PatientTable
								patients={patients}
								loading={loadingPatients}
								onRefresh={loadPatients}
								labels={{
									title: content.patients.tableTitle,
									refresh: content.patients.refresh,
									emptyTitle: content.patients.emptyTitle,
									emptyDescription: content.patients.emptyDescription,
									headers: content.patients.headers,
								}}
							/>
						</>
					)}

					{!['overview', 'hospitals', 'patients'].includes(activeSection) && (
						<ComingSoonSection
							label={sectionMap[activeSection]}
							description={content.comingSoon.description}
						/>
					)}
				</div>
			</main>
		</div>
	);
}

function OverviewSection({
	content,
	hospitalName,
	hospitalCity,
	hospitalsCount,
	patientsCount,
	isAdmin,
	isTempSession,
	onGoToHospitals,
}: {
	content: ReturnType<typeof getDashboardContent>;
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
				<h2 className="text-2xl font-bold text-foreground">
					{content.overview.title}
				</h2>
				{hospitalName && !isTempSession && (
					<p className="mt-1 text-sm text-muted-foreground">
						{hospitalName}
						{hospitalCity ? ` — ${hospitalCity}` : ''}
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
				<Card className="mb-4 border-primary/30 bg-primary/5">
					<CardHeader className="pb-0">
						<CardTitle className="text-base text-foreground">
							{content.overview.adminActionsTitle}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-3">
							<Button type="button" onClick={onGoToHospitals} className="gap-2">
								<BuildingOffice2Icon className="h-4 w-4" />
								{content.overview.manageHospitals}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader className="pb-0">
					<CardTitle className="text-base">
						{content.overview.activeConnections}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Badge variant="secondary" className="h-2 w-2 p-0" />
							<span className="text-sm text-muted-foreground">
								{content.overview.restLabel} -{' '}
								<code className="rounded bg-muted px-1 text-xs">
									http://localhost:3000
								</code>
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="secondary" className="h-2 w-2 p-0" />
							<span className="text-sm text-muted-foreground">
								{content.overview.graphqlLabel} -{' '}
								<code className="rounded bg-muted px-1 text-xs">
									http://localhost:3000/graphql
								</code>
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function HospitalsLoading() {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{Array.from(
				{ length: 6 },
				(_, index) => `hospital-skeleton-${index}`,
			).map((key) => (
				<Skeleton key={key} className="h-48 rounded-xl" />
			))}
		</div>
	);
}

function ComingSoonSection({
	label,
	description,
}: {
	label: string;
	description: string;
}) {
	return (
		<div className="flex flex-col items-center justify-center py-24 text-center">
			<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
				<CalendarDaysIcon className="h-8 w-8 text-muted-foreground" />
			</div>
			<h3 className="text-lg font-semibold text-foreground">{label}</h3>
			<p className="mt-1 text-sm text-muted-foreground">{description}</p>
		</div>
	);
}
