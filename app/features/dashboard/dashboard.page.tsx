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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select/select.component';
import { Switch } from '@/components/ui/switch/switch.component';
import { AdminDashboardView } from '@/features/dashboard/roles/admin-dashboard.view';
import type { DashboardUser } from '@/features/dashboard/roles/dashboard-role.types';
import { DoctorDashboardView } from '@/features/dashboard/roles/doctor-dashboard.view';
import { NurseDashboardView } from '@/features/dashboard/roles/nurse-dashboard.view';
import { PatientDashboardView } from '@/features/dashboard/roles/patient-dashboard.view';
import { ReceptionistDashboardView } from '@/features/dashboard/roles/receptionist-dashboard.view';
import type { AppLocale } from '@/features/i18n/locale-path';
import { currentLocale, localePath } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import {
	applyUiPreferences,
	readUiPreferences,
	saveUiPreferences,
	type ThemeMode,
	type UiPreferences,
} from '@/features/preferences/ui-preferences';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import type { Route } from './+types/dashboard.page';

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

	if (!user) {
		return null;
	}

	const hasSidebarNavigation =
		user.rol === 'ADMIN' || user.rol === 'RECEPCIONISTA';

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
							<Badge variant="secondary">{user.rol}</Badge>
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
							userRole={user.rol}
							onLogout={handleLogout}
						/>
						<div className="w-full min-w-0 pt-14 lg:pt-0">
							<SidebarSectionRenderer
								section={activeSection}
								user={roleUser}
								locale={locale}
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
							/>
						</div>
					</div>
				) : (
					<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
						<RoleRenderer user={roleUser} locale={locale} />
						<SettingsPanel
							locale={locale}
							theme={uiPreferences.theme}
							dyslexiaFont={uiPreferences.dyslexiaFont}
							onThemeChange={handleThemeChange}
							onLanguageChange={handleLanguageChange}
							onDyslexiaToggle={(enabled) =>
								setUiPreferences((prev) => ({ ...prev, dyslexiaFont: enabled }))
							}
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
	theme,
	dyslexiaFont,
	onThemeChange,
	onLanguageChange,
	onDyslexiaToggle,
}: {
	section: NavSection;
	user: DashboardUser;
	locale: 'es' | 'en';
	theme: ThemeMode;
	dyslexiaFont: boolean;
	onThemeChange: (theme: ThemeMode) => void;
	onLanguageChange: (locale: AppLocale) => void;
	onDyslexiaToggle: (enabled: boolean) => void;
}) {
	if (section === 'settings') {
		return (
			<SettingsPanel
				locale={locale}
				theme={theme}
				dyslexiaFont={dyslexiaFont}
				onThemeChange={onThemeChange}
				onLanguageChange={onLanguageChange}
				onDyslexiaToggle={onDyslexiaToggle}
			/>
		);
	}

	if (section === 'overview') {
		return <RoleRenderer user={user} locale={locale} />;
	}

	return (
		<Card className="border-border/80 bg-card/90 shadow-sm">
			<CardHeader>
				<CardTitle>{m.dashboardSidebarSettings({}, { locale })}</CardTitle>
				<CardDescription>
					{m.dashboardComingSoonDescription({}, { locale })}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					{m.dashboardComingSoonDescription({}, { locale })}
				</p>
			</CardContent>
		</Card>
	);
}

function RoleRenderer({
	user,
	locale,
}: {
	user: DashboardUser;
	locale: 'es' | 'en';
}) {
	switch (user.rol) {
		case 'ADMIN':
			return <AdminDashboardView user={user} locale={locale} />;
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
	onThemeChange,
	onLanguageChange,
	onDyslexiaToggle,
}: {
	locale: 'es' | 'en';
	theme: ThemeMode;
	dyslexiaFont: boolean;
	onThemeChange: (theme: ThemeMode) => void;
	onLanguageChange: (locale: AppLocale) => void;
	onDyslexiaToggle: (enabled: boolean) => void;
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
			</CardContent>
		</Card>
	);
}
