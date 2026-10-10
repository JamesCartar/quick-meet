const storageKey = 'meet-display-name';

export function saveDisplayName(name: string) {
	try {
		localStorage.setItem(storageKey, name);
	} catch {
		/* Storage can be unavailable in private browsing. */
	}
}

export function getDefaultDisplayName() {
	try {
		const saved = localStorage.getItem(storageKey)?.trim();
		if (saved) return saved;
	} catch {
		/* A generated name still lets the user join without storage. */
	}
	const name = `Guest ${Math.floor(Math.random() * 9000) + 1000}`;
	saveDisplayName(name);
	return name;
}
