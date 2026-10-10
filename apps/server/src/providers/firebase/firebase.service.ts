import type { Bindings } from '../../config/context';
import { getFirebaseAccessToken } from './auth';

export type FirebasePath =
	| 'meeting/participants'
	| 'meeting/signaling'
	| `meeting/participants/${string}`
	| `meeting/signaling/${string}`;

export type FirebaseValue =
	| null
	| boolean
	| number
	| string
	| FirebaseValue[]
	| { [key: string]: FirebaseValue };

export class FirebaseService {
	constructor(private readonly env: Bindings) {}

	get(path: FirebasePath) {
		return this.request('GET', path);
	}

	async set(path: FirebasePath, value: FirebaseValue) {
		await this.request('PUT', path, value);
	}

	async update(path: FirebasePath, value: Record<string, FirebaseValue>) {
		await this.request('PATCH', path, value);
	}

	async remove(path: FirebasePath) {
		await this.request('DELETE', path);
	}

	async getWithETag(path: FirebasePath) {
		const response = await this.requestResponse('GET', path, undefined, {
			'X-Firebase-ETag': 'true',
		});
		this.checkResponse(response);
		const etag = response.headers.get('ETag');
		if (!etag) throw new Error('Firebase did not return a transaction ETag.');
		const data: unknown = await response.json();
		return { data, etag };
	}

	async compareAndSet(path: FirebasePath, etag: string, value: FirebaseValue) {
		const response = await this.requestResponse('PUT', path, value, {
			'If-Match': etag,
		});
		if (response.status === 412) {
			await response.arrayBuffer();
			return false;
		}
		this.checkResponse(response);
		await response.arrayBuffer();
		return true;
	}

	private async request(
		method: 'GET' | 'PUT' | 'PATCH' | 'DELETE',
		path: FirebasePath,
		value?: FirebaseValue,
	) {
		const response = await this.requestResponse(method, path, value);
		this.checkResponse(response);
		const data: unknown = await response.json();
		return data;
	}

	private checkResponse(response: Response) {
		if (!response.ok) {
			throw new Error(
				`Firebase database request failed (HTTP ${response.status}).`,
			);
		}
	}

	private async requestResponse(
		method: 'GET' | 'PUT' | 'PATCH' | 'DELETE',
		path: FirebasePath,
		value?: FirebaseValue,
		extraHeaders: Record<string, string> = {},
	) {
		const segments = path.split('/');
		if (
			segments[0] !== 'meeting' ||
			!['participants', 'signaling'].includes(segments[1] ?? '') ||
			segments.some(
				(segment) =>
					!segment ||
					[...segment].some(
						(character) =>
							'.#$[]'.includes(character) ||
							character.charCodeAt(0) < 32 ||
							character.charCodeAt(0) === 127,
					),
			)
		) {
			throw new Error('Invalid meeting database path.');
		}
		const base = this.env.FIREBASE_DATABASE_URL.replace(/\/+$/, '');
		const url = new URL(
			`${base}/${segments.map(encodeURIComponent).join('/')}.json`,
		);
		if (url.protocol !== 'https:') {
			throw new Error('Firebase database URL must use HTTPS.');
		}
		const token = await getFirebaseAccessToken(
			this.env.FIREBASE_SERVICE_ACCOUNT,
		);
		const response = await fetch(url, {
			method,
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				...extraHeaders,
			},
			body: value === undefined ? undefined : JSON.stringify(value),
			signal: AbortSignal.timeout(10_000),
		});
		return response;
	}
}
