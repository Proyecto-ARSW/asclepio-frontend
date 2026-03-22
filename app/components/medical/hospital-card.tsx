import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/20/solid';
import {
	BuildingOffice2Icon,
	ClipboardDocumentListIcon,
	ExclamationTriangleIcon,
	MapPinIcon,
	PhoneIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge/badge.component';
import { Card, CardContent } from '@/components/ui/card/card.component';
import { currentLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';

export interface HospitalCardData {
	id: number;
	nombre: string;
	ciudad: string;
	departamento: string;
	direccion: string;
	telefono?: string;
	nit?: string;
	tipoInstitucion?: string;
	activo: boolean;
	capacidadUrgencias?: number;
	numeroConsultorios?: number;
}

interface HospitalCardProps {
	hospital: HospitalCardData;
	onSelect?: (id: number) => void;
	selected?: boolean;
	labels?: {
		active?: string;
		inactive?: string;
		emergency?: string;
		consultingRooms?: string;
	};
}

export function HospitalCard({
	hospital,
	onSelect,
	selected,
	labels,
}: HospitalCardProps) {
	const interactive = Boolean(onSelect);
	const locale = currentLocale();
	const text = {
		active: labels?.active ?? m.dashboardHospitalStatusActive({}, { locale }),
		inactive:
			labels?.inactive ?? m.dashboardHospitalStatusInactive({}, { locale }),
		emergency:
			labels?.emergency ?? m.dashboardHospitalEmergency({}, { locale }),
		consultingRooms:
			labels?.consultingRooms ??
			m.dashboardHospitalConsultingRooms({}, { locale }),
	};

	const content = (
		<Card
			className={[
				'h-full transition-colors',
				selected
					? 'border-primary ring-primary/25 ring-2'
					: 'hover:bg-muted/30',
			].join(' ')}
		>
			<CardContent className="space-y-4 p-5">
				<div className="mb-4 flex items-start justify-between gap-3">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
							<BuildingOffice2Icon className="h-5 w-5 text-primary" />
						</div>
						<div>
							<h3 className="text-sm leading-tight font-semibold text-foreground">
								{hospital.nombre}
							</h3>
							{hospital.tipoInstitucion && (
								<p className="mt-0.5 text-xs text-muted-foreground">
									{hospital.tipoInstitucion}
								</p>
							)}
						</div>
					</div>
					<Badge
						variant={hospital.activo ? 'secondary' : 'destructive'}
						className="gap-1"
					>
						{hospital.activo ? (
							<CheckCircleIcon className="h-3.5 w-3.5" />
						) : (
							<XCircleIcon className="h-3.5 w-3.5" />
						)}
						{hospital.activo ? text.active : text.inactive}
					</Badge>
				</div>

				<div className="space-y-2">
					<div className="flex items-start gap-2 text-xs text-muted-foreground">
						<MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
						<span>
							{hospital.direccion} - {hospital.ciudad}, {hospital.departamento}
						</span>
					</div>

					{hospital.telefono && (
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<PhoneIcon className="h-3.5 w-3.5 shrink-0" />
							<span>{hospital.telefono}</span>
						</div>
					)}
				</div>

				{(hospital.capacidadUrgencias || hospital.numeroConsultorios) && (
					<div className="mt-4 flex gap-4 border-t border-border pt-4">
						{hospital.capacidadUrgencias && (
							<div className="flex items-center gap-1.5">
								<ExclamationTriangleIcon className="h-3.5 w-3.5 text-accent-foreground" />
								<div>
									<p className="text-xs text-muted-foreground">
										{text.emergency}
									</p>
									<p className="text-sm font-semibold text-foreground">
										{hospital.capacidadUrgencias}
									</p>
								</div>
							</div>
						)}
						{hospital.numeroConsultorios && (
							<div className="flex items-center gap-1.5">
								<ClipboardDocumentListIcon className="h-3.5 w-3.5 text-primary" />
								<div>
									<p className="text-xs text-muted-foreground">
										{text.consultingRooms}
									</p>
									<p className="text-sm font-semibold text-foreground">
										{hospital.numeroConsultorios}
									</p>
								</div>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);

	if (!interactive) {
		return content;
	}

	return (
		<button
			type="button"
			onClick={() => onSelect?.(hospital.id)}
			className="w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			{content}
		</button>
	);
}
