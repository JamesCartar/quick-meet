import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ScreenShareTile } from './ScreenShareTile';

beforeEach(() => {
	vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

it('dims only the local preview and centers a pill button that stops sharing', async () => {
	const user = userEvent.setup();
	const onStopSharing = vi.fn();
	const stream = {} as MediaStream;
	render(
		<ScreenShareTile
			displayName="Alex"
			stream={stream}
			local
			onStopSharing={onStopSharing}
		/>,
	);
	const video = screen.getByLabelText('Alex screen share') as HTMLVideoElement;
	expect(video.srcObject).toBe(stream);
	const button = screen.getByRole('button', { name: 'Stop sharing screen' });
	expect(button.classList.contains('rounded-full')).toBe(true);
	expect(button.classList.contains('bg-zinc-800/95')).toBe(true);
	expect(button.classList.contains('bg-white/95')).toBe(false);
	const overlay = button.parentElement;
	expect(overlay?.classList.contains('bg-zinc-950/75')).toBe(true);
	expect(overlay?.classList.contains('items-center')).toBe(true);
	expect(overlay?.classList.contains('justify-center')).toBe(true);
	await user.click(button);
	expect(onStopSharing).toHaveBeenCalledOnce();
});

it('leaves remote shared screens unobscured with no stop-sharing button', () => {
	const { container } = render(
		<ScreenShareTile
			displayName="Sam"
			stream={{} as MediaStream}
			local={false}
			onStopSharing={vi.fn()}
		/>,
	);
	expect(
		screen.queryByRole('button', { name: 'Stop sharing screen' }),
	).toBeNull();
	expect(container.querySelector('[class~="bg-zinc-950/75"]')).toBeNull();
	expect(screen.getByText("Sam's screen")).toBeTruthy();
});
