import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { DevicePreview } from './DevicePreview';

const props = {
	stream: null,
	media: { microphoneEnabled: true, cameraEnabled: true },
	busy: false,
	controlsDisabled: false,
	onToggleMedia: vi.fn().mockResolvedValue(undefined),
};

afterEach(() => {
	cleanup();
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
