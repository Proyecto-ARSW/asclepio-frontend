import {
	ArrowRightStartOnRectangleIcon,
	Bars3Icon,
	BeakerIcon,
	BuildingOffice2Icon,
	CalendarDaysIcon,
	ClipboardDocumentListIcon,
	ClockIcon,
	Cog6ToothIcon,
	CubeTransparentIcon,
	DocumentCheckIcon,
	DocumentTextIcon,
	HomeIcon,
	IdentificationIcon,
	QueueListIcon,
	SparklesIcon,
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
	CubeTransparentIcon as CubeTransparentIconSolid,
	DocumentCheckIcon as DocumentCheckIconSolid,
	DocumentTextIcon as DocumentTextIconSolid,
	HomeIcon as HomeIconSolid,
	IdentificationIcon as IdentificationIconSolid,
	QueueListIcon as QueueListIconSolid,
	SparklesIcon as SparklesIconSolid,
	UserGroupIcon as UserGroupIconSolid,
	UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button/button.component';
import type { AppLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';

export type NavSection =
	| 'overview'
	| 'hospitals'
	| 'patients'
	| 'triage'
	| 'appointments'
	| 'queue'
	| 'ai'
	| 'medicines'
	| 'doctors'
	| 'userManagement'
	| 'disponibilidad'
	| 'historial'
	| 'consentimientos'
	| 'recetas'
	| 'anatomy3d'
	| 'profile'
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
	{ key: 'triage', icon: BeakerIcon, iconActive: BeakerIconSolid },
	{
		key: 'appointments',
		icon: CalendarDaysIcon,
		iconActive: CalendarDaysIconSolid,
	},
	{ key: 'queue', icon: QueueListIcon, iconActive: QueueListIconSolid },
	{ key: 'ai', icon: SparklesIcon, iconActive: SparklesIconSolid },
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
	// Consentimientos informados (Ley 23/1981 Colombia)
	{
		key: 'consentimientos',
		icon: DocumentCheckIcon,
		iconActive: DocumentCheckIconSolid,
	},
	// Recetas médicas
	{
		key: 'recetas',
		icon: DocumentTextIcon,
		iconActive: DocumentTextIconSolid,
	},
	// Anatomía 3D interactiva — visor de modelos que el médico usa para
	// explicar al paciente órganos, sistemas y estructuras durante la consulta.
	{
		key: 'anatomy3d',
		icon: CubeTransparentIcon,
		iconActive: CubeTransparentIconSolid,
	},
	// Perfil personal del paciente
	{ key: 'profile', icon: UserIcon, iconActive: UserIconSolid },
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
	triage: '',
	appointments: '',
	queue: '',
	ai: '',
	medicines: '',
	doctors: '',
	userManagement: '',
	disponibilidad: '',
	historial: '',
	consentimientos: '',
	recetas: '',
	anatomy3d: '',
	profile: '',
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
		triage: m.triageNewMenu({}, { locale }),
		appointments: m.dashboardSidebarAppointments({}, { locale }),
		queue: m.dashboardSidebarQueue({}, { locale }),
		ai: m.dashboardSidebarAi({}, { locale }),
		medicines: m.dashboardSidebarMedicines({}, { locale }),
		doctors: m.dashboardSidebarDoctors({}, { locale }),
		userManagement: m.dashboardSidebarUserManagement({}, { locale }),
		disponibilidad: m.dashboardSidebarDisponibilidad({}, { locale }),
		historial: m.dashboardSidebarHistorial({}, { locale }),
		consentimientos: m.dashboardSidebarConsentimientos({}, { locale }),
		recetas: m.dashboardSidebarRecetas({}, { locale }),
		anatomy3d: m.dashboardSidebarAnatomy3d({}, { locale }),
		profile: m.dashboardSidebarProfile({}, { locale }),
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

			{/* role="list" + aria-label: el lector de pantalla anuncia "X de Y elementos"
			    al navegar con Tab/flechas, y el aria-label identifica el propósito del nav. */}
			<nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
				<ul className="space-y-0.5">
					{visibleNavItems.map(
						({ key, icon: Icon, iconActive: IconActive }) => {
							const isActive = active === key;
							return (
								<li key={key}>
									<Button
										type="button"
										onClick={() => {
											onNavigate(key);
											onClose?.();
											// Despacha el label localizado al guía de voz vía CustomEvent.
											// Desacoplamiento: sidebar no sabe nada de VoiceGuideButton.
											if (typeof window !== 'undefined') {
												window.dispatchEvent(
													new CustomEvent('asclepio:section-change', {
														detail: { label: sectionLabels[key] },
													}),
												);
											}
										}}
										variant={isActive ? 'secondary' : 'ghost'}
										aria-current={isActive ? 'page' : undefined}
										className="h-10 w-full justify-start gap-3"
									>
										{isActive ? (
											<IconActive
												className="h-4.5 w-4.5 shrink-0"
												aria-hidden="true"
											/>
										) : (
											<Icon
												className="h-4.5 w-4.5 shrink-0"
												aria-hidden="true"
											/>
										)}
										{sectionLabels[key]}
									</Button>
								</li>
							);
						},
					)}
				</ul>
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
					className="h-10 w-full justify-start gap-3 min-w-0"
				>
					<ArrowRightStartOnRectangleIcon className="h-4.5 w-4.5 shrink-0" />
					<span className="truncate">{logoutLabel}</span>
				</Button>
			</div>
		</div>
	);
}

export function SidebarNav(props: SidebarNavProps) {
	const [mobileOpen, setMobileOpen] = useState(false);
	// portalEl se resuelve solo en el cliente para evitar errores de SSR.
	// createPortal requiere un nodo DOM real; durante el SSR no existe.
	const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
	const { locale } = props;
	const openMenuLabel =
		props.labels?.openMenu ?? m.dashboardSidebarOpenMenu({}, { locale });
	const closeMenuLabel =
		props.labels?.closeMenu ?? m.dashboardSidebarCloseMenu({}, { locale });

	useEffect(() => {
		// #portal-root vive fuera de #filter-scope en root.tsx, por eso los
		// elementos fixed que se montan aquí mantienen su referencia al viewport
		// aunque el resto de la página tenga filter:grayscale o colorblind.
		setPortalEl(document.getElementById('portal-root'));
	}, []);

	function toggleMenu(next: boolean) {
		setMobileOpen(next);
		// Notifica al guía de voz cuando el menú se abre o cierra.
		if (typeof window !== 'undefined') {
			window.dispatchEvent(
				new CustomEvent('asclepio:section-change', {
					detail: { label: next ? openMenuLabel : closeMenuLabel },
				}),
			);
		}
	}

	// El FAB se renderiza vía portal fuera del filter-scope para que
	// position:fixed funcione relativo al viewport, no al contenedor filtrado.
	const fabContent = (
		<>
			<Button
				type="button"
				aria-label={mobileOpen ? closeMenuLabel : openMenuLabel}
				aria-expanded={mobileOpen}
				aria-controls="sidebar-aside"
				onClick={() => toggleMenu(!mobileOpen)}
				data-open={mobileOpen ? 'true' : 'false'}
				variant="default"
				size="sm"
				className={`sidebar-mobile-fab fixed z-50 border border-primary/20 bg-linear-to-r from-primary to-[color-mix(in_oklch,var(--color-primary)_58%,white)] text-primary-foreground shadow-[0_18px_35px_-16px_var(--color-primary)] transition-all duration-300 active:scale-[0.98] lg:hidden ${
					mobileOpen
						? // Cuando está abierto mostramos solo icono para evitar overflow en
							// pantallas estrechas (< 320 px): el texto añadiría ~80 px extra.
							'top-1/2 left-64 -translate-y-1/2 h-11 w-11 rounded-l-none rounded-r-2xl border-l-0 p-0 hover:translate-x-1'
						: 'bottom-5 left-1/2 h-11 -translate-x-1/2 gap-2 rounded-full px-4 hover:scale-[1.03] hover:shadow-[0_24px_45px_-18px_var(--color-primary)] sm:left-5 sm:translate-x-0'
				}`}
			>
				<span className="relative flex h-5 w-5 items-center justify-center">
					<span
						className={`absolute h-5 w-5 rounded-full bg-primary/35 motion-reduce:hidden ${
							mobileOpen
								? 'motion-safe:animate-[ping_1.8s_ease-in-out_infinite]'
								: 'motion-safe:animate-ping'
						}`}
						aria-hidden="true"
					/>
					{mobileOpen ? (
						<XMarkIcon className="relative h-5 w-5" aria-hidden="true" />
					) : (
						<Bars3Icon className="relative h-5 w-5" aria-hidden="true" />
					)}
				</span>
				{/* Label solo visible cuando está cerrado; cuando está abierto
				    el icono X comunica la acción por sí solo y el aria-label lo confirma. */}
				{!mobileOpen && (
					<span className="text-xs font-semibold tracking-wide">
						{openMenuLabel}
					</span>
				)}
			</Button>

			{mobileOpen && (
				<button
					type="button"
					aria-label={closeMenuLabel}
					className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
					onClick={() => toggleMenu(false)}
					onKeyDown={(event) => event.key === 'Escape' && toggleMenu(false)}
				/>
			)}
		</>
	);

	// ── Sidebar móvil en el portal ──────────────────────────────────────────────
	// Problema: cuando se aplica un filtro CSS (grayscale, daltonismo) a #filter-scope,
	// ese div crea un nuevo "containing block" para position:fixed. Los elementos fixed
	// dentro de filter-scope quedan posicionados relativo a él, no al viewport.
	// Además, #portal-root viene DESPUÉS de #filter-scope en el DOM; por tanto, todo
	// lo renderizado en portal-root se pinta ENCIMA de filter-scope sin importar z-index.
	// Resultado: el backdrop (z-40 en portal) tapaba el sidebar (z-50 en filter-scope).
	//
	// Solución: el sidebar móvil también se monta en portal-root.
	// Así sidebar (z-50) y backdrop (z-40) comparten el mismo stacking context
	// y z-50 > z-40 funciona correctamente.
	// El sidebar de escritorio (lg:) sigue siendo estático en el DOM normal.
	const mobileSidebar = (
		<aside
			id="sidebar-aside"
			aria-label={m.dashboardSidebarBrandName({}, { locale })}
			className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out lg:hidden ${
				mobileOpen ? 'translate-x-0' : '-translate-x-full'
			}`}
		>
			<SidebarContent {...props} onClose={() => toggleMenu(false)} />
		</aside>
	);

	return (
		<>
			{/* Portal agrupa FAB + backdrop + sidebar-móvil fuera de filter-scope.
			    Fallback inline hasta que useEffect monte el portal en el cliente. */}
			{portalEl ? (
				createPortal(
					<>
						{mobileSidebar}
						{fabContent}
					</>,
					portalEl,
				)
			) : (
				<>
					{mobileSidebar}
					{fabContent}
				</>
			)}

			{/* Sidebar de escritorio: estático, fuera del portal, sin position:fixed */}
			<aside
				aria-label={m.dashboardSidebarBrandName({}, { locale })}
				className="hidden lg:flex lg:static lg:shrink-0 lg:w-64 border-r border-border bg-sidebar text-sidebar-foreground"
			>
				<SidebarContent {...props} />
			</aside>
		</>
	);
}
