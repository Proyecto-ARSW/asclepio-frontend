import {
	ArrowRightStartOnRectangleIcon,
	Bars3Icon,
	BeakerIcon,
	BuildingOffice2Icon,
	CalendarDaysIcon,
	ClipboardDocumentListIcon,
	ClockIcon,
	Cog6ToothIcon,
	HomeIcon,
	IdentificationIcon,
	QueueListIcon,
	UserGroupIcon,
	UserIcon,
	XMarkIcon,
} from '@heroicons/react/24/outline';
import {
	BeakerIcon as BeakerIconSolid,
	BuildingOffice2Icon as BuildingOffice2IconSolid,
	CalendarDaysIcon as CalendarDaysIconSolid,
	ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
	ClockIcon as ClockIconSolid,
	Cog6ToothIcon as Cog6ToothIconSolid,
	HomeIcon as HomeIconSolid,
	IdentificationIcon as IdentificationIconSolid,
	QueueListIcon as QueueListIconSolid,
	UserGroupIcon as UserGroupIconSolid,
	UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid';
import { useState } from 'react';
import { Button } from '@/components/ui/button/button.component';
import type { AppLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';

export type NavSection =
	| 'overview'
	| 'hospitals'
	| 'patients'
	| 'appointments'
	| 'queue'
	| 'medicines'
	| 'doctors'
	| 'userManagement'
	| 'disponibilidad'
	| 'historial'
	| 'settings';

interface NavItem {
	key: NavSection;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	iconActive: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navItems: NavItem[] = [
	{ key: 'overview', icon: HomeIcon, iconActive: HomeIconSolid },
	{
		key: 'hospitals',
		icon: BuildingOffice2Icon,
		iconActive: BuildingOffice2IconSolid,
	},
	{ key: 'patients', icon: UserGroupIcon, iconActive: UserGroupIconSolid },
	{
		key: 'appointments',
		icon: CalendarDaysIcon,
		iconActive: CalendarDaysIconSolid,
	},
	{ key: 'queue', icon: QueueListIcon, iconActive: QueueListIconSolid },
	{ key: 'medicines', icon: BeakerIcon, iconActive: BeakerIconSolid },
	{ key: 'doctors', icon: UserIcon, iconActive: UserIconSolid },
	{
		key: 'userManagement',
		icon: IdentificationIcon,
		iconActive: IdentificationIconSolid,
	},
	// Sección de disponibilidad horaria (médicos/enfermeros)
	{
		key: 'disponibilidad',
		icon: ClockIcon,
		iconActive: ClockIconSolid,
	},
	// Sección de historial médico (médicos/pacientes)
	{
		key: 'historial',
		icon: ClipboardDocumentListIcon,
		iconActive: ClipboardDocumentListIconSolid,
	},
	{ key: 'settings', icon: Cog6ToothIcon, iconActive: Cog6ToothIconSolid },
];

interface SidebarNavProps {
	active: NavSection;
	onNavigate: (section: NavSection) => void;
	locale: AppLocale;
	sections?: NavSection[];
	hospitalName?: string;
	userName?: string;
	userRole?: string;
	onLogout?: () => void;
	labels?: {
		brandName?: string;
		logout?: string;
		openMenu?: string;
		closeMenu?: string;
		sections?: Partial<Record<NavSection, string>>;
	};
}

const defaultSectionLabels: Record<NavSection, string> = {
	overview: '',
	hospitals: '',
	patients: '',
	appointments: '',
	queue: '',
	medicines: '',
	doctors: '',
	userManagement: '',
	disponibilidad: '',
	historial: '',
	settings: '',
};

function SidebarContent({
	active,
	onNavigate,
	locale,
	sections,
	hospitalName,
	userName,
	userRole,
	onLogout,
	labels,
	onClose,
}: SidebarNavProps & { onClose?: () => void }) {
	const sectionLabels = {
		...defaultSectionLabels,
		overview: m.dashboardSidebarOverview({}, { locale }),
		hospitals: m.dashboardSidebarHospitals({}, { locale }),
		patients: m.dashboardSidebarPatients({}, { locale }),
		appointments: m.dashboardSidebarAppointments({}, { locale }),
		queue: m.dashboardSidebarQueue({}, { locale }),
		medicines: m.dashboardSidebarMedicines({}, { locale }),
		doctors: m.dashboardSidebarDoctors({}, { locale }),
		userManagement: m.dashboardSidebarUserManagement({}, { locale }),
		disponibilidad: m.dashboardSidebarDisponibilidad({}, { locale }),
		historial: m.dashboardSidebarHistorial({}, { locale }),
		settings: m.dashboardSidebarSettings({}, { locale }),
		...labels?.sections,
	};
	const brandName =
		labels?.brandName ?? m.dashboardSidebarBrandName({}, { locale });
	const logoutLabel =
		labels?.logout ?? m.dashboardSidebarLogout({}, { locale });
	const closeMenuLabel =
		labels?.closeMenu ?? m.dashboardSidebarCloseMenu({}, { locale });
	const visibleNavItems = sections
		? navItems.filter(({ key }) => sections.includes(key))
		: navItems;
	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between border-b border-border px-5 py-4">
				<div className="flex items-center gap-3">
					<img
						src="/favicon.png"
						alt={brandName}
						className="h-9 w-9 shrink-0 rounded-lg border border-border/60 bg-card object-contain p-1"
					/>
					<div className="min-w-0">
						<p className="text-sm font-bold text-foreground">{brandName}</p>
						{hospitalName && (
							<p
								className="max-w-30 truncate text-xs text-muted-foreground"
								title={hospitalName}
							>
								{hospitalName}
							</p>
						)}
					</div>
				</div>
				{onClose && (
					<Button
						type="button"
						aria-label={closeMenuLabel}
						onClick={onClose}
						variant="ghost"
						size="icon-sm"
						className="lg:hidden"
					>
						<XMarkIcon className="h-5 w-5" />
					</Button>
				)}
			</div>

			<nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
				{visibleNavItems.map(({ key, icon: Icon, iconActive: IconActive }) => {
					const isActive = active === key;
					return (
						<Button
							key={key}
							type="button"
							onClick={() => {
								onNavigate(key);
								onClose?.();
							}}
							variant={isActive ? 'secondary' : 'ghost'}
							className="h-10 w-full justify-start gap-3"
						>
							{isActive ? (
								<IconActive className="h-4.5 w-4.5 shrink-0" />
							) : (
								<Icon className="h-4.5 w-4.5 shrink-0" />
							)}
							{sectionLabels[key]}
						</Button>
					);
				})}
			</nav>

			<div className="border-t border-border px-3 py-3">
				{(userName || userRole) && (
					<div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
							<span className="text-xs font-semibold text-primary">
								{userName?.[0] ?? '?'}
							</span>
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-medium text-foreground">
								{userName}
							</p>
							<p className="text-xs text-muted-foreground">{userRole}</p>
						</div>
					</div>
				)}
				<Button
					type="button"
					onClick={onLogout}
					variant="destructive"
					className="w-full justify-start gap-3"
				>
					<ArrowRightStartOnRectangleIcon className="h-4.5 w-4.5 shrink-0" />
					{logoutLabel}
				</Button>
			</div>
		</div>
	);
}

export function SidebarNav(props: SidebarNavProps) {
	const [mobileOpen, setMobileOpen] = useState(false);
	const { locale } = props;
	const openMenuLabel =
		props.labels?.openMenu ?? m.dashboardSidebarOpenMenu({}, { locale });
	const closeMenuLabel =
		props.labels?.closeMenu ?? m.dashboardSidebarCloseMenu({}, { locale });

	return (
		<>
			<Button
				type="button"
				aria-label={openMenuLabel}
				onClick={() => setMobileOpen(true)}
				variant="outline"
				size="icon"
				className="fixed top-4 left-4 z-40 lg:hidden"
			>
				<Bars3Icon className="h-5 w-5" />
			</Button>

			{mobileOpen && (
				<button
					type="button"
					aria-label={closeMenuLabel}
					className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
					onClick={() => setMobileOpen(false)}
					onKeyDown={(event) => event.key === 'Escape' && setMobileOpen(false)}
				/>
			)}

			<aside
				className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:shrink-0 ${
					mobileOpen ? 'translate-x-0' : '-translate-x-full'
				}`}
			>
				<SidebarContent {...props} onClose={() => setMobileOpen(false)} />
			</aside>
		</>
	);
}
