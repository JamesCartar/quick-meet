import type { Participant } from '@meet/contracts/meeting';
import { LoaderCircle, RefreshCw, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/common/lib/utils';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import { useSpeaking } from '../hooks/useSpeaking';
import { ParticipantBadge } from './ParticipantBadge';

type Props = {
	participant: Participant;
	stream: MediaStream | null;
	local: boolean;
	connectionState?: RTCPeerConnectionState;
	onRetry: () => void;
};

export function ParticipantTile({
	participant,
	stream,
	local,
	connectionState,
	onRetry,
}: Props) {
	const speaking = useSpeaking(stream, participant.microphoneEnabled);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [autoplayBlocked, setAutoplayBlocked] = useState(false);
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

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		let active = true;
		video.srcObject = stream;
		setAutoplayBlocked(false);
		if (stream)
			void video.play().catch(() => {
				if (active && !local) setAutoplayBlocked(true);
			});
		return () => {
			active = false;
			video.srcObject = null;
		};
	}, [stream, local]);

	const enableAudio = async () => {
		try {
			await videoRef.current?.play();
			setAutoplayBlocked(false);
		} catch {
			setAutoplayBlocked(true);
		}
	};

	return (
		<section
			aria-label={`${participant.displayName}${local ? ', you' : ''}`}
			data-speaking={speaking}
			data-connection-state={
				local ? 'local' : (connectionState ?? 'connecting')
			}
			className="relative size-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900"
		>
			<video
				ref={videoRef}
				autoPlay
				playsInline
				muted={local}
				aria-label={`${participant.displayName} video`}
				className={cn(
					'absolute inset-0 size-full object-cover',
					local && '-scale-x-100',
					!cameraVisible && 'opacity-0',
				)}
			/>
			{!cameraVisible && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pt-8">
					<Avatar className="size-16 sm:size-24">
						<AvatarFallback className="bg-zinc-800 text-2xl font-medium text-zinc-100 sm:text-3xl">
							{initials}
						</AvatarFallback>
					</Avatar>
					<p className="text-xs text-zinc-400">
						{connecting
							? 'Connecting…'
							: failed
								? 'Connection interrupted'
								: 'Camera off'}
					</p>
				</div>
			)}
			{connecting && (
				<div className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white">
					<LoaderCircle
						className="size-4 animate-spin"
						aria-label="Connecting"
					/>
				</div>
			)}
			{failed && (
				<div className="absolute inset-x-3 bottom-3 flex justify-center">
					<Button size="sm" variant="secondary" onClick={onRetry}>
						<RefreshCw /> Reconnect
					</Button>
				</div>
			)}
			{autoplayBlocked && (
				<div className="absolute inset-x-3 bottom-3 flex justify-center">
					<Button
						size="sm"
						variant="secondary"
						onClick={() => {
							void enableAudio();
						}}
					>
						<Volume2 /> Play audio
					</Button>
				</div>
			)}
			<ParticipantBadge
				displayName={participant.displayName}
				microphoneEnabled={participant.microphoneEnabled}
				speaking={speaking}
				local={local}
				connecting={connecting}
			/>
		</section>
	);
}
