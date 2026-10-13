import type { Participant, Participants } from '@meet/contracts/meeting';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useMeetingPresence } from './useMeetingPresence';
import { useParticipantJoinSound } from './useParticipantJoinSound';

const service = vi.hoisted(() => ({
	subscribeToParticipants: vi.fn(),
	subscribeToConnection: vi.fn(),
}));
const sound = vi.hoisted(() => ({
	prepare: vi.fn(),
	play: vi.fn(),
	close: vi.fn(),
	setOutput: vi.fn(),
}));
vi.mock('../services', () => ({ meetingService: service }));
vi.mock('../lib/join-sound', () => ({ createJoinSound: () => sound }));
let snapshot: (records: Participants) => void;
let connection: (connected: boolean) => void;
function participant(id: string): Participant {
	return {
		id,
		displayName: id,
		joinedAt: 1,
		lastSeen: Date.now(),
		microphoneEnabled: true,
		cameraEnabled: false,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	service.subscribeToParticipants.mockImplementation((callback) => {
		snapshot = callback;
		return vi.fn();
	});
	service.subscribeToConnection.mockImplementation((callback) => {
		connection = callback;
		return vi.fn();
	});
});
afterEach(cleanup);

it('waits for a fresh snapshot after reconnect before detecting subsequent joins', () => {
	const self = participant('self');
	const alex = participant('alex');
	const sam = participant('sam');
	const { result } = renderHook(() => {
		const presence = useMeetingPresence(
			null,
			{ microphoneEnabled: true, cameraEnabled: false },
			vi.fn(),
		);
		useParticipantJoinSound(
			presence.participants,
			self.id,
			presence.connected && presence.snapshotReady,
		);
		return presence;
	});
	act(() => connection(true));
	act(() => snapshot({ self, alex }));
	expect(result.current.snapshotReady).toBe(true);
	expect(sound.play).not.toHaveBeenCalled();
	act(() => connection(false));
	expect(result.current.snapshotReady).toBe(false);
	act(() => connection(true));
	expect(result.current.snapshotReady).toBe(false);
	// Sam joined while we were offline: this is a baseline, not a new join.
	act(() => snapshot({ self, alex, sam }));
	expect(sound.play).not.toHaveBeenCalled();
	act(() => snapshot({ self, alex, sam, new: participant('new') }));
	expect(sound.play).toHaveBeenCalledOnce();
});
