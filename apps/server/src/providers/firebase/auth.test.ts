import { decodeJwt, exportPKCS8, generateKeyPair } from 'jose';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { getFirebaseAccessToken } from './auth';

let privateKey: string;
beforeAll(async () => {
	const pair = await generateKeyPair('RS256', { extractable: true });
	privateKey = await exportPKCS8(pair.privateKey);
});
afterEach(() => vi.unstubAllGlobals());

function credentials() {
	return JSON.stringify({
		type: 'service_account',
		project_id: 'test-project',
		client_email: `test-${crypto.randomUUID()}@example.com`,
		private_key: privateKey,
	});
}

describe('Firebase OAuth', () => {
	it('rejects missing or malformed credentials without making a request', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		await expect(getFirebaseAccessToken(undefined)).rejects.toThrow(
			'Worker secret',
		);
		await expect(getFirebaseAccessToken('{')).rejects.toThrow('valid JSON');
		await expect(getFirebaseAccessToken('{}')).rejects.toThrow(
			'service-account fields',
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('signs the OAuth assertion and shares a token across concurrent requests', async () => {
		const fetchMock = vi
			.fn()
			.mockImplementation(async () =>
				Response.json({ access_token: 'test-token', expires_in: 3600 }),
			);
		vi.stubGlobal('fetch', fetchMock);
		const source = credentials();
		expect(
			await Promise.all([
				getFirebaseAccessToken(source),
				getFirebaseAccessToken(source),
			]),
		).toEqual(['test-token', 'test-token']);
		expect(await getFirebaseAccessToken(source)).toBe('test-token');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe('https://oauth2.googleapis.com/token');
		const assertion = options.body.get('assertion');
		const payload = decodeJwt(assertion);
		expect(payload.aud).toBe(url);
		expect(payload.scope).toContain('firebase.database');
		expect(payload.scope).toContain('userinfo.email');
		expect(payload.exp).toBeGreaterThan(payload.iat ?? 0);
	});

	it('allows a retry after a failed exchange', async () => {
		const source = credentials();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response('private details', { status: 401 }))
			.mockResolvedValueOnce(
				Response.json({ access_token: 'new-token', expires_in: 3600 }),
			);
		vi.stubGlobal('fetch', fetchMock);
		await expect(getFirebaseAccessToken(source)).rejects.toThrow('HTTP 401');
		expect(await getFirebaseAccessToken(source)).toBe('new-token');
	});

	it('refreshes a token that is close to expiry', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json({ access_token: 'old-token', expires_in: 30 }),
			)
			.mockResolvedValueOnce(
				Response.json({ access_token: 'new-token', expires_in: 3600 }),
			);
		vi.stubGlobal('fetch', fetchMock);
		const source = credentials();
		expect(await getFirebaseAccessToken(source)).toBe('old-token');
		expect(await getFirebaseAccessToken(source)).toBe('new-token');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
