import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDirectory = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = resolve(
	process.cwd(),
	process.argv[2] ?? 'src/config/meet-firebase-adminsdk.json',
);
const varsPath = resolve(serverDirectory, '.dev.vars');

try {
	const credentials = JSON.parse(await readFile(sourcePath, 'utf8'));
	if (
		credentials.type !== 'service_account' ||
		typeof credentials.project_id !== 'string' ||
		typeof credentials.client_email !== 'string' ||
		typeof credentials.private_key !== 'string'
	) {
		throw new Error('Invalid credentials');
	}
	const serialized = JSON.stringify({
		type: credentials.type,
		project_id: credentials.project_id,
		client_email: credentials.client_email,
		private_key: credentials.private_key,
	});
	if (serialized.includes("'")) {
		throw new Error('Unsupported credential characters');
	}
	let existing = '';
	try {
		existing = await readFile(varsPath, 'utf8');
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
	}
	const remaining = existing.replace(
		/^FIREBASE_SERVICE_ACCOUNT=.*(?:\r?\n|$)/gm,
		'',
	);
	await writeFile(
		varsPath,
		`${remaining.trimEnd()}${remaining.trim() ? '\n' : ''}FIREBASE_SERVICE_ACCOUNT='${serialized}'\n`,
		{ mode: 0o600 },
	);
	console.log(
		'Firebase credentials saved to the git-ignored apps/server/.dev.vars.',
	);
} catch {
	console.error(
		'Could not import credentials. Check the local file path and service-account JSON.',
	);
	process.exitCode = 1;
}
