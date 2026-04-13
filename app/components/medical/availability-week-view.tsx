import { ClockIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge/badge.component';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import type { AppLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface AvailabilitySlot {
	id: number;
	diaSemana: number;
	horaInicio: string;
	horaFin: string;
	duracionCita?: number;
	activo: boolean;
}

interface AvailabilityWeekViewProps {
	slots: AvailabilitySlot[];
	locale: AppLocale;
	personName?: string;
	personRole?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Lunes=1 ... Domingo=0 → reordenamos a Lunes-Domingo para la vista semanal.
// JavaScript usa 0=Domingo, 1=Lunes ... 6=Sábado. Nosotros mostramos Lun-Dom.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function getDayLabel(day: number, locale: AppLocale): string {
	const labels: Record<number, () => string> = {
		0: () => m.daySunday({}, { locale }),
		1: () => m.dayMonday({}, { locale }),
		2: () => m.dayTuesday({}, { locale }),
		3: () => m.dayWednesday({}, { locale }),
		4: () => m.dayThursday({}, { locale }),
		5: () => m.dayFriday({}, { locale }),
		6: () => m.daySaturday({}, { locale }),
	};
	return labels[day]?.() ?? String(day);
}

function getDayAbbr(day: number, locale: AppLocale): string {
	return getDayLabel(day, locale).slice(0, 3);
}

// Normaliza horas ISO (2000-01-01T08:00:00.000Z) a formato legible HH:MM
function formatTime(raw: string): string {
	if (raw.includes('T')) {
		const date = new Date(raw);
		const h = date.getUTCHours().toString().padStart(2, '0');
		const mins = date.getUTCMinutes().toString().padStart(2, '0');
		return `${h}:${mins}`;
	}
	return raw.slice(0, 5);
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function AvailabilityWeekView({
	slots,
	locale,
	personName,
	personRole,
}: AvailabilityWeekViewProps) {
	// Agrupa los bloques por día para la grilla semanal
	const slotsByDay = new Map<number, AvailabilitySlot[]>();
	for (const day of WEEK_ORDER) {
		slotsByDay.set(day, []);
	}
	for (const slot of slots) {
		const existing = slotsByDay.get(slot.diaSemana) ?? [];
		existing.push(slot);
		slotsByDay.set(slot.diaSemana, existing);
	}

	const isEmpty = slots.length === 0;

	return (
		<Card className="border-border/70">
			{(personName || personRole) && (
				<CardHeader className="pb-2">
					<div className="flex items-center gap-2">
						{personName && (
							<CardTitle className="text-base">{personName}</CardTitle>
						)}
						{personRole && (
							<Badge variant="secondary" className="text-xs">
								{personRole}
							</Badge>
						)}
					</div>
					<CardDescription>
						{m.availabilityWeekTitle({}, { locale })}
					</CardDescription>
				</CardHeader>
			)}
			<CardContent className={personName || personRole ? '' : 'pt-4'}>
				{isEmpty ? (
					<p className="py-4 text-center text-sm text-muted-foreground">
						{m.availabilityWeekEmpty({}, { locale })}
					</p>
				) : (
					<div className="grid grid-cols-7 gap-1.5">
						{/* Cabecera: abreviatura del día */}
						{WEEK_ORDER.map((day) => (
							<div
								key={`header-${day}`}
								className="pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
							>
								{getDayAbbr(day, locale)}
							</div>
						))}

						{/* Cuerpo: bloques de cada día */}
						{WEEK_ORDER.map((day) => {
							const daySlots = slotsByDay.get(day) ?? [];
							return (
								<div
									key={`day-${day}`}
									className="min-h-16 space-y-1 rounded-lg border border-border/50 bg-muted/20 p-1.5"
								>
									{daySlots.length === 0 ? (
										<div className="flex h-14 items-center justify-center">
											<span className="text-[10px] text-muted-foreground/40">
												—
											</span>
										</div>
									) : (
										daySlots.map((slot) => (
											<div
												key={slot.id}
												className={[
													'flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] leading-tight',
													slot.activo
														? 'bg-primary/10 text-primary'
														: 'bg-muted text-muted-foreground line-through',
												].join(' ')}
												title={`${getDayLabel(day, locale)} ${formatTime(slot.horaInicio)} - ${formatTime(slot.horaFin)}${slot.duracionCita ? ` (${slot.duracionCita}min)` : ''}`}
											>
												<ClockIcon className="h-3 w-3 shrink-0" />
												<span className="truncate font-medium">
													{formatTime(slot.horaInicio)}-
													{formatTime(slot.horaFin)}
												</span>
											</div>
										))
									)}
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// Daniel Useche
