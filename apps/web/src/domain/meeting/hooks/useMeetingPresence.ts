import {
	HEARTBEAT_INTERVAL_MS,
	type MediaState,
	type Participant,
	type Participants,
	PRESENCE_TIMEOUT_MS,
} from '@meet/contracts/meeting';
import { TRPCClientError } from '@trpc/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { meetingService } from '../services';

export function useMeetingPresence(
	session: { participant: Participant; serverTime: number } | null,
	media: MediaState,
	onExpired: (message: string) => void,
	screenSharing = false,
) {
	const [records, setRecords] = useState<Participants>({});
	const [now, setNow] = useState(Date.now());
	const [connected, setConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const clockOffset = useRef(0);
	const lastSuccess = useRef(Date.now());

	useEffect(() => {
		const unsubscribeParticipants = meetingService.subscribeToParticipants(
			setRecords,
			(failure) => setError(failure.message),
		);
		const unsubscribeConnection =
			meetingService.subscribeToConnection(setConnected);
		const timer = setInterval(() => setNow(Date.now()), 5000);
		return () => {
			unsubscribeParticipants();
			unsubscribeConnection();
			clearInterval(timer);
		};
	}, []);

	useEffect(() => {
		if (!session) return;
		clockOffset.current = session.serverTime - Date.now();
		lastSuccess.current = Date.now();
	}, [session]);

	useEffect(() => {
		if (!session) return;
		let disposed = false;
		let pending = false;
		const heartbeat = async () => {
			if (pending || disposed) return;
			pending = true;
			try {
				const result = await meetingService.heartbeat({
					id: session.participant.id,
					...media,
					screenSharing,
				});
				if (!disposed) {
					lastSuccess.current = Date.now();
					clockOffset.current = result.serverTime - lastSuccess.current;
					setError(null);
				}
			} catch (failure) {
				if (disposed) return;
				if (
					(failure instanceof TRPCClientError &&
						failure.data?.code === 'NOT_FOUND') ||
					Date.now() - lastSuccess.current >= PRESENCE_TIMEOUT_MS
				) {
					onExpired('Your connection was lost. Please join the meeting again.');
				} else {
					setError(
						'Reconnecting to the meeting service. Your call may still be working.',
					);
				}
			} finally {
				pending = false;
			}
		};
		void heartbeat();
		const timer = setInterval(() => {
			void heartbeat();
		}, HEARTBEAT_INTERVAL_MS);
		window.addEventListener('online', heartbeat);
		return () => {
			disposed = true;
			clearInterval(timer);
			window.removeEventListener('online', heartbeat);
		};
	}, [session, media, onExpired, screenSharing]);

	const participants = useMemo(
		() =>
			Object.values(records)
				.filter(
					(participant) =>
						participant.lastSeen >=
						now + clockOffset.current - PRESENCE_TIMEOUT_MS,
				)
				.sort(
					(left, right) =>
						left.joinedAt - right.joinedAt || left.id.localeCompare(right.id),
				),
		[records, now],
	);

	return { participants, connected, error };
}
