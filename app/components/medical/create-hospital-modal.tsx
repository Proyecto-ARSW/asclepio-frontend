import { useState } from 'react';
import {
	XMarkIcon,
	BuildingOffice2Icon,
	MapPinIcon,
	PhoneIcon,
	CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { apiPost } from '@/lib/api';
import { useAuthStore, type Hospital } from '@/store/auth.store';

interface CreateHospitalPayload {
	nombre: string;
	departamento: string;
	ciudad: string;
	direccion: string;
	nit?: string;
	telefono?: string;
	emailContacto?: string;
	tipoInstitucion?: string;
	capacidadUrgencias?: number;
	numeroConsultorios?: number;
}

interface CreatedHospital {
	id: number;
	nombre: string;
	ciudad: string;
	departamento: string;
	direccion: string;
	nit?: string;
	activo: boolean;
}

interface CreateHospitalModalProps {
	open: boolean;
	onClose: () => void;
	onCreated: (hospital: CreatedHospital) => void;
}

const inputClass =
	'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
	return (
		<div>
			<label className="mb-1 block text-sm font-medium text-gray-700">
				{label} {required && <span className="text-red-500">*</span>}
			</label>
			{children}
		</div>
	);
}

export function CreateHospitalModal({ open, onClose, onCreated }: CreateHospitalModalProps) {
	const { accessToken, user, setFullAuth, selectedHospital } = useAuthStore();

	const [form, setForm] = useState<CreateHospitalPayload>({
		nombre: '',
		departamento: '',
		ciudad: '',
		direccion: '',
		nit: '',
		telefono: '',
		emailContacto: '',
		tipoInstitucion: '',
		capacidadUrgencias: undefined,
		numeroConsultorios: undefined,
	});

	const [step, setStep] = useState<'form' | 'success'>('form');
	const [createdHospital, setCreatedHospital] = useState<CreatedHospital | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	function set<K extends keyof CreateHospitalPayload>(k: K, v: CreateHospitalPayload[K]) {
		setForm((f) => ({ ...f, [k]: v }));
	}

	function validate() {
		if (!form.nombre.trim()) return 'El nombre es requerido';
		if (!form.departamento.trim()) return 'El departamento es requerido';
		if (!form.ciudad.trim()) return 'La ciudad es requerida';
		if (!form.direccion.trim()) return 'La dirección es requerida';
		return null;
	}

	async function handleSubmit() {
		const err = validate();
		if (err) { setError(err); return; }
		setError('');
		setLoading(true);

		try {
			const token = accessToken ?? undefined;

			const payload: CreateHospitalPayload = {
				nombre: form.nombre.trim(),
				departamento: form.departamento.trim(),
				ciudad: form.ciudad.trim(),
				direccion: form.direccion.trim(),
			};
			if (form.nit?.trim()) payload.nit = form.nit.trim();
			if (form.telefono?.trim()) payload.telefono = form.telefono.trim();
			if (form.emailContacto?.trim()) payload.emailContacto = form.emailContacto.trim();
			if (form.tipoInstitucion?.trim()) payload.tipoInstitucion = form.tipoInstitucion.trim();
			if (form.capacidadUrgencias) payload.capacidadUrgencias = form.capacidadUrgencias;
			if (form.numeroConsultorios) payload.numeroConsultorios = form.numeroConsultorios;

			const hospital = await apiPost<CreatedHospital>('/hospitals', payload, token);
			setCreatedHospital(hospital);

			await apiPost('/auth/join-hospital', { hospitalId: hospital.id }, token);

			const selectRes = await apiPost<{ accessToken: string; usuario: typeof user; hospital: Hospital }>(
				'/auth/select-hospital',
				{ hospitalId: hospital.id },
				token
			);

			if (user) {
				setFullAuth(selectRes.accessToken, selectRes.usuario ?? user, selectRes.hospital);
			}

			setStep('success');
			onCreated(hospital);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al crear el hospital');
		} finally {
			setLoading(false);
		}
	}

	function handleClose() {
		setForm({ nombre: '', departamento: '', ciudad: '', direccion: '', nit: '', telefono: '', emailContacto: '', tipoInstitucion: '' });
		setStep('form');
		setCreatedHospital(null);
		setError('');
		onClose();
	}

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div
				className="absolute inset-0 bg-black/50"
				onClick={handleClose}
				onKeyDown={(e) => e.key === 'Escape' && handleClose()}
				role="button"
				tabIndex={-1}
			/>

			<div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
				<div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
							<BuildingOffice2Icon className="h-5 w-5 text-blue-600" />
						</div>
						<div>
							<h2 className="text-base font-bold text-gray-900">Crear Hospital</h2>
							<p className="text-xs text-gray-500">Completa los datos del nuevo hospital</p>
						</div>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
					>
						<XMarkIcon className="h-5 w-5" />
					</button>
				</div>

				<div className="p-6">
					{step === 'success' && createdHospital ? (
						<div className="flex flex-col items-center py-6 text-center">
							<CheckCircleIcon className="h-14 w-14 text-emerald-500 mb-4" />
							<h3 className="text-lg font-bold text-gray-900">Hospital creado</h3>
							<p className="text-sm text-gray-500 mt-1">
								<span className="font-medium text-gray-700">{createdHospital.nombre}</span> fue creado
								y establecido como tu hospital activo.
							</p>
							<button
								type="button"
								onClick={handleClose}
								className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
							>
								Cerrar
							</button>
						</div>
					) : (
						<div className="space-y-4">
							<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
								<MapPinIcon className="h-3.5 w-3.5" />
								Información principal
							</div>

							<Field label="Nombre del hospital" required>
								<input
									type="text"
									value={form.nombre}
									onChange={(e) => set('nombre', e.target.value)}
									placeholder="Ej: Hospital General de Medellín"
									className={inputClass}
								/>
							</Field>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<Field label="Departamento" required>
									<input
										type="text"
										value={form.departamento}
										onChange={(e) => set('departamento', e.target.value)}
										placeholder="Ej: Antioquia"
										className={inputClass}
									/>
								</Field>
								<Field label="Ciudad" required>
									<input
										type="text"
										value={form.ciudad}
										onChange={(e) => set('ciudad', e.target.value)}
										placeholder="Ej: Medellín"
										className={inputClass}
									/>
								</Field>
							</div>

							<Field label="Dirección" required>
								<input
									type="text"
									value={form.direccion}
									onChange={(e) => set('direccion', e.target.value)}
									placeholder="Ej: Calle 119 # 7-75"
									className={inputClass}
								/>
							</Field>

							<Field label="NIT">
								<input
									type="text"
									value={form.nit ?? ''}
									onChange={(e) => set('nit', e.target.value)}
									placeholder="Ej: 900.123.456-1"
									className={inputClass}
								/>
							</Field>

							<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 mt-2 mb-2">
								<PhoneIcon className="h-3.5 w-3.5" />
								Contacto y capacidad
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<Field label="Teléfono">
									<input
										type="tel"
										value={form.telefono ?? ''}
										onChange={(e) => set('telefono', e.target.value)}
										placeholder="Ej: 6015956767"
										className={inputClass}
									/>
								</Field>
								<Field label="Tipo de institución">
									<input
										type="text"
										value={form.tipoInstitucion ?? ''}
										onChange={(e) => set('tipoInstitucion', e.target.value)}
										placeholder="Ej: PRIVADA"
										className={inputClass}
									/>
								</Field>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<Field label="Capacidad urgencias">
									<input
										type="number"
										min={0}
										value={form.capacidadUrgencias ?? ''}
										onChange={(e) => set('capacidadUrgencias', e.target.value ? Number(e.target.value) : undefined)}
										placeholder="Ej: 20"
										className={inputClass}
									/>
								</Field>
								<Field label="N° consultorios">
									<input
										type="number"
										min={0}
										value={form.numeroConsultorios ?? ''}
										onChange={(e) => set('numeroConsultorios', e.target.value ? Number(e.target.value) : undefined)}
										placeholder="Ej: 50"
										className={inputClass}
									/>
								</Field>
							</div>

							<Field label="Email de contacto">
								<input
									type="email"
									value={form.emailContacto ?? ''}
									onChange={(e) => set('emailContacto', e.target.value)}
									placeholder="contacto@hospital.com"
									className={inputClass}
								/>
							</Field>

							{error && (
								<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
									{error}
								</div>
							)}

							<div className="flex gap-3 pt-2">
								<button
									type="button"
									onClick={handleClose}
									className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
								>
									Cancelar
								</button>
								<button
									type="button"
									onClick={handleSubmit}
									disabled={loading}
									className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
								>
									{loading ? 'Creando...' : 'Crear hospital'}
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
