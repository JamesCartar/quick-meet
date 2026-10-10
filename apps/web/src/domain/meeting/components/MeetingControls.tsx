import type { MediaState } from '@meet/contracts/meeting';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import { Button } from '@/shared/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/shared/components/ui/tooltip';

type Props = {
	media: MediaState;
	busy: boolean;
	onToggle: (kind: 'audio' | 'video') => Promise<void>;
	onLeave: () => Promise<void>;
};

export function MeetingControls({ media, busy, onToggle, onLeave }: Props) {
	const microphoneLabel = media.microphoneEnabled
		? 'Mute microphone'
		: 'Turn on microphone';
	const cameraLabel = media.cameraEnabled
		? 'Turn off camera'
		: 'Turn on camera';
	return (
		<div className="flex items-center justify-center gap-3">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant={media.microphoneEnabled ? 'secondary' : 'destructive'}
						className="size-12 rounded-full sm:size-11 [&_svg]:size-5"
						aria-label={microphoneLabel}
						aria-pressed={!media.microphoneEnabled}
						disabled={busy}
						onClick={() => {
							void onToggle('audio');
						}}
					>
						{media.microphoneEnabled ? <Mic /> : <MicOff />}
					</Button>
				</TooltipTrigger>
				<TooltipContent>{microphoneLabel}</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant={media.cameraEnabled ? 'secondary' : 'destructive'}
						className="size-12 rounded-full sm:size-11 [&_svg]:size-5"
						aria-label={cameraLabel}
						aria-pressed={!media.cameraEnabled}
						disabled={busy}
						onClick={() => {
							void onToggle('video');
						}}
					>
						{media.cameraEnabled ? <Video /> : <VideoOff />}
					</Button>
				</TooltipTrigger>
				<TooltipContent>{cameraLabel}</TooltipContent>
			</Tooltip>
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button
						variant="destructive"
						className="ml-1 h-12 rounded-full px-6 sm:h-11 [&_svg]:size-5"
					>
						<PhoneOff />
						<span>Leave</span>
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent className="dark p-6 text-sm data-[size=default]:max-w-[calc(100%-2rem)]">
					<AlertDialogHeader className="place-items-start gap-2 text-left">
						<AlertDialogTitle className="leading-none">
							Leave the meeting?
						</AlertDialogTitle>
						<AlertDialogDescription>
							You can rejoin at any time.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
						<AlertDialogCancel className="h-11">Stay in call</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							className="h-11"
							onClick={() => {
								void onLeave();
							}}
						>
							Leave meeting
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
