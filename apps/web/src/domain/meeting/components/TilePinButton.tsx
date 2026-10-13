import { Pin, PinOff } from 'lucide-react';
import { cn } from '@/common/lib/utils';
import { Button } from '@/shared/components/ui/button';

type Props = {
	label: string;
	pinned: boolean;
	onToggle: () => void;
	compact?: boolean;
};

export function TilePinButton({
	label,
	pinned,
	onToggle,
	compact = false,
}: Props) {
	const action = `${pinned ? 'Unpin' : 'Pin'} ${label}`;
	return (
		<Button
			variant="ghost"
			size="icon-sm"
			aria-label={action}
			aria-pressed={pinned}
			title={action}
			onClick={onToggle}
			className={cn(
				'absolute right-3 top-3 z-10 size-8 rounded-full border border-zinc-600/60 bg-zinc-900/90 text-zinc-100 shadow-sm hover:bg-zinc-700 focus-visible:ring-zinc-400 opacity-0 transition-opacity group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 [@media(hover:none)]:size-10 [@media(hover:none)]:opacity-100 @max-[320px]/tile:right-1 @max-[320px]/tile:top-1 @max-[320px]/tile:size-6 [@media(hover:none)]:@max-[320px]/tile:size-7 [@media(hover:none)]:@max-[120px]/tile:size-6 @max-[90px]/tile:size-5 [@media(hover:none)]:@max-[90px]/tile:size-5',
				pinned && 'opacity-100',
				compact && 'right-2 top-2 size-7 [@media(hover:none)]:size-8',
			)}
		>
			{pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
		</Button>
	);
}
