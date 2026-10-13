import type { Participant } from '@meet/contracts/meeting';
import {
	GridContainer,
	GridItem,
} from '@thangdevalone/meeting-grid-layout-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/common/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { MeetingAudio } from './MeetingAudio';
import { ParticipantTile } from './ParticipantTile';
import { ScreenShareTile } from './ScreenShareTile';
import { TilePinButton } from './TilePinButton';

const SIDEBAR_PAGE_SIZE = 4;

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
	onStopScreenShare: () => void;
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
	onStopScreenShare,
}: Props) {
	const tiles = [
		...participants.map((participant) => ({
			key: `${participant.id}:camera`,
			kind: 'camera' as const,
			participant,
		})),
		...participants
			.filter((participant) => participant.screenSharing)
			.map((participant) => ({
				key: `${participant.id}:screen`,
				kind: 'screen' as const,
				participant,
			})),
	];
	const [pinnedKey, setPinnedKey] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const pinnedIndex = tiles.findIndex((tile) => tile.key === pinnedKey);
	const pinned = pinnedIndex >= 0;
	const smallPinnedGroup = pinned && (tiles.length === 2 || tiles.length === 3);
	const [shortViewport, setShortViewport] = useState(
		() => window.matchMedia('(max-height: 500px)').matches,
	);
	// Preserve 16:9 on short landscape screens by paginating rather than
	// squeezing four sidebar thumbnails into an unusably small area.
	const pageSize = pinned
		? shortViewport
			? 2
			: SIDEBAR_PAGE_SIZE
		: shortViewport
			? SIDEBAR_PAGE_SIZE
			: 0;
	const totalPages = pageSize
		? Math.max(1, Math.ceil((tiles.length - (pinned ? 1 : 0)) / pageSize))
		: 1;
	const currentPage = Math.min(page, totalPages - 1);
	const [mobilePortrait, setMobilePortrait] = useState(
		() =>
			window.matchMedia('(max-width: 639px) and (orientation: portrait)')
				.matches,
	);
	useEffect(() => {
		const portrait = window.matchMedia(
			'(max-width: 639px) and (orientation: portrait)',
		);
		const short = window.matchMedia('(max-height: 500px)');
		const update = () => {
			setMobilePortrait(portrait.matches);
			setShortViewport(short.matches);
		};
		portrait.addEventListener('change', update);
		short.addEventListener('change', update);
		return () => {
			portrait.removeEventListener('change', update);
			short.removeEventListener('change', update);
		};
	}, []);
	useEffect(() => {
		if (!pinned) setPinnedKey(null);
		setPage(currentPage);
	}, [pinned, currentPage]);
	useEffect(() => {
		// Pinning is a per-viewer preference, never shared with the room or a
		// subsequent meeting session.
		void selfId;
		setPinnedKey(null);
		setPage(0);
	}, [selfId]);

	const togglePin = (key: string) => {
		setPinnedKey((current) => (current === key ? null : key));
		setPage(0);
	};

	return (
		<div className="relative flex size-full min-h-0 flex-col">
			<MeetingAudio
				participants={participants}
				selfId={selfId}
				streams={remoteStreams}
				audioOutputId={audioOutputId}
			/>
			<div className="min-h-0 flex-1 @container/meeting [container-type:size]">
				<div className="flex size-full items-center justify-center">
					{/* Fit small pinned meetings as one balanced stage. The package still
					    positions all tiles using their real 16:9 ratio, so thumbnail
					    rows have the configured gap rather than empty square cells.
					    Portrait containers and larger meetings retain automatic layout. */}
					<div
						data-pinned-stage={smallPinnedGroup ? tiles.length : undefined}
						className={cn(
							'size-full',
							smallPinnedGroup &&
								'[@container_meeting_(orientation:landscape)]:h-auto',
							smallPinnedGroup &&
								(tiles.length === 2
									? '[@container_meeting_(orientation:landscape)]:aspect-[20/9] [@container_meeting_(orientation:landscape)]:w-[min(100cqw,calc(100cqh*20/9))]'
									: '[@container_meeting_(orientation:landscape)]:aspect-[8/3] [@container_meeting_(orientation:landscape)]:w-[min(100cqw,calc(100cqh*8/3))]'),
						)}
					>
						<GridContainer
							className="size-full"
							count={tiles.length}
							aspectRatio="16:9"
							forceAspectRatio
							gap={mobilePortrait ? 8 : 12}
							layoutMode="gallery"
							pinnedIndex={pinned && tiles.length > 1 ? pinnedIndex : undefined}
							othersPosition="right"
							maxVisible={pageSize || undefined}
							currentVisiblePage={currentPage}
							disableFloat
						>
							{tiles.map(({ key, kind, participant }, index) => {
								const local = participant.id === selfId;
								const compact = pinned && pinnedKey !== key;
								return (
									<GridItem key={key} index={index}>
										<div className="group/tile @container/tile relative size-full">
											{kind === 'camera' ? (
												<ParticipantTile
													participant={participant}
													compact={compact}
													local={local}
													stream={
														local
															? localStream
															: (remoteStreams[participant.id] ?? null)
													}
													connectionState={connectionStates[participant.id]}
													streamRevision={local ? localStreamRevision : 0}
													onRetry={() => onRetry(participant.id)}
												/>
											) : (
												<ScreenShareTile
													displayName={participant.displayName}
													compact={compact}
													local={local}
													stream={
														local
															? localScreenStream
															: (remoteScreenStreams[participant.id] ?? null)
													}
													streamRevision={local ? screenRevision : 0}
													onStopSharing={onStopScreenShare}
												/>
											)}
											<TilePinButton
												label={`${participant.displayName}'s ${kind}`}
												pinned={pinnedKey === key}
												compact={compact}
												onToggle={() => togglePin(key)}
											/>
										</div>
									</GridItem>
								);
							})}
						</GridContainer>
					</div>
				</div>
			</div>
			{totalPages > 1 && (
				<nav
					aria-label={
						pinned ? 'Other tiles pagination' : 'Meeting tiles pagination'
					}
					className="absolute bottom-3 right-3 z-20"
				>
					<div className="flex items-center gap-0.5 rounded-full border border-zinc-700/60 bg-zinc-900/95 p-0.5 shadow-lg backdrop-blur-sm">
						<Button
							variant="ghost"
							size="icon-sm"
							className="size-7 rounded-full text-zinc-200 hover:bg-zinc-800 [&_svg]:size-3.5"
							aria-label="Previous tiles"
							disabled={currentPage === 0}
							onClick={() => setPage(currentPage - 1)}
						>
							<ChevronLeft />
						</Button>
						<span
							aria-live="polite"
							aria-atomic="true"
							className="min-w-8 text-center text-[10px] tabular-nums text-zinc-300"
						>
							<span className="sr-only">
								Page {currentPage + 1} of {totalPages}
							</span>
							<span aria-hidden="true">
								{currentPage + 1} / {totalPages}
							</span>
						</span>
						<Button
							variant="ghost"
							size="icon-sm"
							className="size-7 rounded-full text-zinc-200 hover:bg-zinc-800 [&_svg]:size-3.5"
							aria-label="Next tiles"
							disabled={currentPage === totalPages - 1}
							onClick={() => setPage(currentPage + 1)}
						>
							<ChevronRight />
						</Button>
					</div>
				</nav>
			)}
		</div>
	);
}
