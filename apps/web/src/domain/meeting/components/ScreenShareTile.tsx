import { MonitorUp, ScreenShareOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/shared/components/ui/button';

type Props = {
	displayName: string;
	stream: MediaStream | null;
	local: boolean;
	streamRevision?: number;
	onStopSharing: () => void;
};

export function ScreenShareTile({
	displayName,
	stream,
	local,
	streamRevision = 0,
	onStopSharing,
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
			{local && (
				<div className="absolute inset-0 flex items-center justify-center bg-zinc-950/75 p-3">
					<Button
						variant="secondary"
						className="h-11 gap-2 rounded-full border border-zinc-600/60 bg-zinc-800/95 px-4 text-xs text-zinc-100 shadow-lg hover:bg-zinc-700 focus-visible:ring-zinc-400/70 sm:px-5 sm:text-sm"
						aria-label="Stop sharing screen"
						onClick={onStopSharing}
					>
						<ScreenShareOff className="size-4 text-red-400" />
						Stop sharing
					</Button>
				</div>
			)}
			<div className="pointer-events-none absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-md bg-black/70 px-3 py-1.5 text-xs text-white">
				<MonitorUp className="size-4 shrink-0" />
				<span className="truncate">
					{local ? 'Your screen' : `${displayName}'s screen`}
				</span>
			</div>
		</section>
	);
}
