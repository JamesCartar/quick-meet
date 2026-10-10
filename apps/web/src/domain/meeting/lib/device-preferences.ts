const storageKey = 'meet-device-preferences';

export type DevicePreferences = {
	audioInputId: string;
	videoInputId: string;
	audioOutputId: string;
};

const defaults: DevicePreferences = {
	audioInputId: 'default',
	videoInputId: 'default',
	audioOutputId: 'default',
};

export function getDevicePreferences(): DevicePreferences {
	try {
		const stored = localStorage.getItem(storageKey);
		if (!stored) return defaults;
		const value: unknown = JSON.parse(stored);
		if (typeof value !== 'object' || value === null) return defaults;
		const record = value as Record<string, unknown>;
		return {
			audioInputId:
				typeof record.audioInputId === 'string'
					? record.audioInputId
					: defaults.audioInputId,
			videoInputId:
				typeof record.videoInputId === 'string'
					? record.videoInputId
					: defaults.videoInputId,
			audioOutputId:
				typeof record.audioOutputId === 'string'
					? record.audioOutputId
					: defaults.audioOutputId,
		};
	} catch {
		return defaults;
	}
}

export function saveDevicePreferences(preferences: DevicePreferences) {
	try {
		localStorage.setItem(storageKey, JSON.stringify(preferences));
	} catch {
		// Device switching still works when storage is unavailable.
	}
}
