import type { Participant } from '@meet/contracts/meeting';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/common/lib/utils';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import { useSpeaking } from '../hooks/useSpeaking';
import { ParticipantBadge } from './ParticipantBadge';
import './ParticipantTile.css';

type Props = {
	participant: Participant;
	stream: MediaStream | null;
	local: boolean;
	connectionState?: RTCPeerConnectionState;
	onRetry: () => void;
	streamRevision?: number;
	compact?: boolean;
};

export function ParticipantTile({
	participant,
	stream,
	local,
	connectionState,
	onRetry,
	streamRevision = 0,
	compact = false,
}: Props) {
	const speaking = useSpeaking(
		stream,
		participant.microphoneEnabled,
		streamRevision,
	);
	const videoRef = useRef<HTMLVideoElement>(null);
	const cameraVisible =
		participant.cameraEnabled &&
		Boolean(
			stream?.getVideoTracks().some((track) => track.readyState === 'live'),
		);
	const connecting =
		!local &&
		(!connectionState ||
			connectionState === 'new' ||
			connectionState === 'connecting');
	const failed =
		!local &&
		(connectionState === 'failed' || connectionState === 'disconnected');
	const initials = participant.displayName
		.split(/\s+/)
		.slice(0, 2)
		.map((name) => name[0])
		.join('')
		.toUpperCase();

	// biome-ignore lint/correctness/useExhaustiveDependencies: track replacement increments this prop while preserving the MediaStream identity.
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		video.srcObject = cameraVisible ? stream : null;
		if (cameraVisible) void video.play().catch(() => {});
		return () => {
			video.srcObject = null;
		};
	}, [stream, streamRevision, cameraVisible]);

	return (
		<section
			aria-label={`${participant.displayName}${local ? ', you' : ''}`}
			data-speaking={speaking}
			data-connection-state={
				local ? 'local' : (connectionState ?? 'connecting')
			}
			className="relative size-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900"
		>
			{/* Audio stays independent of paginated video tiles. */}
			<video
				ref={videoRef}
				playsInline
				muted
				aria-label={`${participant.displayName} video`}
				className={cn(
					'absolute inset-0 size-full object-contain',
					local && '-scale-x-100',
					!cameraVisible && 'opacity-0',
				)}
			/>
			{!cameraVisible && (
				<div
					className={cn(
						'absolute inset-0 flex flex-col items-center justify-center gap-3 pt-8 @max-[320px]/tile:gap-2 @max-[320px]/tile:pt-4 @max-[90px]/tile:pt-6',
						compact && 'gap-2 pt-4',
						failed &&
							'@max-[480px]/tile:pt-6 @max-[480px]/tile:pb-6 @max-[320px]/tile:pt-6',
						compact && failed && 'pt-6 pb-6',
					)}
				>
					<div
						className={cn(
							'relative isolate shrink-0',
							failed && '@max-[90px]/tile:hidden',
						)}
					>
						<span
							aria-hidden="true"
							className="meeting-speaking-halo"
							data-active={
								speaking &&
								participant.microphoneEnabled &&
								!connecting &&
								!failed
							}
						/>
						<Avatar
							className={cn(
								'relative z-10 size-16 sm:size-24 @max-[480px]/tile:size-10 @max-[320px]/tile:size-8 @max-[120px]/tile:size-4 @max-[90px]/tile:size-3',
								compact && 'size-10 sm:size-10',
								failed &&
									'@max-[320px]/tile:size-5 @max-[160px]/tile:size-3 @max-[90px]/tile:hidden',
							)}
						>
							<AvatarFallback
								className={cn(
									'bg-zinc-800 text-2xl font-medium text-zinc-100 sm:text-3xl @max-[480px]/tile:text-sm @max-[320px]/tile:text-xs @max-[120px]/tile:text-[10px] @max-[90px]/tile:text-[6px]',
									compact && 'text-sm sm:text-sm',
									failed &&
										'@max-[320px]/tile:text-[9px] @max-[160px]/tile:text-[6px]',
								)}
							>
								{initials}
							</AvatarFallback>
						</Avatar>
					</div>
					{(connecting || failed) && (
						<p
							className={cn(
								'text-xs text-zinc-400 @max-[320px]/tile:sr-only',
								compact && 'sr-only',
							)}
						>
							{connecting ? 'Connecting…' : 'Connection interrupted'}
						</p>
					)}
				</div>
			)}
			{connecting && (
				<div
					className={cn(
						'absolute right-3 bottom-3 rounded-full bg-black/60 p-2 text-white @max-[320px]/tile:right-1 @max-[320px]/tile:bottom-1 @max-[320px]/tile:p-1 @max-[120px]/tile:right-1 @max-[120px]/tile:bottom-px @max-[120px]/tile:p-0.5',
						compact && 'right-2 bottom-2 p-1',
					)}
				>
					<LoaderCircle
						className={cn(
							'size-4 animate-spin @max-[320px]/tile:size-3 @max-[120px]/tile:size-2',
							compact && 'size-3',
						)}
						aria-label="Connecting"
					/>
				</div>
			)}
			{failed && (
				<div
					className={cn(
						'absolute inset-x-3 bottom-3 flex justify-center @max-[320px]/tile:inset-x-1 @max-[320px]/tile:bottom-1 @max-[90px]/tile:bottom-px',
						compact && 'inset-x-1 bottom-1 @max-[90px]/tile:bottom-px',
					)}
				>
					<Button
						size="sm"
						variant="secondary"
						className={cn(
							'max-w-full @max-[480px]/tile:h-6 @max-[480px]/tile:gap-1 @max-[480px]/tile:px-2 @max-[480px]/tile:text-[10px] @max-[480px]/tile:[&_svg]:size-3 @max-[320px]/tile:h-5 @max-[320px]/tile:gap-1 @max-[320px]/tile:px-1 @max-[320px]/tile:text-[9px] @max-[320px]/tile:[&_svg]:size-3 @max-[90px]/tile:h-4 @max-[90px]/tile:w-6',
							compact &&
								'h-6 max-w-full gap-1 px-1 text-[9px] [&_svg]:size-3 @max-[320px]/tile:h-5',
						)}
						aria-label="Reconnect"
						title="Reconnect"
						onClick={onRetry}
					>
						<RefreshCw />{' '}
						<span className="@max-[90px]/tile:hidden">Reconnect</span>
					</Button>
				</div>
			)}
			<ParticipantBadge
				displayName={participant.displayName}
				microphoneEnabled={participant.microphoneEnabled}
				speaking={speaking}
				local={local}
				compact={compact}
			/>
		</section>
	);
}
