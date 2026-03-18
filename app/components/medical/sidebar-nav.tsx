import { useState } from 'react';
import {
	HomeIcon,
	BuildingOffice2Icon,
	UserGroupIcon,
	CalendarDaysIcon,
	QueueListIcon,
	BeakerIcon,
	UserIcon,
	ArrowRightStartOnRectangleIcon,
	HeartIcon,
	Bars3Icon,
	XMarkIcon,
} from '@heroicons/react/24/outline';
import {
	HomeIcon as HomeIconSolid,
	BuildingOffice2Icon as BuildingOffice2IconSolid,
	UserGroupIcon as UserGroupIconSolid,
	CalendarDaysIcon as CalendarDaysIconSolid,
	QueueListIcon as QueueListIconSolid,
	BeakerIcon as BeakerIconSolid,
	UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid';

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
	{ key: 'overview', label: 'Inicio', icon: HomeIcon, iconActive: HomeIconSolid },
	{ key: 'hospitals', label: 'Hospitales', icon: BuildingOffice2Icon, iconActive: BuildingOffice2IconSolid },
	{ key: 'patients', label: 'Pacientes', icon: UserGroupIcon, iconActive: UserGroupIconSolid },
	{ key: 'appointments', label: 'Citas', icon: CalendarDaysIcon, iconActive: CalendarDaysIconSolid },
	{ key: 'queue', label: 'Turnos', icon: QueueListIcon, iconActive: QueueListIconSolid },
	{ key: 'medicines', label: 'Medicamentos', icon: BeakerIcon, iconActive: BeakerIconSolid },
	{ key: 'doctors', label: 'Médicos', icon: UserIcon, iconActive: UserIconSolid },
];

interface SidebarNavProps {
	active: NavSection;
	onNavigate: (section: NavSection) => void;
	hospitalName?: string;
	userName?: string;
	userRole?: string;
	onLogout?: () => void;
}

function SidebarContent({
	active,
	onNavigate,
	hospitalName,
	userName,
	userRole,
	onLogout,
	onClose,
}: SidebarNavProps & { onClose?: () => void }) {
	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 flex-shrink-0">
						<HeartIcon className="h-5 w-5 text-white" />
					</div>
					<div className="min-w-0">
						<p className="font-bold text-gray-900 text-sm">Asclepio</p>
						{hospitalName && (
							<p className="truncate text-xs text-gray-400 max-w-[120px]" title={hospitalName}>
								{hospitalName}
							</p>
						)}
					</div>
				</div>
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors lg:hidden"
					>
						<XMarkIcon className="h-5 w-5" />
					</button>
				)}
			</div>

			<nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
				{navItems.map(({ key, label, icon: Icon, iconActive: IconActive }) => {
					const isActive = active === key;
					return (
						<button
							key={key}
							type="button"
							onClick={() => {
								onNavigate(key);
								onClose?.();
							}}
							className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
								isActive
									? 'bg-blue-50 text-blue-700'
									: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
							}`}
						>
							{isActive ? (
								<IconActive className="h-[18px] w-[18px] flex-shrink-0" />
							) : (
								<Icon className="h-[18px] w-[18px] flex-shrink-0" />
							)}
							{label}
						</button>
					);
				})}
			</nav>

			<div className="border-t border-gray-100 px-3 py-3">
				{(userName || userRole) && (
					<div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
							<span className="text-xs font-semibold text-blue-600">
								{userName?.[0] ?? '?'}
							</span>
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-medium text-gray-800">{userName}</p>
							<p className="text-xs text-gray-400">{userRole}</p>
						</div>
					</div>
				)}
				<button
					type="button"
					onClick={onLogout}
					className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
				>
					<ArrowRightStartOnRectangleIcon className="h-[18px] w-[18px] flex-shrink-0" />
					Cerrar sesión
				</button>
			</div>
		</div>
	);
}

export function SidebarNav(props: SidebarNavProps) {
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				onClick={() => setMobileOpen(true)}
				className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors lg:hidden"
			>
				<Bars3Icon className="h-5 w-5" />
			</button>

			{mobileOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/40 lg:hidden"
					onClick={() => setMobileOpen(false)}
					onKeyDown={(e) => e.key === 'Escape' && setMobileOpen(false)}
					role="button"
					tabIndex={-1}
				/>
			)}

			<aside
				className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:flex-shrink-0 ${
					mobileOpen ? 'translate-x-0' : '-translate-x-full'
				}`}
			>
				<SidebarContent {...props} onClose={() => setMobileOpen(false)} />
			</aside>
		</>
	);
}
