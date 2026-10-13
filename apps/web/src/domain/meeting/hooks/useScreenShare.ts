import { useCallback, useEffect, useRef, useState } from 'react';
import { stopMedia } from '../lib/media';

export function useScreenShare() {
	// Keep the stream identity stable so starting a share never rebuilds peers.
	const [stream] = useState(() => new MediaStream());
	const [sharing, setSharing] = useState(false);
	const [busy, setBusy] = useState(false);
	const [revision, setRevision] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [warningVersion, setWarningVersion] = useState(0);
	const mounted = useRef(false);
	const pending = useRef(false);
	const version = useRef(0);
	const supported =
		typeof navigator.mediaDevices?.getDisplayMedia === 'function';

	const stop = useCallback(() => {
		version.current++;
		stopMedia(stream);
		stream.getTracks().forEach((track) => {
			stream.removeTrack(track);
		});
		setSharing(false);
		setRevision((value) => value + 1);
	}, [stream]);

	const start = async () => {
		if (pending.current || stream.getVideoTracks().length) return;
		setError(null);
		if (!supported) {
			setError(
				'Screen sharing is not supported in this browser. Try a desktop browser.',
			);
			setWarningVersion((value) => value + 1);
			return;
		}
		pending.current = true;
		setBusy(true);
		const request = ++version.current;
		try {
			const captured = await navigator.mediaDevices.getDisplayMedia({
				video: {
					width: { ideal: 1920 },
					height: { ideal: 1080 },
					frameRate: { ideal: 15, max: 30 },
				},
				audio: false,
			});
			if (!mounted.current || request !== version.current) {
				stopMedia(captured);
				return;
			}
			const track = captured.getVideoTracks()[0];
			if (track?.readyState !== 'live') {
				stopMedia(captured);
				return;
			}
			track.contentHint = 'detail';
			stream.addTrack(track);
			track.addEventListener('ended', stop, { once: true });
			setSharing(true);
			setRevision((value) => value + 1);
		} catch (failure) {
			if (!mounted.current || request !== version.current) return;
			// Dismissing the browser picker is a normal user action.
			if (failure instanceof DOMException && failure.name === 'NotAllowedError')
				return;
			setError(
				'Could not share your screen. Check browser and system permissions and try again.',
			);
			setWarningVersion((value) => value + 1);
		} finally {
			pending.current = false;
			if (mounted.current) setBusy(false);
		}
	};

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			version.current++;
			stopMedia(stream);
			stream.getTracks().forEach((track) => {
				stream.removeTrack(track);
			});
		};
	}, [stream]);

	const toggle = async () => {
		if (sharing) stop();
		else await start();
	};

	return {
		stream,
		sharing,
		busy,
		revision,
		error,
		warningVersion,
		supported,
		toggle,
		stop,
	};
}
