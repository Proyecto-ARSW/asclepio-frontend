import {
	BuildingOffice2Icon,
	MapPinIcon,
	PhoneIcon,
	ClipboardDocumentListIcon,
	ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/20/solid';

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
}

export function HospitalCard({ hospital, onSelect, selected }: HospitalCardProps) {
	return (
		<div
			className={`relative rounded-xl border-2 bg-white shadow-sm transition-shadow hover:shadow-md ${
				selected
					? 'border-blue-500 ring-2 ring-blue-200'
					: 'border-gray-200 hover:border-gray-300'
			} ${onSelect ? 'cursor-pointer' : ''}`}
			onClick={() => onSelect?.(hospital.id)}
			onKeyDown={(e) => e.key === 'Enter' && onSelect?.(hospital.id)}
			role={onSelect ? 'button' : undefined}
			tabIndex={onSelect ? 0 : undefined}
		>
			<div className="p-5">
				<div className="flex items-start justify-between gap-3 mb-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
							<BuildingOffice2Icon className="h-5 w-5 text-blue-600" />
						</div>
						<div>
							<h3 className="font-semibold text-gray-900 text-sm leading-tight">
								{hospital.nombre}
							</h3>
							{hospital.tipoInstitucion && (
								<p className="text-xs text-gray-400 mt-0.5">{hospital.tipoInstitucion}</p>
							)}
						</div>
					</div>
					<span
						className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${
							hospital.activo
								? 'bg-emerald-50 text-emerald-700'
								: 'bg-red-50 text-red-600'
						}`}
					>
						{hospital.activo ? (
							<CheckCircleIcon className="h-3.5 w-3.5" />
						) : (
							<XCircleIcon className="h-3.5 w-3.5" />
						)}
						{hospital.activo ? 'Activo' : 'Inactivo'}
					</span>
				</div>

				<div className="space-y-2">
					<div className="flex items-start gap-2 text-xs text-gray-600">
						<MapPinIcon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
						<span>
							{hospital.direccion} — {hospital.ciudad}, {hospital.departamento}
						</span>
					</div>

					{hospital.telefono && (
						<div className="flex items-center gap-2 text-xs text-gray-600">
							<PhoneIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
							<span>{hospital.telefono}</span>
						</div>
					)}
				</div>

				{(hospital.capacidadUrgencias || hospital.numeroConsultorios) && (
					<div className="mt-4 flex gap-4 border-t border-gray-100 pt-4">
						{hospital.capacidadUrgencias && (
							<div className="flex items-center gap-1.5">
								<ExclamationTriangleIcon className="h-3.5 w-3.5 text-amber-500" />
								<div>
									<p className="text-xs text-gray-400">Urgencias</p>
									<p className="text-sm font-semibold text-gray-800">
										{hospital.capacidadUrgencias}
									</p>
								</div>
							</div>
						)}
						{hospital.numeroConsultorios && (
							<div className="flex items-center gap-1.5">
								<ClipboardDocumentListIcon className="h-3.5 w-3.5 text-blue-500" />
								<div>
									<p className="text-xs text-gray-400">Consultorios</p>
									<p className="text-sm font-semibold text-gray-800">
										{hospital.numeroConsultorios}
									</p>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
