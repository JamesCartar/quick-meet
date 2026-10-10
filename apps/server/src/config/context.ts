import type { Context as HonoContext } from 'hono';

export type Bindings = {
	ALLOWED_ORIGINS: string;
	MEETING_ROOM: unknown;
};

export function createContext({
	context,
}: {
	context: HonoContext<{ Bindings: Bindings }>;
}) {
	return {
		env: context.env,
		meetingRoom: context.env.MEETING_ROOM,
	};
}

export type Context = ReturnType<typeof createContext>;
