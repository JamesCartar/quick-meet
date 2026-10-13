import { useEffect, useRef, useState } from 'react';

export function useMeetingFullscreen(enabled: boolean) {
	const [fullscreen, setFullscreen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const active = useRef(false);
	const pending = useRef(false);
	const owned = useRef(false);
	const supported = Boolean(
		document.fullscreenEnabled &&
			typeof document.documentElement.requestFullscreen === 'function' &&
			typeof document.exitFullscreen === 'function',
	);

	useEffect(() => {
		active.current = enabled;
		const update = () => {
			setFullscreen(document.fullscreenElement === document.documentElement);
			if (!document.fullscreenElement) owned.current = false;
		};
		update();
		document.addEventListener('fullscreenchange', update);
		return () => {
			active.current = false;
			document.removeEventListener('fullscreenchange', update);
			if (
				owned.current &&
				document.fullscreenElement === document.documentElement
			) {
				owned.current = false;
				void document.exitFullscreen().catch(() => {});
			}
		};
	}, [enabled]);

	const toggle = async () => {
		if (!active.current || pending.current) return;
		setError(null);
		if (!supported) {
			setError('Fullscreen is not supported in this browser.');
			return;
		}
		pending.current = true;
		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
				owned.current = false;
			} else {
				// Fullscreen the document so footer controls and portaled dialogs
				// remain available, rather than fullscreening just one video tile.
				await document.documentElement.requestFullscreen();
				owned.current = true;
				if (!active.current) {
					owned.current = false;
					if (document.fullscreenElement === document.documentElement)
						await document.exitFullscreen();
				}
			}
		} catch {
			if (active.current)
				setError(
					'Could not change fullscreen mode. Try again or use your browser’s fullscreen option.',
				);
		} finally {
			pending.current = false;
		}
	};

	return { fullscreen, supported, error, toggle };
}
