import {
	joinMeetingSchema,
	MAX_PARTICIPANTS,
	type MediaState,
} from '@meet/contracts/meeting';
import { ArrowRight, Headphones, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useAppForm } from '@/shared/components/form';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { getDefaultDisplayName, saveDisplayName } from '../lib/display-name';
import { DevicePreview } from './DevicePreview';

const joinFormSchema = joinMeetingSchema.pick({ displayName: true });

type Props = {
	onJoin: (displayName: string, options: MediaState) => Promise<void>;
	onToggleMedia: (kind: 'audio' | 'video') => Promise<void>;
	stream: MediaStream | null;
	media: MediaState;
	mediaBusy: boolean;
	joining: boolean;
	error: string | null;
	participantCount: number;
	left: boolean;
};

export function JoinMeetingForm({
	onJoin,
	onToggleMedia,
	stream,
	media,
	mediaBusy,
	joining,
	error,
	participantCount,
	left,
}: Props) {
	const [defaultName] = useState(getDefaultDisplayName);
	const form = useAppForm({
		defaultValues: { displayName: defaultName },
		validators: { onChange: joinFormSchema, onSubmit: joinFormSchema },
		onSubmit: async ({ value }) => {
			saveDisplayName(value.displayName.trim());
			await onJoin(value.displayName.trim(), media);
		},
	});

	return (
		<div className="mx-auto grid w-full max-w-4xl items-center gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1.15fr_1fr] md:gap-12">
			<div className="space-y-4">
				<form.Subscribe selector={(state) => state.values.displayName}>
					{(displayName) => (
						<DevicePreview
							stream={stream}
							media={media}
							busy={mediaBusy && !stream}
							displayName={displayName}
						/>
					)}
				</form.Subscribe>
				<p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
					<Headphones className="size-3.5" /> Headphones help keep your call
					echo-free.
				</p>
			</div>
			<form
				className="space-y-6"
				onSubmit={(event) => {
					event.preventDefault();
					void form.handleSubmit();
				}}
			>
				<div className="space-y-2">
					<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						Team meeting
					</p>
					<h1 className="text-3xl font-semibold tracking-tight">
						{left ? 'You’ve left the call' : 'Ready to join?'}
					</h1>
					<p className="text-sm leading-6 text-muted-foreground">
						{participantCount
							? `${participantCount} ${participantCount === 1 ? 'person is' : 'people are'} in the call.`
							: 'The meeting is open. Be the first to join.'}
					</p>
				</div>
				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				<fieldset disabled={joining} className="space-y-5 disabled:opacity-60">
					<form.AppField
						name="displayName"
						listeners={{ onChange: ({ value }) => saveDisplayName(value) }}
					>
						{(field) => (
							<field.TextField
								label="Your name"
								placeholder="e.g. Alex"
								autoComplete="name"
								maxLength={50}
							/>
						)}
					</form.AppField>
					<div className="flex flex-wrap gap-5">
						<Label className="flex min-h-11 items-center gap-2">
							<Checkbox
								checked={media.microphoneEnabled}
								disabled={mediaBusy}
								className="disabled:opacity-100"
								onCheckedChange={() => {
									void onToggleMedia('audio');
								}}
							/>
							Microphone
						</Label>
						<Label className="flex min-h-11 items-center gap-2">
							<Checkbox
								checked={media.cameraEnabled}
								disabled={mediaBusy}
								className="disabled:opacity-100"
								onCheckedChange={() => {
									void onToggleMedia('video');
								}}
							/>
							Camera
						</Label>
					</div>
				</fieldset>
				<form.Subscribe selector={(state) => state.canSubmit}>
					{(canSubmit) => (
						<Button
							type="submit"
							size="lg"
							className="h-11 w-full"
							disabled={
								!canSubmit ||
								joining ||
								(mediaBusy && !stream) ||
								participantCount >= MAX_PARTICIPANTS
							}
						>
							{joining ? (
								<LoaderCircle className="animate-spin" />
							) : (
								<ArrowRight />
							)}
							{joining
								? 'Joining…'
								: participantCount >= MAX_PARTICIPANTS
									? 'Meeting is full'
									: left
										? 'Rejoin meeting'
										: 'Join meeting'}
						</Button>
					)}
				</form.Subscribe>
				<p className="text-xs leading-5 text-muted-foreground">
					No account or room code needed. Your name and device choices are
					remembered on this device. You can also join with both devices off.
				</p>
			</form>
		</div>
	);
}
