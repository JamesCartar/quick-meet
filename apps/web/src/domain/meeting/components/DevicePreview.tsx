import type { MediaState } from '@meet/contracts/meeting';
import { LoaderCircle, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/common/lib/utils';
import { Button } from '@/shared/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/shared/components/ui/tooltip';

type Props = {
	stream: MediaStream | null;
	media: MediaState;
	busy: boolean;
	controlsDisabled: boolean;
	onToggleMedia: (kind: 'audio' | 'video') => Promise<void>;
};

export function DevicePreview({
	stream,
	media,
	busy,
	controlsDisabled,
	onToggleMedia,
}: Props) {
	const microphoneLabel = media.microphoneEnabled
		? 'Mute microphone'
		: 'Turn on microphone';
	const cameraLabel = media.cameraEnabled
		? 'Turn off camera'
		: 'Turn on camera';
	const controlClassName =
		'size-12 rounded-full border p-0 shadow-sm disabled:opacity-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 sm:size-11 [&_svg]:size-5';
	const enabledClassName =
		'border-white/30 bg-zinc-950/80 text-white hover:bg-zinc-800';
	const disabledClassName =
		'border-red-500 bg-red-600 text-white hover:bg-red-700';
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
		<div className="relative flex aspect-video min-h-56 w-full min-w-0 items-center justify-center overflow-hidden sm:min-h-60 rounded-2xl bg-zinc-900 text-zinc-100">
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
				<div className="relative flex flex-col items-center gap-2">
					<div className="flex size-14 items-center justify-center rounded-full bg-zinc-800 sm:size-20">
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
			<TooltipProvider delayDuration={300}>
				<fieldset
					aria-label="Preview device controls"
					className="absolute inset-x-0 bottom-3 flex min-w-0 justify-center gap-3 border-0 p-0"
				>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								aria-label={microphoneLabel}
								aria-pressed={media.microphoneEnabled}
								disabled={controlsDisabled}
								className={cn(
									controlClassName,
									media.microphoneEnabled
										? enabledClassName
										: disabledClassName,
								)}
								onClick={() => {
									void onToggleMedia('audio');
								}}
							>
								{media.microphoneEnabled ? <Mic /> : <MicOff />}
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top" sideOffset={8}>
							{microphoneLabel}
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								aria-label={cameraLabel}
								aria-pressed={media.cameraEnabled}
								disabled={controlsDisabled}
								className={cn(
									controlClassName,
									media.cameraEnabled ? enabledClassName : disabledClassName,
								)}
								onClick={() => {
									void onToggleMedia('video');
								}}
							>
								{media.cameraEnabled ? <Video /> : <VideoOff />}
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top" sideOffset={8}>
							{cameraLabel}
						</TooltipContent>
					</Tooltip>
				</fieldset>
			</TooltipProvider>
		</div>
	);
}
