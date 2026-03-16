import { createContext, useContext } from 'react';
import type { Session } from '@/features/.server/auth/better-auth-server.lib';

const SessionContext = createContext<Session | undefined>(undefined);

export const useSession = () => {
	const session = useContext(SessionContext);

	if (session === undefined) {
		throw new Error('useSession must be used within a SessionProvider');
	}

	return session;
};

export const SessionProvider = SessionContext.Provider;
