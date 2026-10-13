import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { MeetingControls } from './MeetingControls';

afterEach(cleanup);

it('requires confirmation to leave and lets the user stay', async () => {
	const onLeave = vi.fn().mockResolvedValue(undefined);
	const onOpenChat = vi.fn();
	const onToggleScreenShare = vi.fn().mockResolvedValue(undefined);
	const user = userEvent.setup();
	render(
		<TooltipProvider>
			<MeetingControls
				media={{ microphoneEnabled: true, cameraEnabled: true }}
				busy={false}
				screenSharing={false}
				screenShareBusy={false}
				screenShareSupported={true}
				onToggleScreenShare={onToggleScreenShare}
				audioInputs={[]}
				videoInputs={[]}
				audioOutputs={[]}
				audioInputId="default"
				videoInputId="default"
				audioOutputId="default"
				outputSelectionSupported={false}
				onToggle={vi.fn().mockResolvedValue(undefined)}
				onSelectDevice={vi.fn().mockResolvedValue(undefined)}
				onOpenChat={onOpenChat}
				onLeave={onLeave}
			/>
		</TooltipProvider>,
	);
	expect(
		screen.getByRole('button', { name: 'Audio device options' }),
	).toBeTruthy();
	expect(
		screen.getByRole('button', { name: 'Camera device options' }),
	).toBeTruthy();
	expect(
		screen.queryByRole('button', { name: 'Choose speaker output' }),
	).toBeNull();
	await user.click(screen.getByRole('button', { name: 'Share screen' }));
	expect(onToggleScreenShare).toHaveBeenCalledTimes(1);
	const chatButton = screen.getByRole('button', { name: 'Open meeting chat' });
	expect(chatButton.className).toContain('size-12');
	await user.click(chatButton);
	expect(onOpenChat).toHaveBeenCalledTimes(1);
	await user.click(screen.getByRole('button', { name: 'Leave' }));
	expect(screen.getByRole('alertdialog')).toBeTruthy();
	expect(onLeave).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Stay in call' }));
	expect(screen.queryByRole('alertdialog')).toBeNull();
	await user.click(screen.getByRole('button', { name: 'Leave' }));
	await user.click(screen.getByRole('button', { name: 'Leave meeting' }));
	expect(onLeave).toHaveBeenCalledTimes(1);
});

it('shows the stop-sharing action and disables capture while busy or unsupported', async () => {
	const user = userEvent.setup();
	const onToggleScreenShare = vi.fn().mockResolvedValue(undefined);
	const props = {
		media: { microphoneEnabled: false, cameraEnabled: false },
		busy: false,
		audioInputs: [],
		videoInputs: [],
		audioOutputs: [],
		audioInputId: 'default',
		videoInputId: 'default',
		audioOutputId: 'default',
		outputSelectionSupported: false,
		onToggle: vi.fn().mockResolvedValue(undefined),
		onSelectDevice: vi.fn().mockResolvedValue(undefined),
		onOpenChat: vi.fn(),
		onLeave: vi.fn().mockResolvedValue(undefined),
		onToggleScreenShare,
		screenSharing: true,
		screenShareBusy: false,
		screenShareSupported: true,
	};
	const { rerender } = render(
		<TooltipProvider>
			<MeetingControls {...props} />
		</TooltipProvider>,
	);
	const button = screen.getByRole('button', { name: 'Stop sharing screen' });
	expect(button.getAttribute('aria-pressed')).toBe('true');
	await user.click(button);
	expect(onToggleScreenShare).toHaveBeenCalledOnce();
	rerender(
		<TooltipProvider>
			<MeetingControls {...props} screenSharing={false} screenShareBusy />
		</TooltipProvider>,
	);
	expect(
		(screen.getByRole('button', { name: 'Share screen' }) as HTMLButtonElement)
			.disabled,
	).toBe(true);
	rerender(
		<TooltipProvider>
			<MeetingControls
				{...props}
				screenSharing={false}
				screenShareSupported={false}
			/>
		</TooltipProvider>,
	);
	expect(
		(screen.getByRole('button', { name: 'Share screen' }) as HTMLButtonElement)
			.disabled,
	).toBe(true);
});
