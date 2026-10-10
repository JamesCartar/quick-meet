import type { MediaState } from '@meet/contracts/meeting';

export async function requestMedia(options: MediaState) {
	if (!options.cameraEnabled && !options.microphoneEnabled)
		return new MediaStream();
	if (!navigator.mediaDevices?.getUserMedia) {
		throw new Error(
			'Camera and microphone access requires HTTPS or localhost and a supported browser.',
		);
	}
	return navigator.mediaDevices.getUserMedia({
		audio: options.microphoneEnabled
			? { echoCancellation: true, noiseSuppression: true }
			: false,
		video: options.cameraEnabled
			? {
					width: { ideal: 640 },
					height: { ideal: 360 },
					frameRate: { ideal: 20, max: 24 },
				}
			: false,
	});
}

export async function requestPreviewMedia(preferences: MediaState) {
	try {
		const stream = await requestMedia(preferences);
		return { stream, media: preferences, error: null };
	} catch {
		// A combined request can fail because just one device is blocked/missing.
		// Probe separately so an available microphone or camera still works.
		const stream = new MediaStream();
		const failures: string[] = [];
		for (const kind of ['audio', 'video'] as const) {
			if (
				!(kind === 'audio'
					? preferences.microphoneEnabled
					: preferences.cameraEnabled)
			)
				continue;
			try {
				const acquired = await requestMedia({
					microphoneEnabled: kind === 'audio',
					cameraEnabled: kind === 'video',
				});
				acquired.getTracks().forEach((track) => {
					stream.addTrack(track);
				});
			} catch (failure) {
				failures.push(getDeviceError(kind, failure));
			}
		}
		return {
			stream,
			media: {
				microphoneEnabled: stream.getAudioTracks().length > 0,
				cameraEnabled: stream.getVideoTracks().length > 0,
			},
			error:
				failures.join(' ') ||
				'Your devices could not be opened. You can join with them off.',
		};
	}
}

export function getDeviceError(kind: 'audio' | 'video', error: unknown) {
	const device = kind === 'audio' ? 'Microphone' : 'Camera';
	if (error instanceof DOMException) {
		if (error.name === 'NotAllowedError')
			return `${device} access was denied. Allow it in your browser’s site settings to turn it on.`;
		if (error.name === 'NotFoundError')
			return `${device} not found. Connect one, or leave it off.`;
		if (error.name === 'NotReadableError')
			return `${device} is being used by another app. Close that app and try again.`;
	}
	return `${device} could not be opened. You can join with it off.`;
}

export function getMeetingError(error: unknown) {
	if (error instanceof DOMException) {
		if (error.name === 'NotAllowedError')
			return 'Camera or microphone permission was denied. Allow access in your browser, or join with them turned off.';
		if (error.name === 'NotFoundError')
			return 'No camera or microphone was found. Turn off the missing device and try again.';
		if (error.name === 'NotReadableError')
			return 'Your camera or microphone is in use by another app. Close it and try again.';
	}
	return error instanceof Error
		? error.message
		: 'Something went wrong. Please try again.';
}

export function stopMedia(stream: MediaStream | null) {
	stream?.getTracks().forEach((track) => {
		track.stop();
	});
}
