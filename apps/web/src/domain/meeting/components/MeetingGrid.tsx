import type { Participant } from '@meet/contracts/meeting';
import {
	GridContainer,
	GridItem,
} from '@thangdevalone/meeting-grid-layout-react';
import { useEffect, useState } from 'react';
import { ParticipantTile } from './ParticipantTile';
import { ScreenShareTile } from './ScreenShareTile';

type Props = {
	participants: Participant[];
	selfId: string;
	localStream: MediaStream | null;
	remoteStreams: Record<string, MediaStream>;
	connectionStates: Record<string, RTCPeerConnectionState>;
	onRetry: (id: string) => void;
	audioOutputId: string;
	localStreamRevision: number;
	localScreenStream: MediaStream;
	remoteScreenStreams: Record<string, MediaStream>;
	screenRevision: number;
};

export function MeetingGrid({
	participants,
	selfId,
	localStream,
	remoteStreams,
	connectionStates,
	onRetry,
	audioOutputId,
	localStreamRevision,
	localScreenStream,
	remoteScreenStreams,
	screenRevision,
}: Props) {
	const presenters = participants.filter(
		(participant) => participant.screenSharing,
	);
	const tileCount = participants.length + presenters.length;
	const [mobilePortrait, setMobilePortrait] = useState(
		() =>
			window.matchMedia('(max-width: 639px) and (orientation: portrait)')
				.matches,
	);
	useEffect(() => {
		const query = window.matchMedia(
			'(max-width: 639px) and (orientation: portrait)',
		);
		const update = () => setMobilePortrait(query.matches);
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	}, []);
	return (
		<GridContainer
			className="size-full"
			count={tileCount}
			aspectRatio={mobilePortrait ? (tileCount >= 4 ? '1:1' : '4:3') : '16:9'}
			forceAspectRatio
			gap={mobilePortrait ? 8 : 12}
			layoutMode="gallery"
			disableFloat
		>
			{participants.map((participant, index) => (
				<GridItem key={participant.id} index={index}>
					<ParticipantTile
						participant={participant}
						local={participant.id === selfId}
						stream={
							participant.id === selfId
								? localStream
								: (remoteStreams[participant.id] ?? null)
						}
						connectionState={connectionStates[participant.id]}
						audioOutputId={audioOutputId}
						streamRevision={participant.id === selfId ? localStreamRevision : 0}
						onRetry={() => onRetry(participant.id)}
					/>
				</GridItem>
			))}
			{presenters.map((participant, index) => (
				<GridItem
					key={`${participant.id}-screen`}
					index={participants.length + index}
				>
					<ScreenShareTile
						displayName={participant.displayName}
						local={participant.id === selfId}
						stream={
							participant.id === selfId
								? localScreenStream
								: (remoteScreenStreams[participant.id] ?? null)
						}
						streamRevision={participant.id === selfId ? screenRevision : 0}
					/>
				</GridItem>
			))}
		</GridContainer>
	);
}
