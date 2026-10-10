import { upgradeWebSocket } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { z } from 'zod';
import { createContext } from './config/context';
import { appRouter } from './routers';
import { meetingService } from './routers/meeting/meeting.service';

const app = new Hono();
const allowedOrigins = () =>
	(process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
		.split(',')
		.map((origin) => origin.trim());

app.use(logger());
app.get(
	'/ws',
	(c, next) => {
		const origin = c.req.header('Origin');
		if (!origin || !allowedOrigins().includes(origin))
			return c.text('Origin not allowed', 403);
		return next();
	},
	upgradeWebSocket(() => {
		let subscription: ReturnType<typeof meetingService.subscribe> | undefined;
		return {
			onOpen(_event, ws) {
				subscription = meetingService.subscribe((message) =>
					ws.send(JSON.stringify(message)),
				);
			},
			onMessage(event) {
				try {
					const data = z
						.object({
							type: z.literal('subscribe'),
							participantId: z.uuid().optional(),
						})
						.safeParse(JSON.parse(String(event.data)));
					if (data.success) subscription?.identify(data.data.participantId);
				} catch {
					/* Ignore malformed client messages. */
				}
			},
			onClose() {
				subscription?.close();
			},
			onError() {
				subscription?.close();
			},
		};
	}),
);

app.use(
	'/trpc/*',
	cors({
		origin: (origin) =>
			allowedOrigins().includes(origin) ? origin : undefined,
		allowMethods: ['GET', 'POST', 'OPTIONS'],
		allowHeaders: ['Content-Type'],
	}),
);

app.use(
	'/trpc/*',
	trpcServer({
		router: appRouter,
		createContext,
	}),
);

export default app;
