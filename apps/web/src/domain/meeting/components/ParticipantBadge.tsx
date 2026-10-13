import { Mic, MicOff, MicVocal } from 'lucide-react';
import { cn } from '@/common/lib/utils';

type Props = {
	displayName: string;
	microphoneEnabled: boolean;
	speaking: boolean;
	local?: boolean;
	compact?: boolean;
};

export function ParticipantBadge({
	displayName,
	microphoneEnabled,
	speaking,
	local,
	compact = false,
}: Props) {
	return (
		<div
			className={cn(
				'pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%_-_4.5rem)] items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-sm text-white shadow-sm backdrop-blur-md @max-[320px]/tile:left-1 @max-[320px]/tile:top-1 @max-[320px]/tile:max-w-[calc(100%_-_3.5rem)] @max-[320px]/tile:gap-1 @max-[320px]/tile:px-1.5 @max-[320px]/tile:py-0.5 @max-[320px]/tile:text-[9px] @max-[90px]/tile:max-w-[calc(100%_-_2.25rem)] @max-[90px]/tile:px-1 @max-[90px]/tile:text-[8px]',
				compact &&
					'left-2 top-2 max-w-[calc(100%_-_3.5rem)] gap-1 px-2 py-1 text-[10px]',
			)}
		>
			<span className="shrink-0 @max-[120px]/tile:hidden">
				{!microphoneEnabled ? (
					<MicOff
						className={cn(
							'size-4 text-zinc-300 @max-[320px]/tile:size-2.5',
							compact && 'size-3',
						)}
						aria-label="Microphone off"
					/>
				) : speaking ? (
					<MicVocal
						className={cn(
							'size-4 text-emerald-400 motion-safe:animate-pulse @max-[320px]/tile:size-2.5',
							compact && 'size-3',
						)}
						aria-label="Speaking"
					/>
				) : (
					<Mic
						className={cn(
							'size-4 @max-[320px]/tile:size-2.5',
							compact && 'size-3',
						)}
						aria-label="Microphone on"
					/>
				)}
			</span>
			<p className="truncate font-medium" title={displayName}>
				{displayName}
				{local && (
					<span className="font-normal text-zinc-300 @max-[120px]/tile:hidden">
						{' '}
						(you)
					</span>
				)}
			</p>
		</div>
	);
}
