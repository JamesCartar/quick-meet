import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Check both the index and working tree without printing credential contents.
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
	.split('\0')
	.filter(Boolean);
const untracked = execFileSync(
	'git',
	['ls-files', '--others', '--exclude-standard', '-z'],
	{ encoding: 'utf8' },
)
	.split('\0')
	.filter(Boolean);
const patterns = [
	/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
	/\b(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}/,
	/\bAKIA[A-Z0-9]{16}\b/,
	/^\s*FIREBASE_SERVICE_ACCOUNT\s*=\s*(?!\s*(?:''|""|$))\S.+/m,
];
const findings = new Set();
const sensitivePath = (path) => {
	if (path.endsWith('.env.example') || path.endsWith('.dev.vars.example'))
		return false;
	return (
		/(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|\.mcp\.json)$/.test(path) ||
		/(?:firebase-adminsdk|service-account|serviceAccount).*\.json$/i.test(
			path,
		) ||
		/\.(?:pem|key|p12|pfx)$/i.test(path) ||
		/(?:^|\/)(?:credentials|secrets)\//.test(path)
	);
};
const check = (path, content, source) => {
	if (patterns.some((pattern) => pattern.test(content)))
		findings.add(`${path} (${source}: possible secret)`);
};

for (const path of tracked) {
	if (sensitivePath(path))
		findings.add(`${path} (sensitive file is staged/tracked)`);
	check(
		path,
		execFileSync('git', ['show', `:${path}`], {
			encoding: 'utf8',
			maxBuffer: 20 * 1024 * 1024,
		}),
		'index',
	);
}
for (const path of new Set([...tracked, ...untracked])) {
	try {
		check(path, readFileSync(path, 'utf8'), 'working tree');
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
	}
}
if (findings.size) {
	console.error(
		'Do not push yet. Review these files (credential values are not displayed):',
	);
	for (const finding of findings) console.error(`- ${finding}`);
	process.exitCode = 1;
} else {
	console.log(
		'No sensitive tracked files or recognized credential patterns found in the index/working tree.',
	);
	console.log('This is a basic check, not a guarantee or a Git history scan.');
}
