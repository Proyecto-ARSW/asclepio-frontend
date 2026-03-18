import { useState } from 'react';
import { redirect, useNavigate, Link } from 'react-router';
import type { Route } from './+types/login.page';
import { apiPost } from '@/lib/api';
import { useAuthStore, type Hospital, type Usuario } from '@/store/auth.store';

interface LoginResponse {
	preToken: string;
	usuario: Usuario;
	hospitales: Hospital[];
}

export async function clientLoader() {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem('asclepio-auth');
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			if (parsed.state?.accessToken) {
				return redirect('/dashboard');
			}
		} catch {}
	}
	return null;
}

export function meta(_: Route.MetaArgs) {
	return [{ title: 'Asclepio - Iniciar Sesión' }];
}

export default function LoginPage() {
	const navigate = useNavigate();
	const setPreAuth = useAuthStore((s) => s.setPreAuth);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: { preventDefault(): void }) {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const data = await apiPost<LoginResponse>('/auth/login', { email, password });
			setPreAuth(data.preToken, data.usuario, data.hospitales);
			navigate('/select-hospital');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Credenciales inválidas');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				<div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
					<div className="flex flex-col items-center mb-8">
						<div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
							<span className="text-white text-3xl font-bold select-none">+</span>
						</div>
						<h1 className="text-2xl font-bold text-gray-900">Asclepio</h1>
						<p className="text-gray-500 text-sm mt-1">Sistema de Gestión Hospitalaria</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-5">
						<div>
							<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
								Correo electrónico
							</label>
							<input
								id="email"
								type="email"
								autoComplete="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
								placeholder="correo@hospital.com"
							/>
						</div>

						<div>
							<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
								Contraseña
							</label>
							<input
								id="password"
								type="password"
								autoComplete="current-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
								placeholder="••••••••"
							/>
						</div>

						{error && (
							<div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition text-sm"
						>
							{loading ? 'Ingresando...' : 'Iniciar sesión'}
						</button>
					</form>

					<p className="text-center text-sm text-gray-500 mt-6">
						¿No tienes cuenta?{' '}
						<Link to="/register" className="font-medium text-blue-600 hover:underline">
							Registrarse
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
