import { cn } from 'cn';
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui';
import type * as React from 'react';

function ScrollArea({
	className,
	children,
	viewportRef,
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
	viewportRef?: React.Ref<HTMLDivElement>;
}) {
	return (
		<ScrollAreaPrimitive.Root
			data-slot="scroll-area"
			className={cn('relative', className)}
			{...props}
		>
			<ScrollAreaPrimitive.Viewport
				ref={viewportRef}
				data-slot="scroll-area-viewport"
				className="size-full rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
			>
				{children}
			</ScrollAreaPrimitive.Viewport>
			<ScrollBar />
			<ScrollAreaPrimitive.Corner />
		</ScrollAreaPrimitive.Root>
	);
}

function ScrollBar({
	className,
	orientation = 'vertical',
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
	return (
		<ScrollAreaPrimitive.ScrollAreaScrollbar
			data-slot="scroll-area-scrollbar"
			orientation={orientation}
			className={cn(
				'flex touch-none select-none transition-colors data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5 data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:flex-col',
				className,
			)}
			{...props}
		>
			<ScrollAreaPrimitive.ScrollAreaThumb
				data-slot="scroll-area-thumb"
				className="relative flex-1 rounded-full bg-muted-foreground/40 hover:bg-muted-foreground/60"
			/>
		</ScrollAreaPrimitive.ScrollAreaScrollbar>
	);
}

export { ScrollArea, ScrollBar };
