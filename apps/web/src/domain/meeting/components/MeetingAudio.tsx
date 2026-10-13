import type { Participant } from '@meet/contracts/meeting';
import { Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';

type Props = {
	participants: Participant[];
	selfId: string;
	streams: Record<string, MediaStream>;
	audioOutputId: string;
};

// Keep audio outside paginated GridItems: the layout package unmounts hidden
// tiles, but everyone in the call must remain audible on every page.
export function MeetingAudio({
	participants,
	selfId,
	streams,
	audioOutputId,
}: Props) {
	return (
		<div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap justify-center gap-2">
			{participants
				.filter(
					(participant) => participant.id !== selfId && streams[participant.id],
				)
				.map((participant) => (
					<RemoteAudio
						key={participant.id}
						displayName={participant.displayName}
						stream={streams[participant.id]}
						audioOutputId={audioOutputId}
					/>
				))}
		</div>
	);
}

function RemoteAudio({
	displayName,
	stream,
	audioOutputId,
}: {
	displayName: string;
	stream: MediaStream;
	audioOutputId: string;
}) {
	const ref = useRef<HTMLAudioElement>(null);
	const [blocked, setBlocked] = useState(false);
	useEffect(() => {
		const audio = ref.current;
		if (!audio) return;
		let active = true;
		audio.srcObject = stream;
		setBlocked(false);
		const play = () => {
			void audio.play().then(
				() => {
					if (active) setBlocked(false);
				},
				(error: unknown) => {
					// Track changes can interrupt an earlier play request without
					// meaning that the browser has blocked autoplay.
					if (
						active &&
						!(error instanceof DOMException && error.name === 'AbortError')
					)
						setBlocked(true);
				},
			);
		};
		// The mesh preserves stream identity while adding remote tracks.
		stream.addEventListener('addtrack', play);
		audio.addEventListener('canplay', play);
		play();
		const output = audio as HTMLMediaElement & {
			setSinkId?: (id: string) => Promise<void>;
		};
		void output
			.setSinkId?.(audioOutputId === 'default' ? '' : audioOutputId)
			.catch(() => {
				// A saved output may disappear when moving between devices.
				if (active) void output.setSinkId?.('').catch(() => {});
			});
		return () => {
			active = false;
			stream.removeEventListener('addtrack', play);
			audio.removeEventListener('canplay', play);
			audio.srcObject = null;
		};
	}, [stream, audioOutputId]);

	const retry = async () => {
		try {
			await ref.current?.play();
			setBlocked(false);
		} catch {
			setBlocked(true);
		}
	};
	return (
		<>
			{/* biome-ignore lint/a11y/useMediaCaption: This is live WebRTC audio; the meeting does not provide a caption stream. */}
			<audio ref={ref} autoPlay hidden aria-label={`${displayName} audio`} />
			{blocked && (
				<Button
					className="pointer-events-auto max-w-full rounded-full"
					size="sm"
					variant="secondary"
					onClick={() => void retry()}
				>
					<Volume2 />{' '}
					<span className="truncate">Play {displayName}'s audio</span>
				</Button>
			)}
		</>
	);
}
