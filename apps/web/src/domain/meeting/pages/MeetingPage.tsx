import { Users, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/common/lib/utils';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { EditDisplayName } from '../components/EditDisplayName';
import { JoinMeetingForm } from '../components/JoinMeetingForm';
import { MeetingControls } from '../components/MeetingControls';
import { MeetingGrid } from '../components/MeetingGrid';
import { useMeeting } from '../hooks/useMeeting';

function MeetingPage() {
	const meeting = useMeeting();
	const joined = meeting.status === 'joined' && Boolean(meeting.selfId);
	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		if (!joined) {
			setElapsed(0);
			return;
		}
		const startedAt = Date.now();
		const timer = setInterval(
			() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
			1000,
		);
		return () => clearInterval(timer);
	}, [joined]);

	const duration = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
	const failedConnection = Object.values(meeting.connectionStates).some(
		(state) => state === 'failed',
	);

	return (
		<TooltipProvider>
			<div
				className={cn(
					'flex min-h-svh flex-col bg-background text-foreground',
					joined && 'dark h-svh overflow-hidden',
				)}
			>
				<header className="flex h-16 shrink-0 items-center sm:h-18 justify-between gap-4 border-b px-5 sm:px-8">
					<div className="flex items-center gap-3">
						<div className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background">
							<Video className="size-5" />
						</div>
						<span className="text-lg font-semibold tracking-tight">meet</span>
						{joined && (
							<span className="ml-3 hidden border-l pl-5 text-sm text-muted-foreground sm:inline">
								Team meeting
							</span>
						)}
					</div>
					{joined ? (
						<div className="flex items-center gap-2 text-sm sm:gap-4">
							<EditDisplayName
								displayName={
									meeting.participants.find(
										(participant) => participant.id === meeting.selfId,
									)?.displayName ?? ''
								}
								onSave={meeting.rename}
							/>
							<span className="flex items-center gap-2 text-muted-foreground">
								<Users className="size-4" />
								{meeting.participants.length}
							</span>
						</div>
					) : (
						<span className="text-xs text-muted-foreground">
							A shared space for your team
						</span>
					)}
				</header>

				{joined && meeting.selfId ? (
					<>
						<div className="flex min-h-0 flex-1 flex-col">
							{meeting.warning && (
								<div className="px-4 pt-3">
									<Alert>
										<AlertDescription>{meeting.warning}</AlertDescription>
									</Alert>
								</div>
							)}
							<main
								aria-label="Meeting participants"
								className="min-h-0 flex-1 p-2 sm:p-5"
							>
								<MeetingGrid
									participants={meeting.participants}
									selfId={meeting.selfId}
									localStream={meeting.localStream}
									remoteStreams={meeting.remoteStreams}
									connectionStates={meeting.connectionStates}
									onRetry={meeting.retryPeer}
								/>
							</main>
						</div>
						<footer className="relative shrink-0 border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-8">
							<div className="absolute left-8 top-6 hidden text-sm text-muted-foreground lg:block">
								<span className="font-mono">{duration}</span>
								<span className="mx-3">·</span>Team meeting
							</div>
							<MeetingControls
								media={meeting.media}
								busy={meeting.mediaBusy}
								onToggle={meeting.toggleMedia}
								onLeave={meeting.leave}
							/>
							{failedConnection && (
								<p className="mt-3 text-center text-xs text-muted-foreground">
									Some networks need a TURN relay, which is not configured yet.
								</p>
							)}
						</footer>
					</>
				) : (
					<main className="flex flex-1 items-center justify-center">
						<JoinMeetingForm
							onJoin={meeting.join}
							onToggleMedia={meeting.toggleMedia}
							stream={meeting.localStream}
							media={meeting.media}
							mediaBusy={meeting.mediaBusy}
							joining={meeting.status === 'joining'}
							error={meeting.error ?? meeting.warning}
							participantCount={meeting.participants.length}
							left={meeting.status === 'left'}
						/>
					</main>
				)}
			</div>
		</TooltipProvider>
	);
}

export default MeetingPage;
