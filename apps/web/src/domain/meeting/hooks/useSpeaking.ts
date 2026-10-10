import { useEffect, useState } from 'react';

// Analyze existing audio locally; speaking activity is not sent to the room.
export function useSpeaking(
	stream: MediaStream | null,
	microphoneEnabled: boolean,
) {
	const [speaking, setSpeaking] = useState(false);

	useEffect(() => {
		setSpeaking(false);
		if (!stream || !microphoneEnabled || !window.AudioContext) return;
		const track = stream
			.getAudioTracks()
			.find((track) => track.readyState === 'live');
		if (!track) return;

		const context = new AudioContext();
		const source = context.createMediaStreamSource(new MediaStream([track]));
		const analyser = context.createAnalyser();
		analyser.fftSize = 512;
		source.connect(analyser);
		const samples = new Float32Array(analyser.fftSize);
		let lastVoice = -Infinity;
		let previous = false;

		const resume = () => {
			if (context.state === 'suspended') void context.resume().catch(() => {});
		};
		resume();
		document.addEventListener('pointerdown', resume);
		document.addEventListener('keydown', resume);

		const timer = window.setInterval(() => {
			analyser.getFloatTimeDomainData(samples);
			let energy = 0;
			for (const sample of samples) energy += sample * sample;
			const now = performance.now();
			if (
				track.enabled &&
				track.readyState === 'live' &&
				Math.sqrt(energy / samples.length) >= 0.025
			)
				lastVoice = now;
			const next =
				track.enabled && track.readyState === 'live' && now - lastVoice < 350;
			if (next !== previous) {
				previous = next;
				setSpeaking(next);
			}
		}, 100);

		return () => {
			window.clearInterval(timer);
			document.removeEventListener('pointerdown', resume);
			document.removeEventListener('keydown', resume);
			source.disconnect();
			analyser.disconnect();
			void context.close().catch(() => {});
		};
	}, [stream, microphoneEnabled]);

	return microphoneEnabled && speaking;
}
