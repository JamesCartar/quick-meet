import { expect, it } from 'vitest';
import app from './index';

it('serves tRPC and refuses WebSockets from unapproved origins', async () => {
	const response = await app.request('/trpc/welcome.get', {
		headers: { Origin: 'http://localhost:5173' },
	});
	expect(response.status).toBe(200);
	expect(response.headers.get('access-control-allow-origin')).toBe(
		'http://localhost:5173',
	);
	expect(await response.json()).toEqual({
		result: { data: { message: 'Welcome to Meet!' } },
	});
	const rejected = await app.request('/ws', {
		headers: { Origin: 'https://untrusted.example', Upgrade: 'websocket' },
	});
	expect(rejected.status).toBe(403);
});
