import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { type Bindings, createContext } from './config/context';
import { MeetingRoom } from './durable-objects/MeetingRoom';
import { appRouter } from './routers';

const app = new Hono<{ Bindings: Bindings }>();

app.use(logger());
app.get('/ws', (c) => {
	const namespace = c.env.MEETING_ROOM as DurableObjectNamespace;
	const id = namespace.idFromName('main');
	return namespace.get(id).fetch(c.req.raw);
});
app.use(
	'/*',
	cors({
		origin: (origin, c) => {
			const env = c.env as Bindings;
			const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((value) =>
				value.trim(),
			);
			return allowedOrigins.includes(origin) ? origin : undefined;
		},
		allowMethods: ['GET', 'POST', 'OPTIONS'],
		allowHeaders: ['Content-Type'],
	}),
);

app.use(
	'/trpc/*',
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => createContext({ context }),
	}),
);

export { MeetingRoom };

export default {
	fetch: app.fetch,
} satisfies ExportedHandler<Bindings>;
