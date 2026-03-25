import {
	ArrowRightStartOnRectangleIcon,
	LanguageIcon,
	MoonIcon,
	SunIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { Link, redirect, useNavigate } from 'react-router';
import { type NavSection, SidebarNav } from '@/components/medical/sidebar-nav';
import { Badge } from '@/components/ui/badge/badge.component';
import {
	Button,
	buttonVariants,
} from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import { Checkbox } from '@/components/ui/checkbox/checkbox.component';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select/select.component';
import { Switch } from '@/components/ui/switch/switch.component';
import { AdminDashboardView } from '@/features/dashboard/roles/admin-dashboard.view';
import type {
	DashboardUser,
	OverviewBlockKey,
} from '@/features/dashboard/roles/dashboard-role.types';
import { DoctorDashboardView } from '@/features/dashboard/roles/doctor-dashboard.view';
import { NurseDashboardView } from '@/features/dashboard/roles/nurse-dashboard.view';
import { PatientDashboardView } from '@/features/dashboard/roles/patient-dashboard.view';
import { ReceptionistDashboardView } from '@/features/dashboard/roles/receptionist-dashboard.view';
import type { AppLocale } from '@/features/i18n/locale-path';
import { currentLocale, localePath } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import {
	applyUiPreferences,
	DEFAULT_OVERVIEW_BLOCKS,
	readUiPreferences,
	saveUiPreferences,
	type ThemeMode,
	type UiPreferences,
} from '@/features/preferences/ui-preferences';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import type { Route } from './+types/dashboard.page';

function getRoleLabel(role: string | null | undefined, locale: 'es' | 'en') {
	switch (role) {
		case 'ADMIN':
			return m.authRoleAdmin({}, { locale });
		case 'MEDICO':
			return m.authRoleDoctor({}, { locale });
		case 'ENFERMERO':
			return m.authRoleNurse({}, { locale });
		case 'RECEPCIONISTA':
			return m.authRoleReceptionist({}, { locale });
		default:
			return m.authRolePatient({}, { locale });
	}
}

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
	const locale = currentLocale();
	return [{ title: m.pageTitleDashboard({}, { locale }) }];
}

export default function DashboardPage() {
	const navigate = useNavigate();
	const locale = currentLocale();
	const nextLocale = locale === 'es' ? 'en' : 'es';
	const { user, selectedHospital, logout } = useAuthStore();
	const [uiPreferences, setUiPreferences] = useState<UiPreferences>(() =>
		readUiPreferences(),
	);
	const [activeSection, setActiveSection] = useState<NavSection>('overview');

	useEffect(() => {
		useAuthStore.persist.rehydrate();
	}, []);

	useEffect(() => {
		applyUiPreferences(uiPreferences);
		saveUiPreferences(uiPreferences);
	}, [uiPreferences]);

	function handleLogout() {
		logout();
		navigate(localePath('/login', locale));
	}

	function handleLanguageChange(next: AppLocale) {
		navigate(localePath('/dashboard', next));
	}

	function handleThemeChange(theme: ThemeMode) {
		setUiPreferences((prev) => ({ ...prev, theme }));
	}

	function handleOverviewBlockToggle(
		block: OverviewBlockKey,
		checked: boolean,
	) {
		setUiPreferences((prev) => ({
			...prev,
			overviewBlocks: checked
				? [...new Set([...prev.overviewBlocks, block])]
				: prev.overviewBlocks.filter((item) => item !== block),
		}));
	}

	function handleOverviewBlocksReset() {
		setUiPreferences((prev) => ({
			...prev,
			overviewBlocks: [...DEFAULT_OVERVIEW_BLOCKS],
		}));
	}

	if (!user) {
		return null;
	}

	const hasSidebarNavigation = user.rol === 'ADMIN';
	const roleLabel = getRoleLabel(user.rol, locale);
	const overviewBlockChoices: Array<{ key: OverviewBlockKey; label: string }> =
		[
			{
				key: 'kpiUsers',
				label: m.dashboardAdminUsersSectionTitle({}, { locale }),
			},
			{
				key: 'kpiHospitals',
				label: m.dashboardSidebarHospitals({}, { locale }),
			},
			{ key: 'kpiPatients', label: m.dashboardSidebarPatients({}, { locale }) },
			{ key: 'kpiDoctors', label: m.dashboardSidebarDoctors({}, { locale }) },
			{ key: 'kpiNurses', label: m.authRoleNurse({}, { locale }) },
			{
				key: 'kpiAppointments',
				label: m.dashboardSidebarAppointments({}, { locale }),
			},
			{ key: 'kpiQueue', label: m.dashboardSidebarQueue({}, { locale }) },
			{
				key: 'kpiMedicines',
				label: m.dashboardSidebarMedicines({}, { locale }),
			},
			{
				key: 'recentAppointments',
				label: m.dashboardSettingsOverviewCardRecent({}, { locale }),
			},
			{
				key: 'queuePreview',
				label: m.dashboardSettingsOverviewCardQueue({}, { locale }),
			},
			{
				key: 'roleManagement',
				label: m.dashboardAdminUsersSectionTitle({}, { locale }),
			},
		];

	const roleUser: DashboardUser = {
		id: user.id,
		nombre: user.nombre,
		apellido: user.apellido,
		email: user.email,
		rol: (user.rol ?? 'PACIENTE') as DashboardUser['rol'],
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
				<header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/90 p-3 shadow-sm backdrop-blur sm:p-4">
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<Link
								to={localePath('/', locale)}
								className={cn(
									buttonVariants({ variant: 'ghost', size: 'sm' }),
									'h-8 px-2',
								)}
							>
								{m.dashboardSidebarBrandName({}, { locale })}
							</Link>
							<Badge variant="secondary">{roleLabel}</Badge>
						</div>
						<p className="truncate text-sm text-muted-foreground">
							{user.nombre} {user.apellido}
							{selectedHospital?.nombre ? ` - ${selectedHospital.nombre}` : ''}
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							onClick={() =>
								handleThemeChange(
									uiPreferences.theme === 'dark' ? 'light' : 'dark',
								)
							}
							aria-label={m.homeLandingThemeToggle({}, { locale })}
						>
							{uiPreferences.theme === 'dark' ? (
								<SunIcon className="h-4 w-4" />
							) : (
								<MoonIcon className="h-4 w-4" />
							)}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => handleLanguageChange(nextLocale)}
							className="gap-1"
						>
							<LanguageIcon className="h-4 w-4" />
							EN/ES
						</Button>
						{!hasSidebarNavigation && (
							<Button
								type="button"
								variant="destructive"
								size="sm"
								onClick={handleLogout}
								className="gap-2"
							>
								<ArrowRightStartOnRectangleIcon className="h-4 w-4" />
								{m.dashboardSidebarLogout({}, { locale })}
							</Button>
						)}
					</div>
				</header>

				{hasSidebarNavigation ? (
					<div className="flex gap-4">
						<SidebarNav
							active={activeSection}
							onNavigate={setActiveSection}
							hospitalName={selectedHospital?.nombre}
							userName={`${user.nombre} ${user.apellido}`}
							userRole={roleLabel}
							onLogout={handleLogout}
						/>
						<div className="w-full min-w-0 pt-14 lg:pt-0">
							<SidebarSectionRenderer
								section={activeSection}
								user={roleUser}
								locale={locale}
								selectedHospitalId={selectedHospital?.id}
								overviewBlocks={uiPreferences.overviewBlocks}
								theme={uiPreferences.theme}
								dyslexiaFont={uiPreferences.dyslexiaFont}
								onThemeChange={handleThemeChange}
								onLanguageChange={handleLanguageChange}
								onDyslexiaToggle={(enabled) =>
									setUiPreferences((prev) => ({
										...prev,
										dyslexiaFont: enabled,
									}))
								}
								overviewBlockChoices={overviewBlockChoices}
								onOverviewBlockToggle={handleOverviewBlockToggle}
								onOverviewBlockReset={handleOverviewBlocksReset}
							/>
						</div>
					</div>
				) : (
					<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
						<RoleRenderer
							user={roleUser}
							locale={locale}
							selectedHospitalId={selectedHospital?.id}
							overviewBlocks={uiPreferences.overviewBlocks}
						/>
						<SettingsPanel
							locale={locale}
							theme={uiPreferences.theme}
							dyslexiaFont={uiPreferences.dyslexiaFont}
							overviewBlocks={uiPreferences.overviewBlocks}
							overviewBlockChoices={overviewBlockChoices}
							onThemeChange={handleThemeChange}
							onLanguageChange={handleLanguageChange}
							onDyslexiaToggle={(enabled) =>
								setUiPreferences((prev) => ({ ...prev, dyslexiaFont: enabled }))
							}
							onOverviewBlockToggle={handleOverviewBlockToggle}
							onOverviewBlockReset={handleOverviewBlocksReset}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

function SidebarSectionRenderer({
	section,
	user,
	locale,
	selectedHospitalId,
	overviewBlocks,
	theme,
	dyslexiaFont,
	onThemeChange,
	onLanguageChange,
	onDyslexiaToggle,
	overviewBlockChoices,
	onOverviewBlockToggle,
	onOverviewBlockReset,
}: {
	section: NavSection;
	user: DashboardUser;
	locale: 'es' | 'en';
	selectedHospitalId?: number;
	overviewBlocks: OverviewBlockKey[];
	theme: ThemeMode;
	dyslexiaFont: boolean;
	onThemeChange: (theme: ThemeMode) => void;
	onLanguageChange: (locale: AppLocale) => void;
	onDyslexiaToggle: (enabled: boolean) => void;
	overviewBlockChoices: Array<{ key: OverviewBlockKey; label: string }>;
	onOverviewBlockToggle: (block: OverviewBlockKey, checked: boolean) => void;
	onOverviewBlockReset: () => void;
}) {
	if (section === 'settings') {
		return (
			<SettingsPanel
				locale={locale}
				theme={theme}
				dyslexiaFont={dyslexiaFont}
				overviewBlocks={overviewBlocks}
				overviewBlockChoices={overviewBlockChoices}
				onThemeChange={onThemeChange}
				onLanguageChange={onLanguageChange}
				onDyslexiaToggle={onDyslexiaToggle}
				onOverviewBlockToggle={onOverviewBlockToggle}
				onOverviewBlockReset={onOverviewBlockReset}
			/>
		);
	}

	if (user.rol === 'ADMIN') {
		return (
			<AdminDashboardView
				user={user}
				locale={locale}
				section={section}
				selectedHospitalId={selectedHospitalId}
				overviewBlocks={overviewBlocks}
			/>
		);
	}

	return <RoleRenderer user={user} locale={locale} />;
}

function RoleRenderer({
	user,
	locale,
	selectedHospitalId,
	overviewBlocks,
}: {
	user: DashboardUser;
	locale: 'es' | 'en';
	selectedHospitalId?: number;
	overviewBlocks?: OverviewBlockKey[];
}) {
	switch (user.rol) {
		case 'ADMIN':
			return (
				<AdminDashboardView
					user={user}
					locale={locale}
					selectedHospitalId={selectedHospitalId}
					overviewBlocks={overviewBlocks}
				/>
			);
		case 'MEDICO':
			return <DoctorDashboardView user={user} locale={locale} />;
		case 'ENFERMERO':
			return <NurseDashboardView user={user} locale={locale} />;
		case 'RECEPCIONISTA':
			return <ReceptionistDashboardView user={user} locale={locale} />;
		default:
			return <PatientDashboardView user={user} locale={locale} />;
	}
}

function SettingsPanel({
	locale,
	theme,
	dyslexiaFont,
	overviewBlocks,
	overviewBlockChoices,
	onThemeChange,
	onLanguageChange,
	onDyslexiaToggle,
	onOverviewBlockToggle,
	onOverviewBlockReset,
}: {
	locale: 'es' | 'en';
	theme: ThemeMode;
	dyslexiaFont: boolean;
	overviewBlocks: OverviewBlockKey[];
	overviewBlockChoices: Array<{ key: OverviewBlockKey; label: string }>;
	onThemeChange: (theme: ThemeMode) => void;
	onLanguageChange: (locale: AppLocale) => void;
	onDyslexiaToggle: (enabled: boolean) => void;
	onOverviewBlockToggle: (block: OverviewBlockKey, checked: boolean) => void;
	onOverviewBlockReset: () => void;
}) {
	return (
		<Card className="h-fit border-border/70 bg-card/90 shadow-sm">
			<CardHeader>
				<CardTitle>{m.dashboardSettingsTitle({}, { locale })}</CardTitle>
				<CardDescription>
					{m.dashboardSettingsDescription({}, { locale })}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<p className="text-sm font-medium text-foreground">
						{m.dashboardSettingsLanguageTitle({}, { locale })}
					</p>
					<div className="flex gap-2">
						<Button
							type="button"
							variant={locale === 'es' ? 'default' : 'outline'}
							onClick={() => onLanguageChange('es')}
						>
							{m.dashboardSettingsLanguageEs({}, { locale })}
						</Button>
						<Button
							type="button"
							variant={locale === 'en' ? 'default' : 'outline'}
							onClick={() => onLanguageChange('en')}
						>
							{m.dashboardSettingsLanguageEn({}, { locale })}
						</Button>
					</div>
				</div>
				<div className="space-y-2">
					<p className="text-sm font-medium text-foreground">
						{m.dashboardSettingsThemeTitle({}, { locale })}
					</p>
					<Select
						value={theme}
						onValueChange={(value) =>
							onThemeChange((value as ThemeMode | null) ?? 'system')
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="light">
								{m.dashboardSettingsThemeLight({}, { locale })}
							</SelectItem>
							<SelectItem value="dark">
								{m.dashboardSettingsThemeDark({}, { locale })}
							</SelectItem>
							<SelectItem value="system">
								{m.dashboardSettingsThemeSystem({}, { locale })}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
					<p className="text-sm text-foreground">
						{m.dashboardSettingsDyslexiaToggle({}, { locale })}
					</p>
					<Switch
						checked={dyslexiaFont}
						onCheckedChange={(checked) => onDyslexiaToggle(Boolean(checked))}
					/>
				</div>
				<div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
					<div className="flex items-center justify-between gap-2">
						<p className="text-sm font-medium text-foreground">
							{m.dashboardSettingsOverviewBlocksTitle({}, { locale })}
						</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onOverviewBlockReset}
						>
							{m.dashboardSettingsOverviewBlocksReset({}, { locale })}
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">
						{m.dashboardSettingsOverviewBlocksDescription({}, { locale })}
					</p>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{overviewBlockChoices.map((choice) => (
							<div
								key={choice.key}
								className="flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-2 py-1.5"
							>
								<Checkbox
									checked={overviewBlocks.includes(choice.key)}
									onCheckedChange={(checked) =>
										onOverviewBlockToggle(choice.key, Boolean(checked))
									}
								/>
								<span className="text-xs text-foreground">{choice.label}</span>
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
