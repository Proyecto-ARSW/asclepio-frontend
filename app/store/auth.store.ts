import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Hospital {
	id: number;
	nombre: string;
	ciudad: string;
	departamento: string;
	direccion?: string;
	telefono?: string;
	nit?: string;
	activo?: boolean;
}

export interface Usuario {
	id: string;
	nombre: string;
	apellido: string;
	email: string;
	rol: string;
}

interface AuthState {
	preToken: string | null;
	accessToken: string | null;
	user: Usuario | null;
	hospitals: Hospital[];
	selectedHospital: Hospital | null;
	setPreAuth: (preToken: string, user: Usuario, hospitals: Hospital[]) => void;
	setFullAuth: (accessToken: string, user: Usuario, hospital: Hospital) => void;
	logout: () => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			preToken: null,
			accessToken: null,
			user: null,
			hospitals: [],
			selectedHospital: null,
			setPreAuth: (preToken, user, hospitals) =>
				set({
					preToken,
					user,
					hospitals,
					accessToken: null,
					selectedHospital: null,
				}),
			setFullAuth: (accessToken, user, selectedHospital) =>
				set({ accessToken, user, selectedHospital, preToken: null }),
			logout: () =>
				set({
					preToken: null,
					accessToken: null,
					user: null,
					hospitals: [],
					selectedHospital: null,
				}),
		}),
		{
			name: 'asclepio-auth',
			storage: createJSONStorage(() =>
				typeof window !== 'undefined'
					? localStorage
					: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
			),
			skipHydration: true,
		},
	),
);
