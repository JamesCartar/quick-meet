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

it('uses dark screen-label colors with contrasting text and microphone states', () => {
	const { rerender } = render(
		<ParticipantBadge
			displayName="Alex"
			microphoneEnabled={false}
			speaking={false}
			local
			compact
		/>,
	);
	const name = screen.getByText('Alex');
	expect(name.parentElement?.classList.contains('bg-black/55')).toBe(true);
	expect(name.parentElement?.classList.contains('text-white')).toBe(true);
	expect(name.parentElement?.classList.contains('text-[10px]')).toBe(true);
	expect(name.getAttribute('title')).toBe('Alex');
	expect(
		screen.getByLabelText('Microphone off').classList.contains('text-zinc-300'),
	).toBe(true);
	rerender(
		<ParticipantBadge displayName="Alex" microphoneEnabled speaking compact />,
	);
	expect(
		screen.getByLabelText('Speaking').classList.contains('text-emerald-400'),
	).toBe(true);
});
