export type Session = {
	user: {
		id: string;
		email: string;
		name: string;
	} | null;
	session: unknown;
};

export const auth = {
	handler: (_req: Request): Promise<Response> => {
		return Promise.resolve(new Response(null, { status: 501 }));
	},
};
