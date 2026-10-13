// An original, quiet two-note chime; no downloaded or third-party audio.
export function createJoinSound() {
	let context: AudioContext | null = null;
	let nextStart = 0;
	let outputId = '';
	let outputVersion = 0;

	const setOutput = (id: string) => {
		outputId = id === 'default' ? '' : id;
		const version = ++outputVersion;
		const audio = context as
			| (AudioContext & {
					setSinkId?: (sinkId: string) => Promise<void>;
			  })
			| null;
		if (!audio?.setSinkId) return;
		void audio.setSinkId(outputId).catch(() => {
			if (context === audio && version === outputVersion)
				void audio.setSinkId?.('').catch(() => {});
		});
	};

	const prepare = () => {
		if (!window.AudioContext) return;
		try {
			if (!context) {
				context = new AudioContext();
				setOutput(outputId);
			}
			// Called directly from the Join button gesture, before any awaits.
			if (context.state === 'suspended') void context.resume().catch(() => {});
		} catch {
			// Notifications must never prevent someone from joining a meeting.
		}
	};

	const play = () => {
		if (context?.state !== 'running') return;
		const start = Math.max(context.currentTime, nextStart);
		nextStart = start + 0.45;
		for (const [index, frequency] of [660, 880].entries()) {
			const oscillator = context.createOscillator();
			const gain = context.createGain();
			const at = start + index * 0.14;
			oscillator.type = 'sine';
			oscillator.frequency.setValueAtTime(frequency, at);
			gain.gain.setValueAtTime(0, at);
			gain.gain.linearRampToValueAtTime(0.14, at + 0.015);
			gain.gain.setValueAtTime(0.14, at + 0.09);
			gain.gain.linearRampToValueAtTime(0, at + 0.24);
			oscillator.connect(gain);
			gain.connect(context.destination);
			oscillator.onended = () => {
				oscillator.disconnect();
				gain.disconnect();
			};
			oscillator.start(at);
			oscillator.stop(at + 0.25);
		}
	};

	const close = () => {
		if (context && context.state !== 'closed')
			void context.close().catch(() => {});
		context = null;
		outputVersion++;
		nextStart = 0;
	};

	return { prepare, play, close, setOutput };
}
