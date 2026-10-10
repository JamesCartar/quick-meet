import { afterEach, describe, expect, it, vi } from 'vitest';
import { FirebaseService } from './firebase.service';

vi.mock('./auth', () => ({
	getFirebaseAccessToken: vi.fn().mockResolvedValue('test-token'),
}));

const service = new FirebaseService({
	ALLOWED_ORIGINS: 'http://localhost:5173',
	FIREBASE_DATABASE_URL: 'https://example.firebasedatabase.app/',
	FIREBASE_SERVICE_ACCOUNT: 'mocked-credentials',
});

afterEach(() => vi.unstubAllGlobals());

describe('FirebaseService', () => {
	it('reads using an authorization header without placing tokens in URLs', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(Response.json({ alice: { name: 'Alice' } }));
		vi.stubGlobal('fetch', fetchMock);
		expect(await service.get('meeting/participants')).toEqual({
			alice: { name: 'Alice' },
		});
		const [url, options] = fetchMock.mock.calls[0];
		expect(String(url)).toBe(
			'https://example.firebasedatabase.app/meeting/participants.json',
		);
		expect(options.headers.Authorization).toBe('Bearer test-token');
	});

	it('supports set, update, and removal', async () => {
		const fetchMock = vi
			.fn()
			.mockImplementation(async () => Response.json(null));
		vi.stubGlobal('fetch', fetchMock);
		await service.set('meeting/participants/alice', { name: 'Alice' });
		await service.update('meeting/participants/alice', { name: 'Alex' });
		await service.remove('meeting/participants/alice');
		expect(fetchMock.mock.calls.map(([, options]) => options.method)).toEqual([
			'PUT',
			'PATCH',
			'DELETE',
		]);
		expect(fetchMock.mock.calls[0][1].body).toBe(
			JSON.stringify({ name: 'Alice' }),
		);
		expect(fetchMock.mock.calls[2][1].body).toBeUndefined();
	});

	it.each([
		'meeting/participants/bad.name',
		'meeting/signaling//bad',
		'meeting/signaling/bad\nkey',
	] as const)(
		'rejects invalid path %s before a network request',
		async (path) => {
			const fetchMock = vi.fn();
			vi.stubGlobal('fetch', fetchMock);
			await expect(service.get(path)).rejects.toThrow(
				'Invalid meeting database path',
			);
			expect(fetchMock).not.toHaveBeenCalled();
		},
	);

	it('reports failures without reflecting response bodies', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(new Response('private details', { status: 403 })),
		);
		await expect(service.get('meeting/signaling')).rejects.toThrow(
			'Firebase database request failed (HTTP 403)',
		);
	});
});
