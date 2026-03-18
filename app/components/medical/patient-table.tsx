import {
	UserCircleIcon,
	EnvelopeIcon,
	IdentificationIcon,
	ShieldCheckIcon,
	ArrowPathIcon,
} from '@heroicons/react/24/outline';

export interface PatientRow {
	id: string;
	nombre: string;
	apellido: string;
	email: string;
	tipoDocumento?: string;
	numeroDocumento?: string;
	eps?: string;
	tipoSangre?: string;
	creadoEn: string;
}

interface PatientTableProps {
	patients: PatientRow[];
	loading?: boolean;
	onRefresh?: () => void;
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<UserCircleIcon className="h-12 w-12 text-gray-300 mb-3" />
			<p className="text-sm font-medium text-gray-500">Sin pacientes registrados</p>
			<p className="text-xs text-gray-400 mt-1">
				Los pacientes aparecerán aquí una vez registrados en el sistema.
			</p>
		</div>
	);
}

function LoadingState() {
	return (
		<div className="divide-y divide-gray-100">
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className="flex items-center gap-4 px-4 py-4">
					<div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse" />
					<div className="flex-1 space-y-2">
						<div className="h-3 w-32 rounded bg-gray-100 animate-pulse" />
						<div className="h-2.5 w-48 rounded bg-gray-100 animate-pulse" />
					</div>
					<div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
					<div className="h-3 w-16 rounded bg-gray-100 animate-pulse" />
				</div>
			))}
		</div>
	);
}

function bloodTypeColor(tipo?: string) {
	if (!tipo) return 'bg-gray-100 text-gray-500';
	return 'bg-red-50 text-red-600';
}

export function PatientTable({ patients, loading, onRefresh }: PatientTableProps) {
	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
			<div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
				<div className="flex items-center gap-2">
					<UserCircleIcon className="h-4 w-4 text-blue-500" />
					<span className="text-sm font-semibold text-gray-700">
						Pacientes
					</span>
					<span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
						{patients.length}
					</span>
				</div>
				{onRefresh && (
					<button
						type="button"
						onClick={onRefresh}
						disabled={loading}
						className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
					>
						<ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
						Actualizar
					</button>
				)}
			</div>

			{loading ? (
				<LoadingState />
			) : patients.length === 0 ? (
				<EmptyState />
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50">
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
									Paciente
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
									Documento
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
									EPS
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
									Sangre
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
									Registro
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{patients.map((p) => (
								<tr key={p.id} className="hover:bg-gray-50 transition-colors">
									<td className="px-4 py-3">
										<div className="flex items-center gap-3">
											<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
												<span className="text-xs font-semibold text-blue-600">
													{p.nombre[0]}{p.apellido[0]}
												</span>
											</div>
											<div>
												<p className="font-medium text-gray-900">
													{p.nombre} {p.apellido}
												</p>
												<div className="flex items-center gap-1 text-xs text-gray-400">
													<EnvelopeIcon className="h-3 w-3" />
													{p.email}
												</div>
											</div>
										</div>
									</td>
									<td className="px-4 py-3">
										{p.tipoDocumento && p.numeroDocumento ? (
											<div className="flex items-center gap-1.5 text-gray-600">
												<IdentificationIcon className="h-3.5 w-3.5 text-gray-400" />
												<span className="text-xs">
													{p.tipoDocumento}: {p.numeroDocumento}
												</span>
											</div>
										) : (
											<span className="text-xs text-gray-300">—</span>
										)}
									</td>
									<td className="px-4 py-3">
										{p.eps ? (
											<div className="flex items-center gap-1.5 text-gray-600">
												<ShieldCheckIcon className="h-3.5 w-3.5 text-gray-400" />
												<span className="text-xs">{p.eps}</span>
											</div>
										) : (
											<span className="text-xs text-gray-300">—</span>
										)}
									</td>
									<td className="px-4 py-3">
										{p.tipoSangre ? (
											<span
												className={`rounded-full px-2 py-0.5 text-xs font-bold ${bloodTypeColor(p.tipoSangre)}`}
											>
												{p.tipoSangre}
											</span>
										) : (
											<span className="text-xs text-gray-300">—</span>
										)}
									</td>
									<td className="px-4 py-3 text-xs text-gray-400">
										{new Date(p.creadoEn).toLocaleDateString('es-CO')}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
