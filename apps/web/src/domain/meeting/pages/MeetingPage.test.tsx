import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import MeetingPage from './MeetingPage';

const fullscreen = vi.hoisted(() => ({
	fullscreen: false,
	supported: true,
	error: null,
	toggle: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../hooks/useMeetingFullscreen', () => ({
	useMeetingFullscreen: () => fullscreen,
}));
vi.mock('../hooks/useMeeting', () => ({
	useMeeting: () => ({
		status: 'joined',
		selfId: 'self',
		participants: [{ id: 'self', displayName: 'Alex' }],
		availableDevices: [],
		devicePreferences: {
			audioInputId: 'default',
			videoInputId: 'default',
			audioOutputId: 'default',
		},
		connectionStates: {},
		warning: null,
		warningVersion: 0,
	}),
}));
vi.mock('../hooks/useMeetingChat', () => ({
	useMeetingChat: () => ({ messages: [] }),
}));
vi.mock('../components/MeetingGrid', () => ({
	MeetingGrid: () => (
		<div>
			<span>Participant tile</span>
			<button type="button">Reconnect</button>
		</div>
	),
}));
vi.mock('../components/MeetingControls', () => ({
	MeetingControls: () => <div>Meeting footer controls</div>,
}));
vi.mock('../components/ParticipantsSheet', () => ({
	ParticipantsSheet: () => null,
}));
vi.mock('../components/ChatSheet', () => ({ ChatSheet: () => null }));
vi.mock('../components/EditDisplayName', () => ({
	EditDisplayName: () => null,
}));
vi.mock('../components/JoinMeetingForm', () => ({
	JoinMeetingForm: () => null,
}));

afterEach(() => {
	cleanup();
	fullscreen.fullscreen = false;
	fullscreen.toggle.mockClear();
});

it('toggles fullscreen on double-click both normally and when already fullscreen', async () => {
	const user = userEvent.setup();
	const { rerender } = render(<MeetingPage />);
	await user.dblClick(
		screen.getByRole('main', { name: 'Meeting participants' }),
	);
	expect(fullscreen.toggle).toHaveBeenCalledOnce();
	fullscreen.fullscreen = true;
	rerender(<MeetingPage />);
	await user.dblClick(screen.getByText('Participant tile'));
	expect(fullscreen.toggle).toHaveBeenCalledTimes(2);
	expect(screen.getByText('Meeting footer controls')).toBeTruthy();
	expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toBeTruthy();
});

it('disables body text selection and prevents the default double-click action', () => {
	render(<MeetingPage />);
	const body = screen.getByRole('main', { name: 'Meeting participants' });
	expect(body.classList.contains('select-none')).toBe(true);
	expect(fireEvent.doubleClick(screen.getByText('Participant tile'))).toBe(
		false,
	);
	expect(fullscreen.toggle).toHaveBeenCalledOnce();
});

it('does not toggle fullscreen on tile controls and supports the header button by keyboard', async () => {
	const user = userEvent.setup();
	render(<MeetingPage />);
	await user.dblClick(screen.getByRole('button', { name: 'Reconnect' }));
	expect(fullscreen.toggle).not.toHaveBeenCalled();
	screen.getByRole('button', { name: 'Enter fullscreen' }).focus();
	await user.keyboard('{Enter}');
	expect(fullscreen.toggle).toHaveBeenCalledOnce();
});
