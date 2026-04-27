import {
	index,
	prefix,
	type RouteConfig,
	route,
} from '@react-router/dev/routes';

export default [
	...prefix(':locale?', [
		index('features/home/home.page.tsx'),
		route('legal', 'features/legal/legal-index.page.tsx'),
		route('legal/terms', 'features/legal/legal-terms.page.tsx'),
		route('legal/usage-policies', 'features/legal/legal-usage.page.tsx'),
		route('legal/security-policy', 'features/legal/legal-security.page.tsx'),
		route('legal/privacy-policy', 'features/legal/legal-privacy.page.tsx'),
		route('login', 'features/auth/login.page.tsx'),
		route('register', 'features/auth/register.page.tsx'),
		route('select-hospital', 'features/auth/select-hospital.page.tsx'),
		route('dashboard', 'features/dashboard/dashboard.page.tsx'),
		route('salud-ocular', 'features/eye-health/eye-health.page.tsx'),
		route(
			'nearby-hospitals',
			'features/nearby-hospitals/nearby-hospitals.page.tsx',
		),
		route('triage', 'features/triage/triage.page.tsx'),
		route('triage/:procedureId', 'features/triage/triage-procedure.page.tsx'),
	]),
] satisfies RouteConfig;
