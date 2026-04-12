import {
	BellAlertIcon,
	BellIcon,
	CheckIcon,
	TrashIcon,
	XMarkIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import type { AppLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { gqlMutation, gqlQuery } from '@/lib/graphql-client';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Notificacion {
	id: string;
	usuarioId: string;
	titulo: string;
	mensaje: string;
	tipo: string;
	leida: boolean;
	referenciaId: string | null;
	creadoEn: string;
}

// ─── Queries & Mutations ──────────────────────────────────────────────────────

const NOTIFICACIONES_QUERY = `
	query MisNotificaciones {
		notificaciones {
			id usuarioId titulo mensaje tipo leida referenciaId creadoEn
		}
	}
`;

const CONTEO_SIN_LEER_QUERY = `
	query ConteoSinLeer {
		conteoSinLeer
	}
`;

const MARCAR_LEIDA = `
	mutation MarcarLeida($id: ID!) {
		marcarNotificacionLeida(id: $id) { id leida }
	}
`;

const MARCAR_TODAS_LEIDAS = `
	mutation MarcarTodasLeidas {
		marcarTodasLeidas
	}
`;

const ELIMINAR_NOTIFICACION = `
	mutation EliminarNotificacion($id: ID!) {
		eliminarNotificacion(id: $id) { id }
	}
`;

const LIMPIAR_LEIDAS = `
	mutation LimpiarLeidas {
		limpiarNotificacionesLeidas
	}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Mapeo de tipo de notificación a variante de badge para diferenciar visualmente
// los distintos contextos (cita, sistema, etc.)
function tipoBadgeVariant(
	tipo: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (tipo) {
		case 'CITA_CONFIRMADA':
		case 'SLOT_DISPONIBLE':
			return 'default';
		case 'CITA_CANCELADA':
		case 'REAGENDADO_REQUERIDO':
			return 'destructive';
		case 'CITA_MOVIDA':
			return 'secondary';
		default:
			return 'outline';
	}
}

function tipoLabel(tipo: string, locale: AppLocale): string {
	const labels: Record<string, Record<string, string>> = {
		CITA_CONFIRMADA: { es: 'Cita confirmada', en: 'Appointment confirmed' },
		CITA_CANCELADA: { es: 'Cita cancelada', en: 'Appointment cancelled' },
		CITA_MOVIDA: { es: 'Cita reagendada', en: 'Appointment rescheduled' },
		SLOT_DISPONIBLE: { es: 'Disponibilidad', en: 'Availability' },
		REAGENDADO_REQUERIDO: {
			es: 'Reagendar requerido',
			en: 'Reschedule required',
		},
		SISTEMA: { es: 'Sistema', en: 'System' },
	};
	return labels[tipo]?.[locale] ?? labels[tipo]?.es ?? tipo;
}

function timeAgo(dateStr: string, locale: AppLocale): string {
	const now = Date.now();
	const then = new Date(dateStr).getTime();
	const diffMs = now - then;
	const mins = Math.floor(diffMs / 60_000);
	if (mins < 1) return locale === 'es' ? 'Ahora' : 'Just now';
	if (mins < 60)
		return locale === 'es' ? `Hace ${mins} min` : `${mins} min ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return locale === 'es' ? `Hace ${hours}h` : `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return locale === 'es' ? `Hace ${days}d` : `${days}d ago`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface NotificationBellProps {
	locale: AppLocale;
}

export function NotificationBell({ locale }: NotificationBellProps) {
	const [open, setOpen] = useState(false);
	const [notifications, setNotifications] = useState<Notificacion[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);

	// Polling del conteo de no leídas cada 8 segundos — ligero (solo un int)
	const fetchCount = useCallback(async () => {
		try {
			const res = await gqlQuery<{ conteoSinLeer: number }>(
				CONTEO_SIN_LEER_QUERY,
			);
			setUnreadCount(res.conteoSinLeer);
		} catch {
			// Silenciar errores de red para no interrumpir la UX
		}
	}, []);

	useEffect(() => {
		void fetchCount();
		const interval = setInterval(() => void fetchCount(), 8000);
		return () => clearInterval(interval);
	}, [fetchCount]);

	// Cerrar panel al hacer clic fuera — patrón estándar de "click outside"
	useEffect(() => {
		if (!open) return;
		function handleClickOutside(e: MouseEvent) {
			if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [open]);

	async function handleOpen() {
		setOpen((prev) => !prev);
		if (!open) {
			setLoading(true);
			try {
				const res = await gqlQuery<{ notificaciones: Notificacion[] }>(
					NOTIFICACIONES_QUERY,
				);
				setNotifications(res.notificaciones);
			} catch {
				// empty
			} finally {
				setLoading(false);
			}
		}
	}

	async function handleMarkRead(id: string) {
		try {
			await gqlMutation(MARCAR_LEIDA, { id });
			setNotifications((prev) =>
				prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
			);
			setUnreadCount((c) => Math.max(0, c - 1));
		} catch {
			// empty
		}
	}

	async function handleMarkAllRead() {
		try {
			await gqlMutation(MARCAR_TODAS_LEIDAS, {});
			setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
			setUnreadCount(0);
		} catch {
			// empty
		}
	}

	async function handleDelete(id: string) {
		const wasUnread = notifications.find((n) => n.id === id && !n.leida);
		try {
			await gqlMutation(ELIMINAR_NOTIFICACION, { id });
			setNotifications((prev) => prev.filter((n) => n.id !== id));
			if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
		} catch {
			// empty
		}
	}

	async function handleClearRead() {
		try {
			await gqlMutation(LIMPIAR_LEIDAS, {});
			setNotifications((prev) => prev.filter((n) => !n.leida));
		} catch {
			// empty
		}
	}

	const unread = notifications.filter((n) => !n.leida);
	const read = notifications.filter((n) => n.leida);

	return (
		<div className="relative" ref={panelRef}>
			{/* Botón campana con badge de conteo */}
			<Button
				type="button"
				variant="outline"
				size="icon-sm"
				onClick={handleOpen}
				aria-label={
					locale === 'es'
						? `Notificaciones (${unreadCount} sin leer)`
						: `Notifications (${unreadCount} unread)`
				}
				className="relative"
			>
				{unreadCount > 0 ? (
					<BellAlertIcon className="h-4 w-4" />
				) : (
					<BellIcon className="h-4 w-4" />
				)}
				{/* Badge numérico — solo visible si hay no leídas */}
				{unreadCount > 0 && (
					<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				)}
			</Button>

			{/* Panel desplegable de notificaciones */}
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: -8, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -8, scale: 0.95 }}
						transition={{ duration: 0.18 }}
						className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-card shadow-xl sm:w-96"
					>
						{/* Cabecera del panel */}
						<div className="flex items-center justify-between border-b border-border px-4 py-3">
							<p className="text-sm font-semibold text-foreground">
								{locale === 'es' ? 'Notificaciones' : 'Notifications'}
							</p>
							<div className="flex items-center gap-1">
								{unread.length > 0 && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={handleMarkAllRead}
										className="h-7 gap-1 px-2 text-xs"
									>
										<CheckIcon className="h-3 w-3" />
										{locale === 'es' ? 'Leer todas' : 'Read all'}
									</Button>
								)}
								{read.length > 0 && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={handleClearRead}
										className="h-7 gap-1 px-2 text-xs text-muted-foreground"
									>
										<TrashIcon className="h-3 w-3" />
										{locale === 'es' ? 'Limpiar' : 'Clear'}
									</Button>
								)}
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => setOpen(false)}
									aria-label={m.dashboardSidebarCloseMenu({}, { locale })}
									className="h-7 w-7"
								>
									<XMarkIcon className="h-4 w-4" />
								</Button>
							</div>
						</div>

						{/* Lista de notificaciones — scroll limitado */}
						<div className="max-h-80 overflow-y-auto">
							{loading ? (
								<div className="space-y-2 p-4">
									{[1, 2, 3].map((i) => (
										<div
											key={i}
											className="h-14 animate-pulse rounded-lg bg-muted"
										/>
									))}
								</div>
							) : notifications.length === 0 ? (
								<div className="flex flex-col items-center gap-2 py-10">
									<BellIcon className="h-8 w-8 text-muted-foreground/40" />
									<p className="text-sm text-muted-foreground">
										{locale === 'es'
											? 'No hay notificaciones'
											: 'No notifications'}
									</p>
								</div>
							) : (
								notifications.map((n) => (
									<div
										key={n.id}
										className={`flex items-start gap-3 border-b border-border/50 px-4 py-3 transition-colors ${
											n.leida ? 'bg-transparent opacity-65' : 'bg-primary/3'
										}`}
									>
										{/* Indicador de no leída — punto azul */}
										<div className="mt-1.5 shrink-0">
											{!n.leida ? (
												<span className="block h-2 w-2 rounded-full bg-primary" />
											) : (
												<span className="block h-2 w-2" />
											)}
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<p className="truncate text-xs font-semibold text-foreground">
													{n.titulo}
												</p>
												<Badge
													variant={tipoBadgeVariant(n.tipo)}
													className="shrink-0 text-[9px]"
												>
													{tipoLabel(n.tipo, locale)}
												</Badge>
											</div>
											<p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
												{n.mensaje}
											</p>
											<p className="mt-1 text-[10px] text-muted-foreground/70">
												{timeAgo(n.creadoEn, locale)}
											</p>
										</div>
										<div className="flex shrink-0 flex-col gap-1">
											{!n.leida && (
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													onClick={() => handleMarkRead(n.id)}
													aria-label={
														locale === 'es'
															? 'Marcar como leída'
															: 'Mark as read'
													}
													className="h-6 w-6"
												>
													<CheckIcon className="h-3 w-3" />
												</Button>
											)}
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												onClick={() => handleDelete(n.id)}
												aria-label={locale === 'es' ? 'Eliminar' : 'Delete'}
												className="h-6 w-6 text-muted-foreground hover:text-destructive"
											>
												<TrashIcon className="h-3 w-3" />
											</Button>
										</div>
									</div>
								))
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

// Daniel Useche
