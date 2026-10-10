import { Mic, MicOff, MicVocal } from 'lucide-react';
import { cn } from '@/common/lib/utils';

type Props = {
	displayName: string;
	microphoneEnabled: boolean;
	speaking: boolean;
	local?: boolean;
	connecting?: boolean;
};

export function ParticipantBadge({
	displayName,
	microphoneEnabled,
	speaking,
	local,
	connecting,
}: Props) {
	return (
		<div
			className={cn(
				'pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%_-_1.5rem)] items-center gap-2 rounded-full border border-white/30 bg-zinc-100/80 px-3 py-1.5 text-sm text-zinc-900 shadow-sm backdrop-blur-md',
				connecting && 'max-w-[calc(100%_-_4rem)]',
			)}
		>
			<span className="shrink-0">
				{!microphoneEnabled ? (
					<MicOff
						className="size-4 text-zinc-600"
						aria-label="Microphone off"
					/>
				) : speaking ? (
					<MicVocal
						className="size-4 text-emerald-700 motion-safe:animate-pulse"
						aria-label="Speaking"
					/>
				) : (
					<Mic className="size-4" aria-label="Microphone on" />
				)}
			</span>
			<p className="truncate font-medium">
				{displayName}
				{local && <span className="font-normal text-zinc-600"> (you)</span>}
			</p>
		</div>
	);
}
