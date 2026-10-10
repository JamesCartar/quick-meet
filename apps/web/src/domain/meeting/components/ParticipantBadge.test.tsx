import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ParticipantBadge } from './ParticipantBadge';

afterEach(cleanup);

it('shows microphone activity and prioritizes mute over speaking', () => {
	const { rerender } = render(
		<ParticipantBadge displayName="Alex" microphoneEnabled speaking={false} />,
	);
	expect(screen.getByText('Alex')).toBeTruthy();
	expect(screen.getByLabelText('Microphone on')).toBeTruthy();
	rerender(
		<ParticipantBadge displayName="Alex" microphoneEnabled={false} speaking />,
	);
	expect(screen.getByLabelText('Microphone off')).toBeTruthy();
	expect(screen.queryByLabelText('Speaking')).toBeNull();
	rerender(<ParticipantBadge displayName="Alex" microphoneEnabled speaking />);
	expect(screen.getByLabelText('Speaking')).toBeTruthy();
});
