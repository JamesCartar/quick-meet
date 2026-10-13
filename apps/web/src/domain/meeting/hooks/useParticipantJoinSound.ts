import type { Participant } from '@meet/contracts/meeting';
import { useEffect, useRef, useState } from 'react';
import { createJoinSound } from '../lib/join-sound';

export function useParticipantJoinSound(
	participants: Participant[],
	selfId: string | undefined,
	connected: boolean,
	audioOutputId = 'default',
) {
	const [sound] = useState(createJoinSound);
	const history = useRef<{
		selfId: string | undefined;
		known: Map<string, number> | null;
	}>({ selfId: undefined, known: null });

	useEffect(() => () => sound.close(), [sound]);
	useEffect(() => {
		if (!selfId) sound.close();
	}, [selfId, sound]);
	useEffect(() => {
		sound.setOutput(audioOutputId);
	}, [audioOutputId, sound]);

	useEffect(() => {
		if (history.current.selfId !== selfId || !connected || !selfId) {
			history.current = { selfId, known: null };
		}
		if (!selfId || !connected) return;
		// Wait for a current room snapshot, not the pre-join participant list.
		if (!participants.some((participant) => participant.id === selfId)) return;
		const current = new Map(
			participants.map((participant) => [participant.id, participant.joinedAt]),
		);
		const known = history.current.known;
		if (!known) {
			history.current.known = current;
			return;
		}
		for (const [id, joinedAt] of current) {
			if (id !== selfId && known.get(id) !== joinedAt) sound.play();
			known.set(id, joinedAt);
		}
		// Retain seen identities so a briefly stale presence record does not chime.
	}, [participants, selfId, connected, sound]);

	return sound.prepare;
}
