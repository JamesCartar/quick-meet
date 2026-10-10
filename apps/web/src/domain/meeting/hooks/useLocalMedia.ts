import type { MediaState } from '@meet/contracts/meeting';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
	type DevicePreferences,
	getDevicePreferences,
	saveDevicePreferences,
} from '../lib/device-preferences';
import {
	getDeviceError,
	requestMedia,
	requestPreviewMedia,
	stopMedia,
} from '../lib/media';
import {
	getMediaPreferences,
	saveMediaPreferences,
} from '../lib/media-preferences';

export function useLocalMedia(previewEnabled: boolean) {
	const streamRef = useRef<MediaStream | null>(null);
	const requestVersion = useRef(0);
	const mounted = useRef(false);
	const busyRef = useRef(false);
	const watchedTracks = useRef(new WeakSet<MediaStreamTrack>());
	const pendingPreview = useRef<Promise<
		Awaited<ReturnType<typeof requestPreviewMedia>>
	> | null>(null);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [media, setMedia] = useState(getMediaPreferences);
	const mediaRef = useRef(media);
	const [revision, setRevision] = useState(0);
	const [busy, setBusy] = useState(previewEnabled);
	const [error, setError] = useState<string | null>(null);
	const [devicePreferences, setDevicePreferences] =
		useState(getDevicePreferences);
	const devicePreferencesRef = useRef(devicePreferences);
	const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>(
		[],
	);

	const updateDevicePreferences = useCallback((next: DevicePreferences) => {
		devicePreferencesRef.current = next;
		setDevicePreferences(next);
		saveDevicePreferences(next);
	}, []);

	const updateMedia = useCallback((next: MediaState) => {
		mediaRef.current = next;
		setMedia(next);
		saveMediaPreferences(next);
	}, []);

	const watchTracks = useCallback(
		(current: MediaStream) => {
			current.getTracks().forEach((track) => {
				if (watchedTracks.current.has(track)) return;
				watchedTracks.current.add(track);
				track.addEventListener(
					'ended',
					() => {
						if (!mounted.current || streamRef.current !== current) return;
						const property =
							track.kind === 'audio' ? 'microphoneEnabled' : 'cameraEnabled';
						updateMedia({ ...mediaRef.current, [property]: false });
						setRevision((value) => value + 1);
						setError(
							`${track.kind === 'audio' ? 'Microphone' : 'Camera'} access ended. Check your device and browser permissions to turn it back on.`,
						);
					},
					{ once: true },
				);
			});
		},
		[updateMedia],
	);

	const stop = useCallback(() => {
		requestVersion.current++;
		stopMedia(streamRef.current);
		streamRef.current = null;
		setStream(null);
		busyRef.current = false;
		setBusy(false);
	}, []);

	// Joining reuses the already-approved preview rather than requesting devices again.
	const prepare = useCallback(
		async (options: MediaState) => {
			if (streamRef.current) return streamRef.current;
			const version = ++requestVersion.current;
			const result = await requestPreviewMedia(
				options,
				devicePreferencesRef.current,
			);
			if (version !== requestVersion.current) {
				stopMedia(result.stream);
				throw new DOMException('Media request cancelled', 'AbortError');
			}
			streamRef.current = result.stream;
			setStream(result.stream);
			updateMedia(result.media);
			watchTracks(result.stream);
			setError(result.error);
			setRevision((value) => value + 1);
			return result.stream;
		},
		[updateMedia, watchTracks],
	);

	const selectDevice = async (kind: MediaDeviceKind, deviceId: string) => {
		const preferenceKey =
			kind === 'audioinput'
				? 'audioInputId'
				: kind === 'videoinput'
					? 'videoInputId'
					: 'audioOutputId';
		const previous = devicePreferencesRef.current;
		const next = { ...previous, [preferenceKey]: deviceId };
		if (kind === 'audiooutput') {
			const targets = Array.from(
				document.querySelectorAll<HTMLVideoElement>('video:not([muted])'),
			);
			const sinkId = deviceId === 'default' ? '' : deviceId;
			try {
				await Promise.all(
					targets.map((target) => {
						const mediaElement = target as HTMLMediaElement & {
							setSinkId?: (id: string) => Promise<void>;
						};
						return mediaElement.setSinkId?.(sinkId);
					}),
				);
				updateDevicePreferences(next);
				setError(null);
			} catch {
				setError(
					'The selected speaker could not be used. Try another output device.',
				);
			}
			return;
		}
		updateDevicePreferences(next);

		const current = streamRef.current;
		const trackKind = kind === 'audioinput' ? 'audio' : 'video';
		if (
			!current
				?.getTracks()
				.some(
					(track) => track.kind === trackKind && track.readyState === 'live',
				) ||
			busyRef.current
		)
			return;

		const version = requestVersion.current;
		busyRef.current = true;
		setBusy(true);
		setError(null);
		try {
			const acquired = await requestMedia(
				{
					microphoneEnabled: trackKind === 'audio',
					cameraEnabled: trackKind === 'video',
				},
				next,
			);
			if (version !== requestVersion.current || streamRef.current !== current) {
				stopMedia(acquired);
				return;
			}
			const existing = current
				.getTracks()
				.filter((track) => track.kind === trackKind);
			existing.forEach((track) => {
				current.removeTrack(track);
				track.stop();
			});
			acquired.getTracks().forEach((track) => {
				current.addTrack(track);
			});
			watchTracks(current);
			setRevision((value) => value + 1);
		} catch (failure) {
			updateDevicePreferences(previous);
			setError(getDeviceError(trackKind, failure));
		} finally {
			busyRef.current = false;
			if (mounted.current) setBusy(false);
		}
	};

	const toggle = async (kind: 'audio' | 'video') => {
		const current = streamRef.current;
		if (!current || busyRef.current) return;
		const version = requestVersion.current;
		busyRef.current = true;
		setBusy(true);
		setError(null);
		const property = kind === 'audio' ? 'microphoneEnabled' : 'cameraEnabled';
		try {
			const existing = current
				.getTracks()
				.filter((track) => track.kind === kind);
			const enabled = !existing.some((track) => track.readyState === 'live');
			if (enabled) {
				const acquired = await requestMedia(
					{
						microphoneEnabled: kind === 'audio',
						cameraEnabled: kind === 'video',
					},
					devicePreferencesRef.current,
				);
				if (version !== requestVersion.current) {
					stopMedia(acquired);
					return;
				}
				existing.forEach((track) => {
					current.removeTrack(track);
				});
				acquired.getTracks().forEach((track) => {
					current.addTrack(track);
				});
				watchTracks(current);
			} else {
				existing.forEach((track) => {
					current.removeTrack(track);
					track.stop();
				});
			}
			updateMedia({ ...mediaRef.current, [property]: enabled });
			setRevision((value) => value + 1);
		} catch (failure) {
			if (mounted.current) {
				updateMedia({ ...mediaRef.current, [property]: false });
				setError(getDeviceError(kind, failure));
			}
		} finally {
			busyRef.current = false;
			if (mounted.current) setBusy(false);
		}
	};

	useEffect(() => {
		const mediaDevices = navigator.mediaDevices;
		if (!mediaDevices?.enumerateDevices) return;
		if (!stream) {
			setAvailableDevices([]);
			return;
		}
		let active = true;
		const refresh = async () => {
			try {
				const list = await mediaDevices.enumerateDevices();
				if (active) setAvailableDevices(list);
			} catch {
				if (active) setAvailableDevices([]);
			}
		};
		void refresh();
		mediaDevices.addEventListener?.('devicechange', refresh);
		return () => {
			active = false;
			mediaDevices.removeEventListener?.('devicechange', refresh);
		};
	}, [stream]);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			requestVersion.current++;
			stopMedia(streamRef.current);
			streamRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (
			!previewEnabled ||
			streamRef.current ||
			document.visibilityState === 'hidden'
		)
			return;
		let active = true;
		const version = ++requestVersion.current;
		busyRef.current = true;
		setBusy(true);
		// Share the initial request across React StrictMode's effect replay.
		pendingPreview.current ??= requestPreviewMedia(
			mediaRef.current,
			devicePreferencesRef.current,
		);
		const request = pendingPreview.current;
		void request
			.then((result) => {
				if (!active || version !== requestVersion.current) {
					if (!mounted.current) stopMedia(result.stream);
					return;
				}
				streamRef.current = result.stream;
				setStream(result.stream);
				updateMedia(result.media);
				watchTracks(result.stream);
				setError(result.error);
				setRevision((value) => value + 1);
			})
			.finally(() => {
				if (pendingPreview.current === request) pendingPreview.current = null;
				if (active) {
					busyRef.current = false;
					setBusy(false);
				}
			});
		return () => {
			active = false;
		};
	}, [previewEnabled, updateMedia, watchTracks]);

	return {
		stream,
		media,
		revision,
		busy,
		error,
		prepare,
		stop,
		toggle,
		devicePreferences,
		availableDevices,
		selectDevice,
	};
}
