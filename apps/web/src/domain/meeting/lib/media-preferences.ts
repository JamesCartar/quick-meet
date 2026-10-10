import { type MediaState, mediaStateSchema } from '@meet/contracts/meeting';

const storageKey = 'meet-media-preferences';

export function getMediaPreferences() {
	try {
		const stored = localStorage.getItem(storageKey);
		if (stored) {
			const result = mediaStateSchema.safeParse(JSON.parse(stored));
			if (result.success) return result.data;
		}
	} catch {
		/* Ignore unavailable storage or an invalid old preference. */
	}
	return { microphoneEnabled: true, cameraEnabled: true };
}

export function saveMediaPreferences(preferences: MediaState) {
	try {
		localStorage.setItem(storageKey, JSON.stringify(preferences));
	} catch {
		/* Device controls still work when storage is unavailable. */
	}
}
