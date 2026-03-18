import { index, prefix, route, type RouteConfig } from '@react-router/dev/routes';

export default [
	route('login', 'features/auth/login.page.tsx'),
	route('register', 'features/auth/register.page.tsx'),
	route('select-hospital', 'features/auth/select-hospital.page.tsx'),
	route('dashboard', 'features/dashboard/dashboard.page.tsx'),
	...prefix(':locale?', [
		index('features/home/home.page.tsx'),
	]),
] satisfies RouteConfig;
