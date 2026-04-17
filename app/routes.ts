import {
	index,
	prefix,
	type RouteConfig,
	route,
} from '@react-router/dev/routes';

export default [
	...prefix(':locale?', [
		index('features/home/home.page.tsx'),
		route('login', 'features/auth/login.page.tsx'),
		route('register', 'features/auth/register.page.tsx'),
		route('select-hospital', 'features/auth/select-hospital.page.tsx'),
		route('dashboard', 'features/dashboard/dashboard.page.tsx'),
		route(
			'nearby-hospitals',
			'features/nearby-hospitals/nearby-hospitals.page.tsx',
		),
		route('triage', 'features/triage/triage.page.tsx'),
		route('triage/:procedureId', 'features/triage/triage-procedure.page.tsx'),
	]),
] satisfies RouteConfig;
