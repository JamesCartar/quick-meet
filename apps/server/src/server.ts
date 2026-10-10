import { serve } from '@hono/node-server';
import { WebSocketServer } from 'ws';
import app from './index';
import { meetingService } from './routers/meeting/meeting.service';

const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535)
	throw new Error('PORT must be a valid TCP port.');

const server = serve({
	fetch: app.fetch,
	port,
	hostname: process.env.HOST ?? '127.0.0.1',
	websocket: { server: new WebSocketServer({ noServer: true }) },
});

const sweep = setInterval(() => meetingService.sweep(), 30_000);
server.on('close', () => clearInterval(sweep));
console.log(`Meeting API listening on port ${port}`);
