import { index, prefix, type RouteConfig } from '@react-router/dev/routes';

export default [
	...prefix(':locale?', [
		// Page routes
		index('features/home/home.page.tsx'),
	]),
] satisfies RouteConfig;
