import type { Participant } from '@meet/contracts/meeting';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useParticipantJoinSound } from './useParticipantJoinSound';

const sound = vi.hoisted(() => ({
	prepare: vi.fn(),
	play: vi.fn(),
	close: vi.fn(),
	setOutput: vi.fn(),
}));
vi.mock('../lib/join-sound', () => ({ createJoinSound: () => sound }));

function participant(id: string, joinedAt = 1): Participant {
	return {
		id,
		joinedAt,
		lastSeen: 1,
		displayName: id,
		microphoneEnabled: true,
		cameraEnabled: false,
	};
}
const self = participant('self');
const alex = participant('alex');
const sam = participant('sam');
const props = {
	participants: [self, alex],
	selfId: 'self' as string | undefined,
	connected: true,
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it('plays only for new remote joins, not initial participants, heartbeats, renames, or departures', () => {
	const { result, rerender } = renderHook(
		(p) => useParticipantJoinSound(p.participants, p.selfId, p.connected),
		{ initialProps: props },
	);
	result.current();
	expect(sound.prepare).toHaveBeenCalledOnce();
	expect(sound.play).not.toHaveBeenCalled();
	rerender({ ...props, participants: [self, alex, sam] });
	expect(sound.play).toHaveBeenCalledOnce();
	rerender({
		...props,
		participants: [self, { ...alex, displayName: 'Renamed', lastSeen: 2 }, sam],
	});
	rerender(props);
	// A temporarily missing record returning is not a new join.
	rerender({ ...props, participants: [self, alex, sam] });
	expect(sound.play).toHaveBeenCalledOnce();
});

it('waits for the self-inclusive initial snapshot and stays silent on reconnect', () => {
	const { rerender } = renderHook(
		(p) => useParticipantJoinSound(p.participants, p.selfId, p.connected),
		{ initialProps: { ...props, participants: [alex] } },
	);
	rerender(props);
	expect(sound.play).not.toHaveBeenCalled();
	rerender({ ...props, connected: false });
	rerender({ ...props, connected: false, participants: [self, alex, sam] });
	rerender({ ...props, participants: [self, alex, sam] });
	expect(sound.play).not.toHaveBeenCalled();
	rerender({ ...props, participants: [self, alex, sam, participant('new')] });
	expect(sound.play).toHaveBeenCalledOnce();
});

it('chimes for a genuine rejoin and each simultaneous new participant', () => {
	const { rerender } = renderHook(
		(p) => useParticipantJoinSound(p.participants, p.selfId, p.connected),
		{ initialProps: props },
	);
	rerender({ ...props, participants: [self, participant('alex', 2), sam] });
	expect(sound.play).toHaveBeenCalledTimes(2);
});

it('updates the chime output when the meeting speaker changes', () => {
	const { rerender } = renderHook(
		({ output }) =>
			useParticipantJoinSound(
				props.participants,
				props.selfId,
				props.connected,
				output,
			),
		{ initialProps: { output: 'speaker-2' } },
	);
	expect(sound.setOutput).toHaveBeenLastCalledWith('speaker-2');
	rerender({ output: 'speaker-3' });
	expect(sound.setOutput).toHaveBeenLastCalledWith('speaker-3');
	expect(sound.play).not.toHaveBeenCalled();
});

it('does not play outside the call and releases audio on leaving and unmount', () => {
	const { rerender, unmount } = renderHook(
		(p) => useParticipantJoinSound(p.participants, p.selfId, p.connected),
		{ initialProps: props },
	);
	rerender({ ...props, selfId: undefined, participants: [alex, sam] });
	expect(sound.play).not.toHaveBeenCalled();
	expect(sound.close).toHaveBeenCalledOnce();
	rerender({ ...props, participants: [self, alex, sam] });
	expect(sound.play).not.toHaveBeenCalled();
	unmount();
	expect(sound.close).toHaveBeenCalledTimes(2);
});
