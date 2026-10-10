import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { MeetingControls } from './MeetingControls';

afterEach(cleanup);

it('requires confirmation to leave and lets the user stay', async () => {
	const onLeave = vi.fn().mockResolvedValue(undefined);
	const user = userEvent.setup();
	render(
		<TooltipProvider>
			<MeetingControls
				media={{ microphoneEnabled: true, cameraEnabled: true }}
				busy={false}
				onToggle={vi.fn().mockResolvedValue(undefined)}
				onLeave={onLeave}
			/>
		</TooltipProvider>,
	);
	await user.click(screen.getByRole('button', { name: 'Leave' }));
	expect(screen.getByRole('alertdialog')).toBeTruthy();
	expect(onLeave).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Stay in call' }));
	expect(screen.queryByRole('alertdialog')).toBeNull();
	await user.click(screen.getByRole('button', { name: 'Leave' }));
	await user.click(screen.getByRole('button', { name: 'Leave meeting' }));
	expect(onLeave).toHaveBeenCalledTimes(1);
});
