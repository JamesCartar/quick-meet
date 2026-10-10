import type { MediaState } from '@meet/contracts/meeting';
import { LoaderCircle, VideoOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/common/lib/utils';

type Props = {
	stream: MediaStream | null;
	media: MediaState;
	busy: boolean;
	displayName: string;
};

export function DevicePreview({ stream, media, busy, displayName }: Props) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const cameraVisible =
		media.cameraEnabled &&
		Boolean(
			stream?.getVideoTracks().some((track) => track.readyState === 'live'),
		);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		video.srcObject = stream;
		if (stream && media.cameraEnabled) void video.play().catch(() => {});
		return () => {
			video.srcObject = null;
		};
	}, [stream, media.cameraEnabled]);

	return (
		<div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-zinc-900 text-zinc-100">
			<video
				ref={videoRef}
				muted
				autoPlay
				playsInline
				aria-label="Camera preview"
				className={cn(
					'absolute inset-0 size-full -scale-x-100 object-cover',
					!cameraVisible && 'opacity-0',
				)}
			/>
			{(!cameraVisible || busy) && (
				<div className="relative flex flex-col items-center gap-4">
					<div className="flex size-20 items-center justify-center rounded-full bg-zinc-800">
						{busy ? (
							<LoaderCircle className="size-8 animate-spin text-zinc-300" />
						) : (
							<VideoOff className="size-8 text-zinc-300" />
						)}
					</div>
					<p className="text-sm text-zinc-300">
						{busy ? 'Checking device access…' : 'Camera is off'}
					</p>
				</div>
			)}
			<div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-black/40 px-4 py-3 text-sm">
				<span className="truncate font-medium">
					{displayName.trim() || 'You'}
				</span>
				<span className="shrink-0 text-xs text-zinc-200">
					{media.microphoneEnabled ? 'Mic on' : 'Mic off'} ·{' '}
					{media.cameraEnabled ? 'Camera on' : 'Camera off'}
				</span>
			</div>
		</div>
	);
}
