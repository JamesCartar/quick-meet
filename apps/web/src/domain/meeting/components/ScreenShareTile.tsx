import { MonitorUp, ScreenShareOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/common/lib/utils';
import { Button } from '@/shared/components/ui/button';

type Props = {
	displayName: string;
	stream: MediaStream | null;
	local: boolean;
	streamRevision?: number;
	onStopSharing: () => void;
	compact?: boolean;
};

export function ScreenShareTile({
	displayName,
	stream,
	local,
	streamRevision = 0,
	onStopSharing,
	compact = false,
}: Props) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const screenVisible = Boolean(
		stream?.getVideoTracks().some((track) => track.readyState === 'live'),
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: local track replacement keeps the stream identity stable.
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		video.srcObject = screenVisible ? stream : null;
		if (screenVisible) void video.play().catch(() => {});
		return () => {
			video.srcObject = null;
		};
	}, [stream, streamRevision, screenVisible]);

	return (
		<section
			aria-label={`${displayName}'s shared screen${local ? ', you' : ''}`}
			className="relative size-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950"
		>
			{!screenVisible && (
				<div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
					Connecting to shared screen…
				</div>
			)}
			<video
				ref={videoRef}
				playsInline
				muted
				aria-label={`${displayName} screen share`}
				className="absolute inset-0 size-full object-contain"
			/>
			{local && (
				<div
					className={cn(
						'absolute inset-0 flex items-center justify-center bg-zinc-950/75 p-3 @max-[320px]/tile:p-0 @max-[90px]/tile:items-end @max-[90px]/tile:justify-start @max-[90px]/tile:p-1',
						compact && 'p-0',
					)}
				>
					<Button
						variant="secondary"
						className={cn(
							'h-11 gap-2 rounded-full border border-zinc-600/60 bg-zinc-800/95 px-4 text-xs text-zinc-100 shadow-lg hover:bg-zinc-700 focus-visible:ring-zinc-400/70 sm:px-5 sm:text-sm @max-[320px]/tile:h-6 @max-[320px]/tile:max-w-[calc(100%-4rem)] @max-[320px]/tile:px-2 @max-[320px]/tile:text-[9px] @max-[120px]/tile:size-7 @max-[120px]/tile:max-w-none @max-[120px]/tile:p-0 @max-[90px]/tile:size-6',
							compact && 'h-8 gap-1.5 px-3 text-[10px] sm:px-3 sm:text-[10px]',
						)}
						aria-label="Stop sharing screen"
						title="Stop sharing screen"
						onClick={onStopSharing}
					>
						<ScreenShareOff
							className={cn(
								'size-4 text-red-400 @max-[320px]/tile:hidden @max-[120px]/tile:block',
								compact && 'size-3.5',
							)}
						/>
						<span className="truncate @max-[120px]/tile:hidden">
							Stop sharing
						</span>
					</Button>
				</div>
			)}
			<div
				className={cn(
					'pointer-events-none absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-md bg-black/55 px-3 py-1.5 text-xs text-white @max-[320px]/tile:bottom-2 @max-[320px]/tile:left-2 @max-[320px]/tile:gap-1 @max-[320px]/tile:px-2 @max-[320px]/tile:py-1 @max-[320px]/tile:text-[10px] @max-[120px]/tile:hidden',
					compact &&
						'bottom-2 left-2 max-w-[calc(100%-7rem)] gap-1 px-2 py-1 text-[10px]',
				)}
			>
				<MonitorUp className={cn('size-4 shrink-0', compact && 'size-3')} />
				<span className="truncate">
					{local ? 'Your screen' : `${displayName}'s screen`}
				</span>
			</div>
		</section>
	);
}
