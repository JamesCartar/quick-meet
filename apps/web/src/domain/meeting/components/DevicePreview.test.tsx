import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DevicePreview } from './DevicePreview';

const props = {
	stream: null,
	media: { microphoneEnabled: true, cameraEnabled: true },
	busy: false,
	controlsDisabled: false,
	onToggleMedia: vi.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
	vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.clearAllMocks();
});

it('offers keyboard-accessible icon buttons inside the preview', async () => {
	const user = userEvent.setup();
	render(<DevicePreview {...props} />);
	const microphone = screen.getByRole('button', { name: 'Mute microphone' });
	const camera = screen.getByRole('button', { name: 'Turn off camera' });
	expect(microphone.getAttribute('aria-pressed')).toBe('true');
	expect(camera.getAttribute('aria-pressed')).toBe('true');
	expect(
		screen
			.getByRole('group', { name: 'Preview device controls' })
			.contains(microphone),
	).toBe(true);
	await user.tab();
	expect(document.activeElement).toBe(microphone);
	await user.keyboard(' ');
	expect(props.onToggleMedia).toHaveBeenCalledWith('audio');
	await user.tab();
	expect(document.activeElement).toBe(camera);
	await user.keyboard('{Enter}');
	expect(props.onToggleMedia).toHaveBeenCalledWith('video');
	expect(screen.queryByRole('checkbox')).toBeNull();
});

it('shows device-off button states', () => {
	render(
		<DevicePreview
			{...props}
			media={{ microphoneEnabled: false, cameraEnabled: false }}
		/>,
	);
	expect(
		screen
			.getByRole('button', { name: 'Turn on microphone' })
			.getAttribute('aria-pressed'),
	).toBe('false');
	expect(
		screen
			.getByRole('button', { name: 'Turn on camera' })
			.getAttribute('aria-pressed'),
	).toBe('false');
});

it('prevents toggling during media setup or joining', async () => {
	const user = userEvent.setup();
	render(<DevicePreview {...props} controlsDisabled />);
	await user.click(screen.getByRole('button', { name: 'Mute microphone' }));
	await user.click(screen.getByRole('button', { name: 'Turn off camera' }));
	expect(props.onToggleMedia).not.toHaveBeenCalled();
});

it('does not load an empty preview and detaches video when the camera turns off', () => {
	const tracks: { readyState: string }[] = [];
	const stream = { getVideoTracks: () => tracks } as unknown as MediaStream;
	const { rerender } = render(<DevicePreview {...props} stream={stream} />);
	const video = screen.getByLabelText('Camera preview') as HTMLVideoElement;
	expect(video.srcObject).toBeNull();
	expect(video.autoplay).toBe(false);
	expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
	tracks.push({ readyState: 'live' });
	rerender(<DevicePreview {...props} stream={stream} />);
	expect(video.srcObject).toBe(stream);
	expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
	rerender(
		<DevicePreview
			{...props}
			stream={stream}
			media={{ microphoneEnabled: true, cameraEnabled: false }}
		/>,
	);
	expect(video.srcObject).toBeNull();
	expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
});
