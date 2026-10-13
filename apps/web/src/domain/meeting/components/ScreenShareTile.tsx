import { MonitorUp } from 'lucide-react';
import { useEffect, useRef } from 'react';

type Props = {
	displayName: string;
	stream: MediaStream | null;
	local: boolean;
	streamRevision?: number;
};

export function ScreenShareTile({
	displayName,
	stream,
	local,
	streamRevision = 0,
}: Props) {
	const videoRef = useRef<HTMLVideoElement>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: local track replacement keeps the stream identity stable.
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		video.srcObject = stream;
		if (stream) void video.play().catch(() => {});
		return () => {
			video.srcObject = null;
		};
	}, [stream, streamRevision]);

	return (
		<section
			aria-label={`${displayName}'s shared screen${local ? ', you' : ''}`}
			className="relative size-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950"
		>
			{!stream && (
				<div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
					Connecting to shared screen…
				</div>
			)}
			<video
				ref={videoRef}
				autoPlay
				playsInline
				muted
				aria-label={`${displayName} screen share`}
				className="absolute inset-0 size-full object-contain"
			/>
			<div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-md bg-black/70 px-3 py-1.5 text-xs text-white">
				<MonitorUp className="size-4 shrink-0" />
				<span className="truncate">
					{local ? 'Your screen' : `${displayName}'s screen`}
				</span>
			</div>
		</section>
	);
}
