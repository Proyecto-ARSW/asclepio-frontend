import { auth } from '@/features/.server/auth/better-auth-server.lib';

const handleRequest = (args: { request: Request }) => {
	return auth.handler(args.request);
};

export const loader = (args: { request: Request }) => handleRequest(args);

export const action = (args: { request: Request }) => handleRequest(args);
