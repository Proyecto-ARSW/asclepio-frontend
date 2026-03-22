import {
	ArrowRightStartOnRectangleIcon,
	Bars3Icon,
	BeakerIcon,
	BuildingOffice2Icon,
	CalendarDaysIcon,
	HeartIcon,
	HomeIcon,
	QueueListIcon,
	UserGroupIcon,
	UserIcon,
	XMarkIcon,
} from '@heroicons/react/24/outline';
import {
	BeakerIcon as BeakerIconSolid,
	BuildingOffice2Icon as BuildingOffice2IconSolid,
	CalendarDaysIcon as CalendarDaysIconSolid,
	HomeIcon as HomeIconSolid,
	QueueListIcon as QueueListIconSolid,
	UserGroupIcon as UserGroupIconSolid,
	UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid';
import { useState } from 'react';
import { Button } from '@/components/ui/button/button.component';

export type NavSection =
	| 'overview'
	| 'hospitals'
	| 'patients'
	| 'appointments'
	| 'queue'
	| 'medicines'
	| 'doctors';

interface NavItem {
	key: NavSection;
	label: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	iconActive: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navItems: NavItem[] = [
	{
		key: 'overview',
		label: 'Inicio',
		icon: HomeIcon,
		iconActive: HomeIconSolid,
	},
	{
		key: 'hospitals',
		label: 'Hospitales',
		icon: BuildingOffice2Icon,
		iconActive: BuildingOffice2IconSolid,
	},
	{
		key: 'patients',
		label: 'Pacientes',
		icon: UserGroupIcon,
		iconActive: UserGroupIconSolid,
	},
	{
		key: 'appointments',
		label: 'Citas',
		icon: CalendarDaysIcon,
		iconActive: CalendarDaysIconSolid,
	},
	{
		key: 'queue',
		label: 'Turnos',
		icon: QueueListIcon,
		iconActive: QueueListIconSolid,
	},
	{
		key: 'medicines',
		label: 'Medicamentos',
		icon: BeakerIcon,
		iconActive: BeakerIconSolid,
	},
	{
		key: 'doctors',
		label: 'Médicos',
		icon: UserIcon,
		iconActive: UserIconSolid,
	},
];

interface SidebarNavProps {
	active: NavSection;
	onNavigate: (section: NavSection) => void;
	hospitalName?: string;
	userName?: string;
	userRole?: string;
	onLogout?: () => void;
	labels?: {
		brandName?: string;
		logout?: string;
		sections?: Partial<Record<NavSection, string>>;
	};
}

const defaultSectionLabels: Record<NavSection, string> = {
	overview: 'Inicio',
	hospitals: 'Hospitales',
	patients: 'Pacientes',
	appointments: 'Citas',
	queue: 'Turnos',
	medicines: 'Medicamentos',
	doctors: 'Medicos',
};

function SidebarContent({
	active,
	onNavigate,
	hospitalName,
	userName,
	userRole,
	onLogout,
	labels,
	onClose,
}: SidebarNavProps & { onClose?: () => void }) {
	const sectionLabels = { ...defaultSectionLabels, ...labels?.sections };
	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between border-b border-border px-5 py-4">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<HeartIcon className="h-5 w-5" />
					</div>
					<div className="min-w-0">
						<p className="text-sm font-bold text-foreground">
							{labels?.brandName ?? 'Asclepio'}
						</p>
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
				{navItems.map(({ key, icon: Icon, iconActive: IconActive }) => {
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
					{labels?.logout ?? 'Cerrar sesion'}
				</Button>
			</div>
		</div>
	);
}

export function SidebarNav(props: SidebarNavProps) {
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<>
			<Button
				type="button"
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
					aria-label="Close menu"
					className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
					onClick={() => setMobileOpen(false)}
					onKeyDown={(e) => e.key === 'Escape' && setMobileOpen(false)}
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
