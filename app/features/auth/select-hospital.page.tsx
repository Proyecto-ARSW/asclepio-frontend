import { useEffect, useState } from 'react';
import { redirect, useNavigate } from 'react-router';
import {
	BuildingOffice2Icon,
	CheckCircleIcon,
	ArrowRightIcon,
	ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import type { Route } from './+types/select-hospital.page';
import { apiPost } from '@/lib/api';
import { useAuthStore, type Hospital, type Usuario } from '@/store/auth.store';

interface SelectHospitalResponse {
	accessToken: string;
	usuario: Usuario;
	hospital: Hospital;
}

export async function clientLoader() {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem('asclepio-auth');
	if (!raw) return redirect('/login');
	try {
		const parsed = JSON.parse(raw);
		if (!parsed.state?.preToken) return redirect('/login');
	} catch {
		return redirect('/login');
	}
	return null;
}

export function meta(_: Route.MetaArgs) {
	return [{ title: 'Asclepio - Seleccionar Hospital' }];
}

export default function SelectHospitalPage() {
	const navigate = useNavigate();
	const { hospitals, user, setFullAuth } = useAuthStore();

	const [hydrated, setHydrated] = useState(false);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		useAuthStore.persist.rehydrate();
		setHydrated(true);
	}, []);

	async function handleSelect() {
		if (!selectedId) return;
		setError('');
		setLoading(true);
		try {
			const token = useAuthStore.getState().preToken ?? undefined;
			const data = await apiPost<SelectHospitalResponse>(
				'/auth/select-hospital',
				{ hospitalId: selectedId },
				token
			);
			setFullAuth(data.accessToken, data.usuario, data.hospital);
			navigate('/dashboard');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al seleccionar hospital');
		} finally {
			setLoading(false);
		}
	}

	const isAdmin = user?.rol === 'ADMIN';
	const hasNoHospitals = hospitals.length === 0;

	return (
		<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
			<div className="w-full max-w-lg">
				<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
					<div className="bg-blue-600 px-6 py-5 sm:px-8">
						<div className="flex items-center gap-3 mb-1">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
								<BuildingOffice2Icon className="h-5 w-5 text-white" />
							</div>
							<span className="font-bold text-white text-sm">Asclepio</span>
						</div>
						<h1 className="text-xl font-bold text-white mt-3">Seleccionar Hospital</h1>
						{user && (
							<p className="text-blue-100 text-sm mt-0.5">
								Bienvenido, {user.nombre} {user.apellido}
							</p>
						)}
					</div>

					<div className="p-6 sm:p-8">
						{!hydrated && (
							<div className="space-y-3">
								{[1, 2, 3].map((i) => (
									<div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
								))}
							</div>
						)}

						{hydrated && (
							<>
								{hasNoHospitals && (
									<div className="text-center py-8">
										<ExclamationTriangleIcon className="mx-auto h-10 w-10 text-amber-400 mb-3" />
										<p className="text-sm font-medium text-gray-700">
											{isAdmin ? 'Sin hospitales vinculados' : 'Sin hospitales asignados'}
										</p>
										<p className="text-xs text-gray-400 mt-1">
											{isAdmin
												? 'Regístrate para crear tu primer hospital desde el panel de control.'
												: 'Contacta a un administrador para que te vincule a un hospital.'}
										</p>
										<button
											type="button"
											onClick={() => navigate('/login')}
											className="mt-4 text-sm text-blue-600 hover:underline"
										>
											Volver al inicio de sesión
										</button>
									</div>
								)}

								{!hasNoHospitals && (
									<>
										<p className="text-sm text-gray-600 mb-4">
											Selecciona el hospital en el que deseas trabajar en esta sesión:
										</p>

										<div className="max-h-72 space-y-2 overflow-y-auto pr-1 mb-5">
											{hospitals.map((h) => (
												<button
													key={h.id}
													type="button"
													onClick={() => setSelectedId(h.id)}
													className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
														selectedId === h.id
															? 'border-blue-500 bg-blue-50'
															: 'border-gray-200 hover:border-gray-300'
													}`}
												>
													<BuildingOffice2Icon
														className={`h-5 w-5 flex-shrink-0 ${selectedId === h.id ? 'text-blue-600' : 'text-gray-400'}`}
													/>
													<div className="min-w-0 flex-1">
														<p className={`font-semibold text-sm ${selectedId === h.id ? 'text-blue-700' : 'text-gray-900'}`}>
															{h.nombre}
														</p>
														<p className="text-xs text-gray-500 mt-0.5">
															{h.ciudad}, {h.departamento}
														</p>
													</div>
													{selectedId === h.id && (
														<CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-blue-500" />
													)}
												</button>
											))}
										</div>

										{error && (
											<div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
												{error}
											</div>
										)}

										<button
											type="button"
											onClick={handleSelect}
											disabled={!selectedId || loading}
											className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
										>
											{loading ? 'Ingresando...' : 'Continuar'}
											{!loading && <ArrowRightIcon className="h-4 w-4" />}
										</button>
									</>
								)}
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
