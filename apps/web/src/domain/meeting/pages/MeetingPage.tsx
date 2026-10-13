import { Maximize, Minimize, Users, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/common/lib/utils';
import { Toaster } from '@/shared/components/ui/sonner';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { ChatSheet } from '../components/ChatSheet';
import { EditDisplayName } from '../components/EditDisplayName';
import { JoinMeetingForm } from '../components/JoinMeetingForm';
import { MeetingControls } from '../components/MeetingControls';
import { MeetingGrid } from '../components/MeetingGrid';
import { ParticipantsSheet } from '../components/ParticipantsSheet';
import { useMeeting } from '../hooks/useMeeting';
import { useMeetingChat } from '../hooks/useMeetingChat';
import { useMeetingFullscreen } from '../hooks/useMeetingFullscreen';

const SPEAKER_DEVICE_WARNING =
	'The selected speaker could not be used. Try another output device.';

function MeetingPage() {
	const meeting = useMeeting();
	const chat = useMeetingChat(meeting.selfId);
	const joined = meeting.status === 'joined' && Boolean(meeting.selfId);
	const fullscreen = useMeetingFullscreen(joined);
	const [elapsed, setElapsed] = useState(0);
	const [participantsOpen, setParticipantsOpen] = useState(false);
	const [chatOpen, setChatOpen] = useState(false);

	useEffect(() => {
		if (fullscreen.error)
			toast.error('Fullscreen unavailable', { description: fullscreen.error });
	}, [fullscreen.error]);

	useEffect(() => {
		if (!meeting.warning) return;
		const speakerWarning = meeting.warning === SPEAKER_DEVICE_WARNING;
		const title = speakerWarning
			? 'Speaker unavailable'
			: meeting.warning.toLowerCase().includes('camera')
				? 'Camera unavailable'
				: meeting.warning.toLowerCase().includes('microphone')
					? 'Microphone unavailable'
					: 'Meeting warning';
		const toastId = `meeting-warning-${meeting.warningVersion}`;
		toast.dismiss(`meeting-warning-${meeting.warningVersion - 1}`);
		toast.error(title, {
			id: toastId,
			description: speakerWarning
				? 'Try another output device.'
				: meeting.warning,
			duration: 3000,
			closeButton: true,
			className: '!p-3 !text-sm meeting-toast',
			descriptionClassName: '!text-xs',
		});
	}, [meeting.warning, meeting.warningVersion]);

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
	const audioInputs = meeting.availableDevices
		.filter(
			(device) =>
				device.kind === 'audioinput' &&
				device.deviceId &&
				device.deviceId !== 'default',
		)
		.map((device, index) => ({
			id: device.deviceId,
			label: device.label || `Microphone ${index + 1}`,
		}));
	const videoInputs = meeting.availableDevices
		.filter(
			(device) =>
				device.kind === 'videoinput' &&
				device.deviceId &&
				device.deviceId !== 'default',
		)
		.map((device, index) => ({
			id: device.deviceId,
			label: device.label || `Camera ${index + 1}`,
		}));
	const audioOutputs = meeting.availableDevices
		.filter(
			(device) =>
				device.kind === 'audiooutput' &&
				device.deviceId &&
				device.deviceId !== 'default',
		)
		.map((device, index) => ({
			id: device.deviceId,
			label: device.label || `Speaker ${index + 1}`,
		}));
	const outputSelectionSupported =
		typeof HTMLMediaElement !== 'undefined' &&
		'setSinkId' in HTMLMediaElement.prototype;
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
				<Toaster
					position="top-right"
					theme={joined ? 'dark' : 'light'}
					offset={{ top: 88, right: 16 }}
					mobileOffset={{ top: 80, right: 8, left: 8 }}
				/>
				<header className="flex h-16 shrink-0 items-center sm:h-18 justify-between gap-4 border-b px-5 sm:px-8">
					<div className="flex items-center gap-3">
						<div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
							<Video className="size-5" />
						</div>
						<span className="text-lg font-semibold tracking-tight">meet</span>
						{joined && (
							<span className="ml-3 hidden border-l pl-5 font-mono text-sm text-muted-foreground sm:inline">
								{duration}
							</span>
						)}
					</div>
					{joined ? (
						<div className="flex items-center gap-2 text-sm sm:gap-4">
							{fullscreen.supported && (
								<button
									type="button"
									className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									aria-label={
										fullscreen.fullscreen
											? 'Exit fullscreen'
											: 'Enter fullscreen'
									}
									title={
										fullscreen.fullscreen
											? 'Exit fullscreen'
											: 'Enter fullscreen'
									}
									onClick={() => void fullscreen.toggle()}
								>
									{fullscreen.fullscreen ? (
										<Minimize className="size-4" />
									) : (
										<Maximize className="size-4" />
									)}
								</button>
							)}
							<EditDisplayName
								displayName={
									meeting.participants.find(
										(participant) => participant.id === meeting.selfId,
									)?.displayName ?? ''
								}
								onSave={meeting.rename}
							/>
							<button
								type="button"
								className="flex items-center gap-2 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								aria-label={`Show ${meeting.participants.length} participants`}
								onClick={() => setParticipantsOpen(true)}
							>
								<Users className="size-4" />
								{meeting.participants.length}
							</button>
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
							<main
								aria-label="Meeting participants"
								className="min-h-0 flex-1 select-none p-2 sm:p-5"
								onDoubleClick={(event) => {
									// Do not toggle fullscreen while interacting with tile controls.
									if (
										event.target instanceof Element &&
										event.target.closest(
											'button, a, input, select, textarea, [role="button"], [contenteditable="true"]',
										)
									)
										return;
									event.preventDefault();
									void fullscreen.toggle();
								}}
							>
								<MeetingGrid
									participants={meeting.participants}
									selfId={meeting.selfId}
									localStream={meeting.localStream}
									remoteStreams={meeting.remoteStreams}
									localScreenStream={meeting.localScreenStream}
									remoteScreenStreams={meeting.remoteScreenStreams}
									screenRevision={meeting.screenRevision}
									connectionStates={meeting.connectionStates}
									audioOutputId={meeting.devicePreferences.audioOutputId}
									localStreamRevision={meeting.mediaRevision}
									onRetry={meeting.retryPeer}
								/>
							</main>
						</div>
						<footer className="relative shrink-0 border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-8">
							<MeetingControls
								media={meeting.media}
								busy={meeting.mediaBusy}
								screenSharing={meeting.screenSharing}
								screenShareBusy={meeting.screenShareBusy}
								screenShareSupported={meeting.screenShareSupported}
								onToggleScreenShare={meeting.toggleScreenShare}
								audioInputs={audioInputs}
								videoInputs={videoInputs}
								audioOutputs={audioOutputs}
								audioInputId={meeting.devicePreferences.audioInputId}
								videoInputId={meeting.devicePreferences.videoInputId}
								audioOutputId={meeting.devicePreferences.audioOutputId}
								outputSelectionSupported={outputSelectionSupported}
								onToggle={meeting.toggleMedia}
								onSelectDevice={meeting.selectDevice}
								onOpenChat={() => setChatOpen(true)}
								onLeave={meeting.leave}
							/>
							{failedConnection && (
								<p className="mt-3 text-center text-xs text-muted-foreground">
									Some networks need a TURN relay, which is not configured yet.
								</p>
							)}
						</footer>
						<ParticipantsSheet
							open={participantsOpen}
							onOpenChange={setParticipantsOpen}
							participants={meeting.participants}
							selfId={meeting.selfId}
						/>
						<ChatSheet
							open={chatOpen}
							onOpenChange={setChatOpen}
							messages={chat.messages}
							participants={meeting.participants}
							selfId={meeting.selfId}
							onSend={chat.send}
							onReact={chat.react}
							error={chat.error}
						/>
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
							error={meeting.error}
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
