import { MessageCircle, Users, Video, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/common/lib/utils';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { ChatSheet } from '../components/ChatSheet';
import { EditDisplayName } from '../components/EditDisplayName';
import { JoinMeetingForm } from '../components/JoinMeetingForm';
import { MeetingControls } from '../components/MeetingControls';
import { MeetingGrid } from '../components/MeetingGrid';
import { ParticipantsSheet } from '../components/ParticipantsSheet';
import { useMeeting } from '../hooks/useMeeting';
import { useMeetingChat } from '../hooks/useMeetingChat';

const SPEAKER_DEVICE_WARNING =
	'The selected speaker could not be used. Try another output device.';

function SpeakerWarningToast({ onDismiss }: { onDismiss: () => void }) {
	const [visible, setVisible] = useState(true);
	const [fading, setFading] = useState(false);

	useEffect(() => {
		const fadeTimer = setTimeout(() => setFading(true), 2500);
		const hideTimer = setTimeout(() => {
			setVisible(false);
			onDismiss();
		}, 2800);
		return () => {
			clearTimeout(fadeTimer);
			clearTimeout(hideTimer);
		};
	}, [onDismiss]);

	if (!visible) return null;
	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(
				'fixed top-20 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border bg-card/95 p-4 text-card-foreground shadow-xl backdrop-blur transition-[opacity,transform] duration-300 ease-out sm:top-[5.5rem]',
				fading ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
			)}
		>
			<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
				<VolumeX className="size-4" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-semibold">Speaker unavailable</p>
				<p className="mt-1 text-sm text-muted-foreground">
					Try another output device.
				</p>
			</div>
			<Button
				variant="ghost"
				size="icon-sm"
				className="-mr-1 -mt-1 shrink-0 text-muted-foreground"
				aria-label="Dismiss notification"
				onClick={() => {
					setFading(true);
					setTimeout(() => {
						setVisible(false);
						onDismiss();
					}, 300);
				}}
			>
				<X />
			</Button>
		</div>
	);
}

function MeetingPage() {
	const meeting = useMeeting();
	const chat = useMeetingChat(meeting.selfId);
	const joined = meeting.status === 'joined' && Boolean(meeting.selfId);
	const [elapsed, setElapsed] = useState(0);
	const [participantsOpen, setParticipantsOpen] = useState(false);
	const [chatOpen, setChatOpen] = useState(false);
	const [speakerWarningDismissed, setSpeakerWarningDismissed] = useState(false);
	const dismissSpeakerWarning = useCallback(
		() => setSpeakerWarningDismissed(true),
		[],
	);
	const hasSpeakerWarningToast =
		meeting.warning === SPEAKER_DEVICE_WARNING && !speakerWarningDismissed;

	useEffect(() => {
		if (meeting.warning !== SPEAKER_DEVICE_WARNING) {
			setSpeakerWarningDismissed(false);
		}
	}, [meeting.warning]);

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
				<header className="flex h-16 shrink-0 items-center sm:h-18 justify-between gap-4 border-b px-5 sm:px-8">
					<div className="flex items-center gap-3">
						<div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
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
							<button
								type="button"
								className="flex items-center gap-2 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								aria-label={`Show ${meeting.participants.length} participants`}
								onClick={() => setParticipantsOpen(true)}
							>
								<Users className="size-4" />
								{meeting.participants.length}
							</button>
							<button
								type="button"
								className="flex items-center gap-2 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								aria-label="Open meeting chat"
								onClick={() => setChatOpen(true)}
							>
								<MessageCircle className="size-4" />
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
							{meeting.warning &&
								meeting.warning !== SPEAKER_DEVICE_WARNING && (
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
									audioOutputId={meeting.devicePreferences.audioOutputId}
									localStreamRevision={meeting.mediaRevision}
									onRetry={meeting.retryPeer}
								/>
							</main>
						</div>
						<footer className="relative shrink-0 border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-8">
							<div className="absolute left-8 top-6 hidden text-sm text-muted-foreground lg:block">
								<span className="font-mono">{duration}</span>
							</div>
							<MeetingControls
								media={meeting.media}
								busy={meeting.mediaBusy}
								audioInputs={audioInputs}
								videoInputs={videoInputs}
								audioOutputs={audioOutputs}
								audioInputId={meeting.devicePreferences.audioInputId}
								videoInputId={meeting.devicePreferences.videoInputId}
								audioOutputId={meeting.devicePreferences.audioOutputId}
								outputSelectionSupported={outputSelectionSupported}
								onToggle={meeting.toggleMedia}
								onSelectDevice={meeting.selectDevice}
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
						{hasSpeakerWarningToast && (
							<SpeakerWarningToast
								key={meeting.warning}
								onDismiss={dismissSpeakerWarning}
							/>
						)}
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
