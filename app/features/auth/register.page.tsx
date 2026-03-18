import { useEffect, useState } from 'react';
import { redirect, useNavigate, Link } from 'react-router';
import {
	UserIcon,
	EnvelopeIcon,
	LockClosedIcon,
	PhoneIcon,
	HeartIcon,
	ChevronRightIcon,
	ChevronLeftIcon,
	BuildingOffice2Icon,
	CheckCircleIcon,
	IdentificationIcon,
	BeakerIcon,
} from '@heroicons/react/24/outline';
import type { Route } from './+types/register.page';
import { apiGet, apiPost } from '@/lib/api';
import { useAuthStore, type Hospital, type Usuario } from '@/store/auth.store';

const ROLES = [
	{ value: 'PACIENTE', label: 'Paciente', description: 'Acceso a citas y turnos propios' },
	{ value: 'MEDICO', label: 'Médico', description: 'Gestión de citas y pacientes asignados' },
	{ value: 'ENFERMERO', label: 'Enfermero', description: 'Apoyo clínico y gestión de turnos' },
	{ value: 'RECEPCIONISTA', label: 'Recepcionista', description: 'Registro de turnos y citas' },
	{ value: 'ADMIN', label: 'Administrador', description: 'Acceso total al sistema' },
] as const;

type Rol = (typeof ROLES)[number]['value'];

const TIPO_DOCUMENTO = ['CC', 'TI', 'CE', 'PA', 'RC'];
const TIPO_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const NIVEL_FORMACION = [
	{ id: 1, label: 'Técnico' },
	{ id: 2, label: 'Tecnólogo' },
	{ id: 3, label: 'Profesional' },
	{ id: 4, label: 'Especialista' },
];

interface RegisterPayload {
	nombre: string;
	apellido: string;
	email: string;
	password: string;
	telefono?: string;
	rol: Rol;
	hospitalId?: number;
	medicoData?: { especialidadId: number; numeroRegistro: string; consultorio?: string };
	pacienteData?: {
		tipoDocumento?: string;
		numeroDocumento?: string;
		tipoSangre?: string;
		eps?: string;
		alergias?: string;
	};
	enfermeroData?: {
		numeroRegistro: string;
		nivelFormacion: number;
		areaEspecializacion?: number;
		certificacionTriage?: boolean;
	};
}

interface RegisterResponse {
	accessToken: string;
	usuario: Usuario;
	hospital?: Hospital;
}

export async function clientLoader() {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem('asclepio-auth');
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			if (parsed.state?.accessToken) return redirect('/dashboard');
		} catch {}
	}
	return null;
}

export function meta(_: Route.MetaArgs) {
	return [{ title: 'Asclepio - Crear cuenta' }];
}

export default function RegisterPage() {
	const navigate = useNavigate();
	const setFullAuth = useAuthStore((s) => s.setFullAuth);

	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [hospitals, setHospitals] = useState<Hospital[]>([]);
	const [loadingHospitals, setLoadingHospitals] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	const [form, setForm] = useState<RegisterPayload>({
		nombre: '',
		apellido: '',
		email: '',
		password: '',
		telefono: '',
		rol: 'PACIENTE',
		hospitalId: undefined,
		medicoData: { especialidadId: 0, numeroRegistro: '', consultorio: '' },
		pacienteData: { tipoDocumento: 'CC', numeroDocumento: '', tipoSangre: '', eps: '', alergias: '' },
		enfermeroData: { numeroRegistro: '', nivelFormacion: 1, areaEspecializacion: undefined, certificacionTriage: false },
	});

	const needsHospital = form.rol !== 'ADMIN';

	useEffect(() => {
		if (step === 2 && needsHospital && hospitals.length === 0) {
			setLoadingHospitals(true);
			apiGet<Hospital[]>('/hospitals')
				.then(setHospitals)
				.catch(() => setError('No se pudo cargar la lista de hospitales'))
				.finally(() => setLoadingHospitals(false));
		}
	}, [step]);

	function set<K extends keyof RegisterPayload>(key: K, value: RegisterPayload[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	function setNested<S extends 'medicoData' | 'pacienteData' | 'enfermeroData'>(
		section: S,
		key: string,
		value: unknown
	) {
		setForm((f) => ({
			...f,
			[section]: { ...(f[section] as object), [key]: value },
		}));
	}

	function validateStep1() {
		if (!form.nombre.trim()) return 'El nombre es requerido';
		if (!form.apellido.trim()) return 'El apellido es requerido';
		if (!form.email.trim()) return 'El correo es requerido';
		if (form.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
		return null;
	}

	function validateStep2() {
		if (needsHospital && !form.hospitalId) return 'Debes seleccionar un hospital';
		if (form.rol === 'MEDICO') {
			if (!form.medicoData?.numeroRegistro.trim()) return 'El número de registro médico es requerido';
			if (!form.medicoData.especialidadId || form.medicoData.especialidadId < 1)
				return 'El ID de especialidad debe ser un número positivo';
		}
		if (form.rol === 'ENFERMERO') {
			if (!form.enfermeroData?.numeroRegistro.trim()) return 'El número de registro es requerido';
			if (!form.enfermeroData.areaEspecializacion || form.enfermeroData.areaEspecializacion < 1)
				return 'El área de especialización es requerida para enfermeros';
		}
		return null;
	}

	function goNext() {
		setError('');
		if (step === 1) {
			const err = validateStep1();
			if (err) { setError(err); return; }
			setStep(2);
		} else if (step === 2) {
			const err = validateStep2();
			if (err) { setError(err); return; }
			setStep(3);
		}
	}

	async function handleSubmit() {
		setError('');
		setSubmitting(true);
		try {
			const payload: RegisterPayload = {
				nombre: form.nombre.trim(),
				apellido: form.apellido.trim(),
				email: form.email.trim(),
				password: form.password,
				rol: form.rol,
			};
			if (form.telefono?.trim()) payload.telefono = form.telefono.trim();
			if (needsHospital && form.hospitalId) payload.hospitalId = form.hospitalId;

			if (form.rol === 'MEDICO' && form.medicoData) {
				payload.medicoData = {
					especialidadId: form.medicoData.especialidadId,
					numeroRegistro: form.medicoData.numeroRegistro,
					...(form.medicoData.consultorio ? { consultorio: form.medicoData.consultorio } : {}),
				};
			}

			if (form.rol === 'ENFERMERO' && form.enfermeroData) {
				payload.enfermeroData = {
					numeroRegistro: form.enfermeroData.numeroRegistro,
					nivelFormacion: form.enfermeroData.nivelFormacion,
					areaEspecializacion: form.enfermeroData.areaEspecializacion,
					certificacionTriage: form.enfermeroData.certificacionTriage,
				};
			}

			if (form.rol === 'PACIENTE') {
				const pd = form.pacienteData ?? {};
				const hasData = Object.values(pd).some((v) => v);
				if (hasData) payload.pacienteData = pd;
			}

			const res = await apiPost<RegisterResponse>('/auth/register', payload);

			const hospitalForStore: Hospital = res.hospital ?? {
				id: 0,
				nombre: 'Sin hospital',
				ciudad: '',
				departamento: '',
			};
			setFullAuth(res.accessToken, res.usuario, hospitalForStore);
			navigate('/dashboard');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al crear la cuenta');
		} finally {
			setSubmitting(false);
		}
	}

	const stepTitles = ['Datos personales', 'Rol y hospital', 'Información adicional'];

	return (
		<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
			<div className="w-full max-w-lg">
				<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
					<div className="bg-blue-600 px-6 py-5 sm:px-8">
						<div className="flex items-center gap-3 mb-4">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
								<HeartIcon className="h-5 w-5 text-white" />
							</div>
							<span className="font-bold text-white text-sm">Asclepio</span>
						</div>
						<h1 className="text-xl font-bold text-white">Crear cuenta</h1>
						<p className="text-blue-100 text-sm mt-0.5">Sistema de Gestión Hospitalaria</p>

						<div className="mt-4 flex items-center gap-2">
							{([1, 2, 3] as const).map((n) => (
								<div key={n} className="flex items-center gap-2">
									<div
										className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
											step >= n
												? 'bg-white text-blue-600'
												: 'bg-white/20 text-white'
										}`}
									>
										{step > n ? <CheckCircleIcon className="h-4 w-4" /> : n}
									</div>
									<span className={`text-xs ${step >= n ? 'text-white' : 'text-blue-200'}`}>
										{stepTitles[n - 1]}
									</span>
									{n < 3 && <ChevronRightIcon className="h-3 w-3 text-blue-300" />}
								</div>
							))}
						</div>
					</div>

					<div className="p-6 sm:p-8">
						{error && (
							<div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
								{error}
							</div>
						)}

						{step === 1 && (
							<Step1
								form={form}
								onChange={(k, v) => set(k as keyof RegisterPayload, v as never)}
							/>
						)}
						{step === 2 && (
							<Step2
								form={form}
								hospitals={hospitals}
								loadingHospitals={loadingHospitals}
								onChange={(k, v) => set(k as keyof RegisterPayload, v as never)}
								onNestedChange={setNested}
							/>
						)}
						{step === 3 && (
							<Step3
								form={form}
								onNestedChange={setNested}
							/>
						)}

						<div className="mt-6 flex items-center gap-3">
							{step > 1 && (
								<button
									type="button"
									onClick={() => { setError(''); setStep((s) => (s - 1) as 1 | 2 | 3); }}
									className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
								>
									<ChevronLeftIcon className="h-4 w-4" />
									Atrás
								</button>
							)}

							{step < 3 ? (
								<button
									type="button"
									onClick={goNext}
									className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
								>
									Continuar
									<ChevronRightIcon className="h-4 w-4" />
								</button>
							) : (
								<button
									type="button"
									onClick={handleSubmit}
									disabled={submitting}
									className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
								>
									{submitting ? 'Creando cuenta...' : 'Crear cuenta'}
								</button>
							)}
						</div>

						<p className="mt-5 text-center text-sm text-gray-500">
							¿Ya tienes cuenta?{' '}
							<Link to="/login" className="font-medium text-blue-600 hover:underline">
								Iniciar sesión
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function FieldWrapper({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div>
			<label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
			{children}
		</div>
	);
}

const inputClass =
	'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

const selectClass =
	'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

function Step1({
	form,
	onChange,
}: {
	form: RegisterPayload;
	onChange: (k: string, v: unknown) => void;
}) {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<FieldWrapper label="Nombre *">
					<div className="relative">
						<UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
						<input
							type="text"
							autoComplete="given-name"
							required
							value={form.nombre}
							onChange={(e) => onChange('nombre', e.target.value)}
							placeholder="Juan"
							className={`${inputClass} pl-9`}
						/>
					</div>
				</FieldWrapper>
				<FieldWrapper label="Apellido *">
					<div className="relative">
						<UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
						<input
							type="text"
							autoComplete="family-name"
							required
							value={form.apellido}
							onChange={(e) => onChange('apellido', e.target.value)}
							placeholder="García"
							className={`${inputClass} pl-9`}
						/>
					</div>
				</FieldWrapper>
			</div>

			<FieldWrapper label="Correo electrónico *">
				<div className="relative">
					<EnvelopeIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
					<input
						type="email"
						autoComplete="email"
						required
						value={form.email}
						onChange={(e) => onChange('email', e.target.value)}
						placeholder="correo@hospital.com"
						className={`${inputClass} pl-9`}
					/>
				</div>
			</FieldWrapper>

			<FieldWrapper label="Contraseña * (mín. 6 caracteres)">
				<div className="relative">
					<LockClosedIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
					<input
						type="password"
						autoComplete="new-password"
						required
						value={form.password}
						onChange={(e) => onChange('password', e.target.value)}
						placeholder="••••••••"
						className={`${inputClass} pl-9`}
					/>
				</div>
			</FieldWrapper>

			<FieldWrapper label="Teléfono (opcional)">
				<div className="relative">
					<PhoneIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
					<input
						type="tel"
						autoComplete="tel"
						value={form.telefono ?? ''}
						onChange={(e) => onChange('telefono', e.target.value)}
						placeholder="+57 300 123 4567"
						className={`${inputClass} pl-9`}
					/>
				</div>
			</FieldWrapper>
		</div>
	);
}

function Step2({
	form,
	hospitals,
	loadingHospitals,
	onChange,
	onNestedChange,
}: {
	form: RegisterPayload;
	hospitals: Hospital[];
	loadingHospitals: boolean;
	onChange: (k: string, v: unknown) => void;
	onNestedChange: (section: 'medicoData' | 'pacienteData' | 'enfermeroData', key: string, value: unknown) => void;
}) {
	return (
		<div className="space-y-5">
			<FieldWrapper label="Rol en el sistema *">
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{ROLES.map((r) => (
						<button
							key={r.value}
							type="button"
							onClick={() => onChange('rol', r.value)}
							className={`rounded-xl border-2 p-3 text-left transition-colors ${
								form.rol === r.value
									? 'border-blue-500 bg-blue-50'
									: 'border-gray-200 hover:border-gray-300'
							}`}
						>
							<p className={`text-sm font-semibold ${form.rol === r.value ? 'text-blue-700' : 'text-gray-800'}`}>
								{r.label}
							</p>
							<p className="mt-0.5 text-xs text-gray-400">{r.description}</p>
						</button>
					))}
				</div>
			</FieldWrapper>

			{form.rol !== 'ADMIN' && (
				<FieldWrapper label="Hospital *">
					{loadingHospitals ? (
						<div className="space-y-2">
							{[1, 2, 3].map((i) => (
								<div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
							))}
						</div>
					) : (
						<div className="max-h-52 space-y-2 overflow-y-auto pr-1">
							{hospitals.map((h) => (
								<button
									key={h.id}
									type="button"
									onClick={() => onChange('hospitalId', h.id)}
									className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
										form.hospitalId === h.id
											? 'border-blue-500 bg-blue-50'
											: 'border-gray-200 hover:border-gray-300'
									}`}
								>
									<BuildingOffice2Icon
										className={`h-5 w-5 flex-shrink-0 ${form.hospitalId === h.id ? 'text-blue-600' : 'text-gray-400'}`}
									/>
									<div className="min-w-0">
										<p className={`truncate text-sm font-medium ${form.hospitalId === h.id ? 'text-blue-700' : 'text-gray-800'}`}>
											{h.nombre}
										</p>
										<p className="text-xs text-gray-400">{h.ciudad}, {h.departamento}</p>
									</div>
									{form.hospitalId === h.id && (
										<CheckCircleIcon className="ml-auto h-4 w-4 flex-shrink-0 text-blue-500" />
									)}
								</button>
							))}
							{hospitals.length === 0 && (
								<p className="py-4 text-center text-sm text-gray-400">Sin hospitales disponibles</p>
							)}
						</div>
					)}
				</FieldWrapper>
			)}

			{form.rol === 'MEDICO' && (
				<div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
					<p className="flex items-center gap-2 text-sm font-semibold text-blue-800">
						<UserIcon className="h-4 w-4" />
						Datos del médico
					</p>
					<FieldWrapper label="ID de especialidad *">
						<input
							type="number"
							min={1}
							value={form.medicoData?.especialidadId || ''}
							onChange={(e) => onNestedChange('medicoData', 'especialidadId', Number(e.target.value))}
							placeholder="Ej: 1"
							className={inputClass}
						/>
					</FieldWrapper>
					<FieldWrapper label="Número de registro médico *">
						<input
							type="text"
							value={form.medicoData?.numeroRegistro ?? ''}
							onChange={(e) => onNestedChange('medicoData', 'numeroRegistro', e.target.value)}
							placeholder="Ej: RM-2024-001"
							className={inputClass}
						/>
					</FieldWrapper>
					<FieldWrapper label="Consultorio (opcional)">
						<input
							type="text"
							value={form.medicoData?.consultorio ?? ''}
							onChange={(e) => onNestedChange('medicoData', 'consultorio', e.target.value)}
							placeholder="Ej: 301"
							className={inputClass}
						/>
					</FieldWrapper>
				</div>
			)}

			{form.rol === 'ENFERMERO' && (
				<div className="rounded-xl border border-violet-100 bg-violet-50 p-4 space-y-3">
					<p className="flex items-center gap-2 text-sm font-semibold text-violet-800">
						<BeakerIcon className="h-4 w-4" />
						Datos del enfermero
					</p>
					<FieldWrapper label="Número de registro *">
						<input
							type="text"
							value={form.enfermeroData?.numeroRegistro ?? ''}
							onChange={(e) => onNestedChange('enfermeroData', 'numeroRegistro', e.target.value)}
							placeholder="Ej: ENF-2024-001"
							className={inputClass}
						/>
					</FieldWrapper>
					<FieldWrapper label="Nivel de formación *">
						<select
							value={form.enfermeroData?.nivelFormacion ?? 1}
							onChange={(e) => onNestedChange('enfermeroData', 'nivelFormacion', Number(e.target.value))}
							className={selectClass}
						>
							{NIVEL_FORMACION.map((n) => (
								<option key={n.id} value={n.id}>{n.label}</option>
							))}
						</select>
					</FieldWrapper>
					<FieldWrapper label="ID de área de especialización *">
						<input
							type="number"
							min={1}
							value={form.enfermeroData?.areaEspecializacion || ''}
							onChange={(e) => onNestedChange('enfermeroData', 'areaEspecializacion', Number(e.target.value))}
							placeholder="Ej: 1"
							className={inputClass}
						/>
					</FieldWrapper>
					<div className="flex items-center gap-2">
						<input
							id="triage"
							type="checkbox"
							checked={form.enfermeroData?.certificacionTriage ?? false}
							onChange={(e) => onNestedChange('enfermeroData', 'certificacionTriage', e.target.checked)}
							className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
						/>
						<label htmlFor="triage" className="text-sm text-gray-700">Certificación de triage</label>
					</div>
				</div>
			)}
		</div>
	);
}

function Step3({
	form,
	onNestedChange,
}: {
	form: RegisterPayload;
	onNestedChange: (section: 'medicoData' | 'pacienteData' | 'enfermeroData', key: string, value: unknown) => void;
}) {
	return (
		<div className="space-y-4">
			<p className="text-sm text-gray-500">
				Esta información es opcional y puede completarse más adelante.
			</p>

			{form.rol === 'PACIENTE' && (
				<>
					<div className="mb-2 flex items-center gap-2">
						<IdentificationIcon className="h-4 w-4 text-blue-500" />
						<span className="text-sm font-semibold text-gray-700">Datos del paciente</span>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<FieldWrapper label="Tipo de documento">
							<select
								value={form.pacienteData?.tipoDocumento ?? 'CC'}
								onChange={(e) => onNestedChange('pacienteData', 'tipoDocumento', e.target.value)}
								className={selectClass}
							>
								{TIPO_DOCUMENTO.map((t) => <option key={t}>{t}</option>)}
							</select>
						</FieldWrapper>
						<FieldWrapper label="Número de documento">
							<input
								type="text"
								value={form.pacienteData?.numeroDocumento ?? ''}
								onChange={(e) => onNestedChange('pacienteData', 'numeroDocumento', e.target.value)}
								placeholder="1234567890"
								className={inputClass}
							/>
						</FieldWrapper>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<FieldWrapper label="Tipo de sangre">
							<select
								value={form.pacienteData?.tipoSangre ?? ''}
								onChange={(e) => onNestedChange('pacienteData', 'tipoSangre', e.target.value)}
								className={selectClass}
							>
								<option value="">Seleccionar</option>
								{TIPO_SANGRE.map((t) => <option key={t}>{t}</option>)}
							</select>
						</FieldWrapper>
						<FieldWrapper label="EPS">
							<input
								type="text"
								value={form.pacienteData?.eps ?? ''}
								onChange={(e) => onNestedChange('pacienteData', 'eps', e.target.value)}
								placeholder="Sura, Compensar..."
								className={inputClass}
							/>
						</FieldWrapper>
					</div>

					<FieldWrapper label="Alergias conocidas">
						<input
							type="text"
							value={form.pacienteData?.alergias ?? ''}
							onChange={(e) => onNestedChange('pacienteData', 'alergias', e.target.value)}
							placeholder="Penicilina, látex..."
							className={inputClass}
						/>
					</FieldWrapper>
				</>
			)}

			{form.rol !== 'PACIENTE' && (
				<div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
					<CheckCircleIcon className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
					<p className="text-sm font-medium text-gray-700">Listo para crear tu cuenta</p>
					<p className="mt-1 text-xs text-gray-400">
						Revisa los datos anteriores y confirma el registro.
					</p>
				</div>
			)}
		</div>
	);
}
