import {
	ArrowRightStartOnRectangleIcon,
	MoonIcon,
	SunIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { Link, redirect, useLocation, useNavigate } from 'react-router';
import { SidebarNav } from '@/components/medical/sidebar-nav';
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
	DashboardSection as NavSection,
	OverviewBlockKey,
} from '@/features/dashboard/roles/dashboard-role.types';
import { DoctorDashboardView } from '@/features/dashboard/roles/doctor-dashboard.view';
import { NurseDashboardView } from '@/features/dashboard/roles/nurse-dashboard.view';
import { PatientDashboardView } from '@/features/dashboard/roles/patient-dashboard.view';
import { ReceptionistDashboardView } from '@/features/dashboard/roles/receptionist-dashboard.view';
import { getLocalizedRoleLabel } from '@/features/dashboard/roles/role-label';
import { LanguageSwitcher } from '@/features/i18n/language-switcher';
import type { AppLocale } from '@/features/i18n/locale-path';
import {
	currentLocale,
	localeFromPathname,
	localePath,
} from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import {
	applyUiPreferences,
	type ColorMode,
	DEFAULT_OVERVIEW_BLOCKS,
	readUiPreferences,
	saveUiPreferences,
	type ThemeMode,
	type UiPreferences,
} from '@/features/preferences/ui-preferences';
import { hasValidAccessTokenInStorage } from '@/lib/auth-session';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import type { Route } from './+types/dashboard.page';

const DASHBOARD_SECTION_STORAGE_KEY = 'asclepio-dashboard-active-section';
const PATIENT_SIDEBAR_SECTIONS: NavSection[] = [
	'overview',
	'triage',
	'appointments',
	'historial',
	'queue',
	'ai',
	'settings',
];
const ADMIN_SIDEBAR_SECTIONS: NavSection[] = [
	'overview',
	'hospitals',
	'patients',
	'appointments',
	'queue',
	'medicines',
	'doctors',
	'userManagement',
	'settings',
];
// Médico: ve sus citas, gestiona disponibilidad y registra historial
const DOCTOR_SIDEBAR_SECTIONS: NavSection[] = [
	'overview',
	'appointments',
	'queue',
	'disponibilidad',
	'historial',
	'settings',
];
// Enfermero: ve su disponibilidad y gestiona la cola de turnos
const NURSE_SIDEBAR_SECTIONS: NavSection[] = [
	'overview',
	'disponibilidad',
	'queue',
	'settings',
];
// Recepcionista: gestiona citas y cola de turnos del hospital
const RECEPTIONIST_SIDEBAR_SECTIONS: NavSection[] = [
	'overview',
	'appointments',
	'queue',
	'settings',
];

function isNavSection(value: string | null): value is NavSection {
	return (
		value === 'overview' ||
		value === 'hospitals' ||
		value === 'patients' ||
		value === 'triage' ||
		value === 'appointments' ||
		value === 'queue' ||
		value === 'ai' ||
		value === 'medicines' ||
		value === 'doctors' ||
		value === 'userManagement' ||
		value === 'settings'
	);
}

function getSidebarSectionsForRole(
	role: string | null | undefined,
): NavSection[] {
	switch (role) {
		case 'ADMIN':
			return ADMIN_SIDEBAR_SECTIONS;
		case 'PACIENTE':
			return PATIENT_SIDEBAR_SECTIONS;
		case 'MEDICO':
			return DOCTOR_SIDEBAR_SECTIONS;
		case 'ENFERMERO':
			return NURSE_SIDEBAR_SECTIONS;
		case 'RECEPCIONISTA':
			return RECEPTIONIST_SIDEBAR_SECTIONS;
		default:
			return [];
	}
}

export async function clientLoader() {
	if (typeof window === 'undefined') return null;
	const locale = currentLocale(window.location.pathname);
	if (!hasValidAccessTokenInStorage()) {
		return redirect(localePath('/login', locale));
	}
	return null;
}

export function meta(_: Route.MetaArgs) {
	const locale = currentLocale();
	return [{ title: m.pageTitleDashboard({}, { locale }) }];
}

export default function DashboardPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const locale = localeFromPathname(location.pathname);
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

	function handleColorModeChange(colorMode: ColorMode) {
		setUiPreferences((prev) => ({ ...prev, colorMode }));
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

	function handleSidebarNavigate(section: NavSection) {
		setActiveSection(section);
		if (typeof window !== 'undefined') {
			localStorage.setItem(DASHBOARD_SECTION_STORAGE_KEY, section);
		}
	}

	const sidebarSections = getSidebarSectionsForRole(user?.rol);
	const hasSidebarNavigation = sidebarSections.length > 0;

	useEffect(() => {
		if (!hasSidebarNavigation || typeof window === 'undefined') return;
		const storedSection = localStorage.getItem(DASHBOARD_SECTION_STORAGE_KEY);
		if (
			isNavSection(storedSection) &&
			sidebarSections.includes(storedSection)
		) {
			setActiveSection(storedSection);
		}
	}, [hasSidebarNavigation, sidebarSections]);

	useEffect(() => {
		if (activeSection === 'triage') {
			navigate(localePath('/triage', locale));
		}
	}, [activeSection, locale, navigate]);

	if (!user) {
		return null;
	}

	const roleLabel = getLocalizedRoleLabel(user.rol, locale);
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
		];

	const roleUser: DashboardUser = {
		id: user.id,
		nombre: user.nombre,
		apellido: user.apellido,
		email: user.email,
		rol: (user.rol ?? 'PACIENTE') as DashboardUser['rol'],
	};

	return (
		// role="region" no es necesario en <div> raíz — el <header> y <main> semánticos
		// ya crean landmarks suficientes para que el lector de pantalla navegue por secciones.
		<div className="relative min-h-screen overflow-hidden bg-background">
			<img
				src="/images/register-background.svg"
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-45 saturate-125"
			/>
			<div className="pointer-events-none absolute inset-0 bg-background/72" />
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,hsl(var(--primary)/0.06),transparent_42%)]" />
			<div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
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
						<LanguageSwitcher locale={locale} triggerClassName="h-8 px-2.5" />
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
						{/* nav con aria-label → el lector anuncia "Navegacion lateral" al entrar con Tab/F6 */}
						<nav aria-label={m.a11yLandmarkSidebarNav({}, { locale })}>
							<SidebarNav
								active={activeSection}
								onNavigate={handleSidebarNavigate}
								locale={locale}
								sections={sidebarSections}
								hospitalName={selectedHospital?.nombre}
								userName={`${user.nombre} ${user.apellido}`}
								userRole={roleLabel}
								onLogout={handleLogout}
							/>
						</nav>
						{/* main identifica el contenido principal; solo debe haber uno por página */}
						<main
							id="main-content"
							aria-label={m.a11yLandmarkMain({}, { locale })}
							className="w-full min-w-0 pt-14 lg:pt-0"
						>
							<SidebarSectionRenderer
								section={activeSection}
								user={roleUser}
								locale={locale}
								selectedHospitalId={selectedHospital?.id}
								overviewBlocks={uiPreferences.overviewBlocks}
								theme={uiPreferences.theme}
								colorMode={uiPreferences.colorMode}
								dyslexiaFont={uiPreferences.dyslexiaFont}
								onThemeChange={handleThemeChange}
								onColorModeChange={handleColorModeChange}
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
						</main>
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
							colorMode={uiPreferences.colorMode}
							dyslexiaFont={uiPreferences.dyslexiaFont}
							overviewBlocks={uiPreferences.overviewBlocks}
							overviewBlockChoices={overviewBlockChoices}
							onThemeChange={handleThemeChange}
							onColorModeChange={handleColorModeChange}
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
	colorMode,
	dyslexiaFont,
	onThemeChange,
	onColorModeChange,
	onLanguageChange,
	onDyslexiaToggle,
	overviewBlockChoices,
	onOverviewBlockToggle,
	onOverviewBlockReset,
}: {
	section: NavSection;
	user: DashboardUser;
	locale: AppLocale;
	selectedHospitalId?: number;
	overviewBlocks: OverviewBlockKey[];
	theme: ThemeMode;
	colorMode: ColorMode;
	dyslexiaFont: boolean;
	onThemeChange: (theme: ThemeMode) => void;
	onColorModeChange: (colorMode: ColorMode) => void;
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
				colorMode={colorMode}
				dyslexiaFont={dyslexiaFont}
				overviewBlocks={overviewBlocks}
				overviewBlockChoices={overviewBlockChoices}
				onThemeChange={onThemeChange}
				onColorModeChange={onColorModeChange}
				onLanguageChange={onLanguageChange}
				onDyslexiaToggle={onDyslexiaToggle}
				onOverviewBlockToggle={onOverviewBlockToggle}
				onOverviewBlockReset={onOverviewBlockReset}
			/>
		);
	}

	// Cada rol recibe la sección activa para que pueda renderizar el contenido correcto
	switch (user.rol) {
		case 'ADMIN':
			return (
				<AdminDashboardView
					user={user}
					locale={locale}
					section={section}
					selectedHospitalId={selectedHospitalId}
					overviewBlocks={overviewBlocks}
				/>
			);
		case 'PACIENTE':
			return (
				<PatientDashboardView
					user={user}
					locale={locale}
					section={section}
					selectedHospitalId={selectedHospitalId}
				/>
			);
		case 'MEDICO':
			return (
				<DoctorDashboardView
					user={user}
					locale={locale}
					section={section}
					selectedHospitalId={selectedHospitalId}
				/>
			);
		case 'ENFERMERO':
			return (
				<NurseDashboardView
					user={user}
					locale={locale}
					section={section}
					selectedHospitalId={selectedHospitalId}
				/>
			);
		case 'RECEPCIONISTA':
			return (
				<ReceptionistDashboardView
					user={user}
					locale={locale}
					section={section}
					selectedHospitalId={selectedHospitalId}
				/>
			);
		default:
			return <RoleRenderer user={user} locale={locale} />;
	}
}

function RoleRenderer({
	user,
	locale,
	selectedHospitalId,
	overviewBlocks,
}: {
	user: DashboardUser;
	locale: AppLocale;
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
			return (
				<DoctorDashboardView
					user={user}
					locale={locale}
					selectedHospitalId={selectedHospitalId}
				/>
			);
		case 'ENFERMERO':
			return (
				<NurseDashboardView
					user={user}
					locale={locale}
					selectedHospitalId={selectedHospitalId}
				/>
			);
		case 'RECEPCIONISTA':
			return (
				<ReceptionistDashboardView
					user={user}
					locale={locale}
					selectedHospitalId={selectedHospitalId}
				/>
			);
		default:
			return (
				<PatientDashboardView
					user={user}
					locale={locale}
					section="overview"
					selectedHospitalId={selectedHospitalId}
				/>
			);
	}
}

// Definición visual de cada modo de color accesible.
// Las etiquetas y descripciones se resuelven como funciones directas de paraglide
// (no acceso dinámico por clave), porque paraglide necesita referencias estáticas
// para el tree-shaking y el HMR del compilador en dev mode.
type ColorModeOption = {
	value: ColorMode;
	swatchClass: string;
	getLabel: (locale: AppLocale) => string;
	getDesc: ((locale: AppLocale) => string) | null;
};

const COLOR_MODE_OPTIONS: ColorModeOption[] = [
	{
		value: 'none',
		swatchClass: 'bg-gradient-to-br from-primary/30 to-accent/30',
		getLabel: (locale) => m.dashboardSettingsColorModeNone({}, { locale }),
		getDesc: null,
	},
	{
		value: 'high-contrast',
		swatchClass: 'bg-gradient-to-br from-black to-white border border-black',
		getLabel: (locale) =>
			m.dashboardSettingsColorModeHighContrast({}, { locale }),
		getDesc: (locale) =>
			m.dashboardSettingsColorModeHighContrastDesc({}, { locale }),
	},
	{
		value: 'sepia',
		swatchClass: 'bg-gradient-to-br from-amber-200 to-amber-400',
		getLabel: (locale) => m.dashboardSettingsColorModeSepia({}, { locale }),
		getDesc: (locale) => m.dashboardSettingsColorModeSepiaDesc({}, { locale }),
	},
	{
		value: 'grayscale',
		swatchClass: 'bg-gradient-to-br from-gray-200 to-gray-500',
		getLabel: (locale) => m.dashboardSettingsColorModeGrayscale({}, { locale }),
		getDesc: (locale) =>
			m.dashboardSettingsColorModeGrayscaleDesc({}, { locale }),
	},
	{
		value: 'colorblind-rg',
		swatchClass: 'bg-gradient-to-br from-sky-300 to-orange-300',
		getLabel: (locale) =>
			m.dashboardSettingsColorModeColorblindRg({}, { locale }),
		getDesc: (locale) =>
			m.dashboardSettingsColorModeColorblindRgDesc({}, { locale }),
	},
];

function SettingsPanel({
	locale,
	theme,
	colorMode,
	dyslexiaFont,
	overviewBlocks,
	overviewBlockChoices,
	onThemeChange,
	onColorModeChange,
	onLanguageChange,
	onDyslexiaToggle,
	onOverviewBlockToggle,
	onOverviewBlockReset,
}: {
	locale: AppLocale;
	theme: ThemeMode;
	colorMode: ColorMode;
	dyslexiaFont: boolean;
	overviewBlocks: OverviewBlockKey[];
	overviewBlockChoices: Array<{ key: OverviewBlockKey; label: string }>;
	onThemeChange: (theme: ThemeMode) => void;
	onColorModeChange: (colorMode: ColorMode) => void;
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
					<div className="flex flex-wrap gap-2">
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
						<Button
							type="button"
							variant={locale === 'pt' ? 'default' : 'outline'}
							onClick={() => onLanguageChange('pt')}
						>
							{m.dashboardSettingsLanguagePt({}, { locale })}
						</Button>
						<Button
							type="button"
							variant={locale === 'fr' ? 'default' : 'outline'}
							onClick={() => onLanguageChange('fr')}
						>
							{m.dashboardSettingsLanguageFr({}, { locale })}
						</Button>
						<Button
							type="button"
							variant={locale === 'de' ? 'default' : 'outline'}
							onClick={() => onLanguageChange('de')}
						>
							{m.dashboardSettingsLanguageDe({}, { locale })}
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

				{/* Selector de modo de color accesible.
				    Usamos botones tipo "radio card" en lugar de un <select> para que
				    el usuario vea un swatch visual de cada modo antes de elegir.
				    aria-pressed comunica el estado a lectores de pantalla. */}
				<div className="space-y-2">
					<p className="text-sm font-medium text-foreground">
						{m.dashboardSettingsColorModeTitle({}, { locale })}
					</p>
					<p className="text-xs text-muted-foreground">
						{m.dashboardSettingsColorModeDescription({}, { locale })}
					</p>
					<div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
						{COLOR_MODE_OPTIONS.map((option) => {
							const isActive = colorMode === option.value;
							const label = option.getLabel(locale);
							const desc = option.getDesc ? option.getDesc(locale) : null;
							return (
								<button
									key={option.value}
									type="button"
									aria-pressed={isActive}
									onClick={() => onColorModeChange(option.value)}
									className={cn(
										'flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all',
										isActive
											? 'border-primary bg-primary/8 ring-1 ring-primary/40'
											: 'border-border/60 bg-background/60 hover:border-primary/40 hover:bg-muted/40',
									)}
								>
									{/* Swatch: muestra un degradado representativo del modo */}
									<span
										className={cn(
											'h-7 w-7 shrink-0 rounded-md',
											option.swatchClass,
										)}
										aria-hidden="true"
									/>
									<span className="min-w-0">
										<span className="block truncate text-xs font-medium text-foreground">
											{label}
										</span>
										{desc && (
											<span className="block truncate text-[10px] leading-tight text-muted-foreground">
												{desc}
											</span>
										)}
									</span>
									{/* Indicador visual del estado activo */}
									{isActive && (
										<span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary" />
									)}
								</button>
							);
						})}
					</div>
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

// Daniel Useche
