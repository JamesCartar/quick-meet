import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ScreenShareTile } from './ScreenShareTile';

function screenStream() {
	return {
		getVideoTracks: () => [{ readyState: 'live' }],
	} as unknown as MediaStream;
}

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
	const stream = screenStream();
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
			stream={screenStream()}
			local={false}
			onStopSharing={vi.fn()}
		/>,
	);
	expect(
		screen.queryByRole('button', { name: 'Stop sharing screen' }),
	).toBeNull();
	expect(container.querySelector('[class~="bg-zinc-950/75"]')).toBeNull();
	const badge = screen.getByText("Sam's screen");
	expect(badge.parentElement?.classList.contains('bg-black/55')).toBe(true);
	expect(badge.parentElement?.classList.contains('text-white')).toBe(true);
});

it('waits without starting a media load when a shared screen has no video track', () => {
	const stream = { getVideoTracks: () => [] } as unknown as MediaStream;
	render(
		<ScreenShareTile
			displayName="Sam"
			stream={stream}
			local={false}
			onStopSharing={vi.fn()}
		/>,
	);
	const video = screen.getByLabelText('Sam screen share') as HTMLVideoElement;
	expect(video.srcObject).toBeNull();
	expect(video.autoplay).toBe(false);
	expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
	expect(screen.getByText('Connecting to shared screen…')).toBeTruthy();
});

it('uses compact responsive stop controls in thumbnails but normal controls on the main tile', () => {
	const props = {
		displayName: 'Alex',
		stream: screenStream(),
		local: true,
		onStopSharing: vi.fn(),
	};
	const { rerender } = render(<ScreenShareTile {...props} compact />);
	const button = screen.getByRole('button', { name: 'Stop sharing screen' });
	expect(button.classList.contains('h-8')).toBe(true);
	expect(button.classList.contains('@max-[320px]/tile:h-6')).toBe(true);
	expect(button.classList.contains('@max-[120px]/tile:size-7')).toBe(true);
	expect(button.getAttribute('title')).toBe('Stop sharing screen');
	rerender(<ScreenShareTile {...props} />);
	expect(
		screen
			.getByRole('button', { name: 'Stop sharing screen' })
			.classList.contains('h-11'),
	).toBe(true);
});
