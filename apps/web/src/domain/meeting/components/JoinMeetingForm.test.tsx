import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { JoinMeetingForm } from './JoinMeetingForm';

const props = {
	onJoin: vi.fn().mockResolvedValue(undefined),
	onToggleMedia: vi.fn().mockResolvedValue(undefined),
	stream: null,
	media: { microphoneEnabled: true, cameraEnabled: true },
	mediaBusy: false,
	joining: false,
	error: null,
	participantCount: 0,
	left: false,
};

afterEach(() => {
	cleanup();
	localStorage.clear();
	vi.restoreAllMocks();
});

it('prefills a generated name and saves edits before joining', async () => {
	const user = userEvent.setup();
	render(<JoinMeetingForm {...props} />);
	const input = screen.getByLabelText('Your name');
	expect(input.getAttribute('value')).toMatch(/^Guest \d{4}$/);
	await user.clear(input);
	await user.type(input, 'Alice');
	expect(localStorage.getItem('meet-display-name')).toBe('Alice');
	expect(props.onJoin).not.toHaveBeenCalled();
});

it('restores the saved name and submits it with device preferences', async () => {
	localStorage.setItem('meet-display-name', 'Alex');
	const onJoin = vi.fn().mockResolvedValue(undefined);
	const user = userEvent.setup();
	render(
		<JoinMeetingForm
			{...props}
			onJoin={onJoin}
			media={{ microphoneEnabled: false, cameraEnabled: false }}
		/>,
	);
	expect(screen.getByLabelText('Your name').getAttribute('value')).toBe('Alex');
	await user.click(screen.getByRole('checkbox', { name: 'Microphone' }));
	await user.click(screen.getByRole('checkbox', { name: 'Camera' }));
	await user.click(screen.getByRole('button', { name: 'Join meeting' }));
	expect(onJoin).toHaveBeenCalledWith('Alex', {
		microphoneEnabled: false,
		cameraEnabled: false,
	});
});

it('still renders when browser storage is unavailable', () => {
	vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
		throw new Error('blocked');
	});
	vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
		throw new Error('blocked');
	});
	render(<JoinMeetingForm {...props} />);
	expect(screen.getByLabelText('Your name').getAttribute('value')).toMatch(
		/^Guest \d{4}$/,
	);
});
