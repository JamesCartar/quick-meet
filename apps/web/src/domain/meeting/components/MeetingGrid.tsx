import type { Participant } from '@meet/contracts/meeting';
import {
	GridContainer,
	GridItem,
} from '@thangdevalone/meeting-grid-layout-react';
import { useEffect, useState } from 'react';
import { ParticipantTile } from './ParticipantTile';

type Props = {
	participants: Participant[];
	selfId: string;
	localStream: MediaStream | null;
	remoteStreams: Record<string, MediaStream>;
	connectionStates: Record<string, RTCPeerConnectionState>;
	onRetry: (id: string) => void;
	audioOutputId: string;
	localStreamRevision: number;
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
}: Props) {
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
			count={participants.length}
			aspectRatio={
				mobilePortrait ? (participants.length >= 4 ? '1:1' : '4:3') : '16:9'
			}
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
		</GridContainer>
	);
}
