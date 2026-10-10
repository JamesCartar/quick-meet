import type { MediaState } from '@meet/contracts/meeting';
import {
	Check,
	ChevronUp,
	Mic,
	MicOff,
	PhoneOff,
	Video,
	VideoOff,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/common/lib/utils';
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
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/shared/components/ui/popover';
import { Separator } from '@/shared/components/ui/separator';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/shared/components/ui/tooltip';

type DeviceChoice = { id: string; label: string };
type Props = {
	media: MediaState;
	busy: boolean;
	audioInputs: DeviceChoice[];
	videoInputs: DeviceChoice[];
	audioOutputs: DeviceChoice[];
	audioInputId: string;
	videoInputId: string;
	audioOutputId: string;
	outputSelectionSupported: boolean;
	onToggle: (kind: 'audio' | 'video') => Promise<void>;
	onSelectDevice: (kind: MediaDeviceKind, deviceId: string) => Promise<void>;
	onLeave: () => Promise<void>;
};

function DeviceOptions({
	label,
	devices,
	value,
	onSelect,
}: {
	label: string;
	devices: DeviceChoice[];
	value: string;
	onSelect: (id: string) => void;
}) {
	return (
		<div className="space-y-1">
			<p className="px-2 py-1 text-xs font-medium text-muted-foreground">
				{label}
			</p>
			<div className="max-h-48 overflow-y-auto">
				<button
					type="button"
					className={cn(
						'flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent',
						value === 'default' && 'bg-accent/60',
					)}
					onClick={() => onSelect('default')}
				>
					<span>System default</span>
					{value === 'default' && <Check className="size-4 shrink-0" />}
				</button>
				{devices.map((device) => (
					<button
						key={device.id}
						type="button"
						className={cn(
							'flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent',
							value === device.id && 'bg-accent/60',
						)}
						onClick={() => onSelect(device.id)}
					>
						<span className="min-w-0 truncate">{device.label}</span>
						{value === device.id && <Check className="size-4 shrink-0" />}
					</button>
				))}
			</div>
		</div>
	);
}

export function MeetingControls({
	media,
	busy,
	audioInputs,
	videoInputs,
	audioOutputs,
	audioInputId,
	videoInputId,
	audioOutputId,
	outputSelectionSupported,
	onToggle,
	onSelectDevice,
	onLeave,
}: Props) {
	const [audioMenuOpen, setAudioMenuOpen] = useState(false);
	const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
	const microphoneLabel = media.microphoneEnabled
		? 'Mute microphone'
		: 'Turn on microphone';
	const cameraLabel = media.cameraEnabled
		? 'Turn off camera'
		: 'Turn on camera';

	const selectAudioDevice = (
		kind: 'audioinput' | 'audiooutput',
		id: string,
	) => {
		void onSelectDevice(kind, id);
		setAudioMenuOpen(false);
	};

	return (
		<div className="flex items-center justify-center gap-2 sm:gap-3">
			<div className="flex items-center rounded-full sm:bg-muted/70 sm:p-1">
				<Popover open={audioMenuOpen} onOpenChange={setAudioMenuOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							className="hidden size-9 rounded-full text-muted-foreground hover:bg-background/10 sm:inline-flex"
							aria-label="Audio device options"
							disabled={busy}
						>
							<ChevronUp />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						side="top"
						align="center"
						className="dark w-80 space-y-2"
					>
						<DeviceOptions
							label="Microphone"
							devices={audioInputs}
							value={audioInputId}
							onSelect={(id) => selectAudioDevice('audioinput', id)}
						/>
						{outputSelectionSupported && (
							<>
								<Separator />
								<DeviceOptions
									label="Speaker"
									devices={audioOutputs}
									value={audioOutputId}
									onSelect={(id) => selectAudioDevice('audiooutput', id)}
								/>
							</>
						)}
					</PopoverContent>
				</Popover>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant={media.microphoneEnabled ? 'secondary' : 'destructive'}
							className="size-12 rounded-full sm:size-11 [&_svg]:size-5"
							aria-label={microphoneLabel}
							aria-pressed={!media.microphoneEnabled}
							disabled={busy}
							onClick={() => void onToggle('audio')}
						>
							{media.microphoneEnabled ? <Mic /> : <MicOff />}
						</Button>
					</TooltipTrigger>
					<TooltipContent>{microphoneLabel}</TooltipContent>
				</Tooltip>
			</div>
			<div className="flex items-center rounded-full sm:bg-muted/70 sm:p-1">
				<Popover open={cameraMenuOpen} onOpenChange={setCameraMenuOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							className="hidden size-9 rounded-full text-muted-foreground hover:bg-background/10 sm:inline-flex"
							aria-label="Camera device options"
							disabled={busy}
						>
							<ChevronUp />
						</Button>
					</PopoverTrigger>
					<PopoverContent side="top" align="center" className="dark w-72">
						<DeviceOptions
							label="Camera"
							devices={videoInputs}
							value={videoInputId}
							onSelect={(id) => {
								void onSelectDevice('videoinput', id);
								setCameraMenuOpen(false);
							}}
						/>
					</PopoverContent>
				</Popover>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant={media.cameraEnabled ? 'secondary' : 'destructive'}
							className="size-12 rounded-full sm:size-11 [&_svg]:size-5"
							aria-label={cameraLabel}
							aria-pressed={!media.cameraEnabled}
							disabled={busy}
							onClick={() => void onToggle('video')}
						>
							{media.cameraEnabled ? <Video /> : <VideoOff />}
						</Button>
					</TooltipTrigger>
					<TooltipContent>{cameraLabel}</TooltipContent>
				</Tooltip>
			</div>
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button
						variant="destructive"
						className="ml-1 h-12 rounded-full px-5 sm:h-11 [&_svg]:size-5"
						aria-label="Leave"
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
							onClick={() => void onLeave()}
						>
							Leave meeting
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
