import { importPKCS8, SignJWT } from 'jose';
import { z } from 'zod';

const tokenUrl = 'https://oauth2.googleapis.com/token';
const credentialsSchema = z.object({
	type: z.literal('service_account'),
	project_id: z.string().min(1),
	client_email: z.email(),
	private_key: z.string().min(1),
});
const tokenSchema = z.object({
	access_token: z.string().min(1),
	expires_in: z.number().positive(),
});

type Token = Awaited<ReturnType<typeof issueToken>>;
let cachedAuth:
	| {
			source: string;
			token: Token | undefined;
			pending: Promise<Token> | undefined;
	  }
	| undefined;

async function issueToken(source: string) {
	let parsed: unknown;
	try {
		parsed = JSON.parse(source);
	} catch {
		throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid JSON.');
	}
	const result = credentialsSchema.safeParse(parsed);
	if (!result.success) {
		throw new Error(
			'FIREBASE_SERVICE_ACCOUNT is missing valid service-account fields.',
		);
	}
	const credentials = result.data;
	const key = await importPKCS8(credentials.private_key, 'RS256');
	const assertion = await new SignJWT({
		scope:
			'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
	})
		.setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
		.setIssuer(credentials.client_email)
		.setAudience(tokenUrl)
		.setIssuedAt()
		.setExpirationTime('1h')
		.sign(key);

	const response = await fetch(tokenUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion,
		}),
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) {
		throw new Error(
			`Firebase credential exchange failed (HTTP ${response.status}).`,
		);
	}
	const token = tokenSchema.parse(await response.json());
	return {
		value: token.access_token,
		expiresAt: Date.now() + token.expires_in * 1000,
	};
}

export async function getFirebaseAccessToken(source: string | undefined) {
	if (!source) {
		throw new Error(
			'Configure the FIREBASE_SERVICE_ACCOUNT Worker secret first.',
		);
	}
	if (!cachedAuth || cachedAuth.source !== source) {
		cachedAuth = { source, token: undefined, pending: undefined };
	}
	const cache = cachedAuth;
	if (cache.token && cache.token.expiresAt > Date.now() + 60_000) {
		return cache.token.value;
	}
	cache.pending ??= issueToken(source);
	try {
		cache.token = await cache.pending;
		return cache.token.value;
	} finally {
		cache.pending = undefined;
	}
}
