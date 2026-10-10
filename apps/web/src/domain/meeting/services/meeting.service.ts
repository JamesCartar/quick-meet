import type { Signal, SignalPayload } from '@meet/contracts/meeting';
import { participantsSchema, signalSchema } from '@meet/contracts/meeting';
import { useMutation } from '@tanstack/react-query';
import { onChildAdded, onValue, ref } from 'firebase/database';
import { serverUrl, trpc, trpcClient } from '@/common/api/trpc';
import { firebaseDatabase, subscribeToMeeting } from '@/common/lib/firebase';

class MeetingService {
	useJoinMeeting = () => useMutation(trpc.meeting.join.mutationOptions());

	useRenameParticipant = () =>
		useMutation(trpc.meeting.rename.mutationOptions());

	heartbeat = trpcClient.meeting.heartbeat.mutate;
	leave = trpcClient.meeting.leave.mutate;

	sendSignal(senderId: string, recipientId: string, payload: SignalPayload) {
		return trpcClient.meeting.sendSignal.mutate({
			senderId,
			recipientId,
			payload,
		});
	}

	acknowledgeSignal(id: string, messageId: string) {
		return trpcClient.meeting.acknowledgeSignals.mutate({
			id,
			messageIds: [messageId],
		});
	}

	subscribeToParticipants(
		onChange: (
			participants: ReturnType<typeof participantsSchema.parse>,
		) => void,
		onError: (error: Error) => void,
	) {
		return subscribeToMeeting(
			'meeting/participants',
			(snapshot) => {
				const result = participantsSchema.safeParse(snapshot.val() ?? {});
				if (result.success) onChange(result.data);
				else
					onError(new Error('The meeting received invalid participant data.'));
			},
			onError,
		);
	}

	subscribeToSignals(
		id: string,
		onSignal: (signal: Signal) => void,
		onError: (error: Error) => void,
	) {
		return onChildAdded(
			ref(firebaseDatabase, `meeting/signaling/${id}`),
			(snapshot) => {
				const result = signalSchema.safeParse(snapshot.val());
				if (result.success && result.data.recipientId === id)
					onSignal(result.data);
				else
					onError(
						new Error('The meeting received an invalid connection message.'),
					);
			},
			onError,
		);
	}

	subscribeToConnection(onChange: (connected: boolean) => void) {
		return onValue(ref(firebaseDatabase, '.info/connected'), (snapshot) =>
			onChange(snapshot.val() === true),
		);
	}

	leaveOnPageHide(id: string) {
		// keepalive can finish a small cleanup request after the page is closed.
		void fetch(`${serverUrl}/trpc/meeting.leave`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id }),
			keepalive: true,
		}).catch(() => {});
	}
}

export const meetingService = new MeetingService();
