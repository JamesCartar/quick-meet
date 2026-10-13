import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MeetingAudio } from './MeetingAudio';

const participants = ['Self', 'Alex', 'Sam'].map((displayName, index) => ({
	id: String(index),
	displayName,
	joinedAt: 1,
	lastSeen: 1,
	microphoneEnabled: true,
	cameraEnabled: false,
}));
const streams = {
	'0': {} as MediaStream,
	'1': {} as MediaStream,
	'2': {} as MediaStream,
};
const props = { participants, selfId: '0', streams, audioOutputId: 'default' };
const setSinkId = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
	vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
	Object.defineProperty(HTMLMediaElement.prototype, 'setSinkId', {
		configurable: true,
		value: setSinkId,
	});
	setSinkId.mockClear();
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	Reflect.deleteProperty(HTMLMediaElement.prototype, 'setSinkId');
});

it('plays remote audio once, never plays local audio, and preserves playback on name changes', async () => {
	const { rerender } = render(<MeetingAudio {...props} />);
	expect(screen.queryByLabelText('Self audio')).toBeNull();
	const audio = screen.getByLabelText('Alex audio') as HTMLAudioElement;
	expect(audio.srcObject).toBe(streams['1']);
	expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
	await waitFor(() => expect(screen.queryByRole('button')).toBeNull());
	rerender(
		<MeetingAudio
			{...props}
			participants={participants.map((participant) =>
				participant.id === '1'
					? { ...participant, displayName: 'Renamed' }
					: participant,
			)}
		/>,
	);
	expect(screen.getByLabelText('Renamed audio')).toBe(audio);
	expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});

it('exposes audio recovery even for participants whose video tile is off-page', async () => {
	const user = userEvent.setup();
	vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
		new Error('Autoplay denied'),
	);
	render(<MeetingAudio {...props} />);
	await user.click(
		await screen.findByRole('button', { name: "Play Alex's audio" }),
	);
	await waitFor(() =>
		expect(
			screen.queryByRole('button', { name: "Play Alex's audio" }),
		).toBeNull(),
	);
});

it('retains the recovery action if playback keeps failing', async () => {
	const user = userEvent.setup();
	vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(
		new Error('Autoplay denied'),
	);
	render(<MeetingAudio {...props} />);
	await user.click(
		await screen.findByRole('button', { name: "Play Alex's audio" }),
	);
	expect(
		screen.getByRole('button', { name: "Play Alex's audio" }),
	).toBeTruthy();
});

it('routes audio to the selected speaker and tolerates unavailable output selection', async () => {
	const { rerender } = render(<MeetingAudio {...props} />);
	expect(setSinkId).toHaveBeenCalledWith('');
	rerender(<MeetingAudio {...props} audioOutputId="speaker-2" />);
	expect(setSinkId).toHaveBeenCalledWith('speaker-2');
	setSinkId.mockRejectedValueOnce(new Error('Output unavailable'));
	rerender(<MeetingAudio {...props} audioOutputId="speaker-3" />);
	await waitFor(() => expect(screen.queryByRole('button')).toBeNull());
	Reflect.deleteProperty(HTMLMediaElement.prototype, 'setSinkId');
	rerender(<MeetingAudio {...props} audioOutputId="default" />);
	await waitFor(() => expect(screen.queryByRole('button')).toBeNull());
});

it('cleans up departed participants and replaced streams', () => {
	const { rerender, unmount } = render(<MeetingAudio {...props} />);
	const alex = screen.getByLabelText('Alex audio') as HTMLAudioElement;
	const sam = screen.getByLabelText('Sam audio') as HTMLAudioElement;
	const replacement = {} as MediaStream;
	rerender(
		<MeetingAudio {...props} streams={{ ...streams, '1': replacement }} />,
	);
	expect(alex.srcObject).toBe(replacement);
	rerender(
		<MeetingAudio
			{...props}
			participants={participants.filter(
				(participant) => participant.id !== '1',
			)}
		/>,
	);
	expect(alex.srcObject).toBeNull();
	expect(screen.queryByLabelText('Alex audio')).toBeNull();
	unmount();
	expect(sam.srcObject).toBeNull();
});
