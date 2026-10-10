import type {
	participantsSchema,
	Signal,
	SignalPayload,
} from '@meet/contracts/meeting';
import { useMutation } from '@tanstack/react-query';
import { serverUrl, trpc, trpcClient } from '@/common/api/trpc';

type Participants = ReturnType<typeof participantsSchema.parse>;
type ServerMessage =
	| { type: 'participants'; participants: Participants }
	| { type: 'signal'; signal: Signal };

type SignalHandler = {
	onSignal: (signal: Signal) => void;
	onError: (error: Error) => void;
};

class MeetingService {
	private socket: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
	private readonly participantListeners = new Set<{
		onChange: (participants: Participants) => void;
		onError: (error: Error) => void;
	}>();
	private readonly signalListeners = new Map<string, SignalHandler>();
	private readonly connectionListeners = new Set<
		(connected: boolean) => void
	>();

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
		onChange: (participants: Participants) => void,
		onError: (error: Error) => void,
	) {
		const listener = { onChange, onError };
		this.participantListeners.add(listener);
		this.ensureSocket();
		return () => {
			this.participantListeners.delete(listener);
			this.closeWhenUnused();
		};
	}

	subscribeToSignals(
		id: string,
		onSignal: (signal: Signal) => void,
		onError: (error: Error) => void,
	) {
		this.signalListeners.set(id, { onSignal, onError });
		this.ensureSocket();
		this.sendSubscription(id);
		return () => {
			this.signalListeners.delete(id);
			this.closeWhenUnused();
		};
	}

	subscribeToConnection(onChange: (connected: boolean) => void) {
		this.connectionListeners.add(onChange);
		this.ensureSocket();
		return () => {
			this.connectionListeners.delete(onChange);
			this.closeWhenUnused();
		};
	}

	leaveOnPageHide(id: string) {
		void fetch(`${serverUrl}/trpc/meeting.leave`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id }),
			keepalive: true,
		}).catch(() => {});
	}

	private ensureSocket() {
		if (this.socket || this.reconnectTimer) return;
		const websocketUrl = `${serverUrl.replace(/^http/, 'ws')}/ws`;
		const socket = new WebSocket(websocketUrl);
		this.socket = socket;
		socket.addEventListener('open', () => {
			for (const listener of this.connectionListeners) listener(true);
			this.sendSubscription();
			for (const id of this.signalListeners.keys()) this.sendSubscription(id);
		});
		socket.addEventListener('message', (event) =>
			this.handleMessage(event.data),
		);
		socket.addEventListener('error', () => {
			const error = new Error('The meeting realtime connection failed.');
			for (const { onError } of this.signalListeners.values()) onError(error);
		});
		socket.addEventListener('close', () => {
			this.socket = null;
			for (const listener of this.connectionListeners) listener(false);
			this.scheduleReconnect();
		});
	}

	private handleMessage(raw: unknown) {
		try {
			const message = JSON.parse(String(raw)) as ServerMessage;
			if (message.type === 'participants') {
				for (const { onChange } of this.participantListeners)
					onChange(message.participants);
				return;
			}
			if (message.type === 'signal') {
				this.signalListeners
					.get(message.signal.recipientId)
					?.onSignal(message.signal);
			}
		} catch {
			const error = new Error(
				'The meeting received an invalid realtime message.',
			);
			for (const { onError } of this.participantListeners) onError(error);
			for (const { onError } of this.signalListeners.values()) onError(error);
		}
	}

	private sendSubscription(participantId?: string) {
		if (this.socket?.readyState !== WebSocket.OPEN) return;
		this.socket.send(JSON.stringify({ type: 'subscribe', participantId }));
	}

	private scheduleReconnect() {
		if (this.reconnectTimer || !this.hasListeners()) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = undefined;
			this.ensureSocket();
		}, 1000);
	}

	private closeWhenUnused() {
		if (this.hasListeners()) return;
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		this.reconnectTimer = undefined;
		this.socket?.close();
		this.socket = null;
	}

	private hasListeners() {
		return (
			this.participantListeners.size > 0 ||
			this.signalListeners.size > 0 ||
			this.connectionListeners.size > 0
		);
	}
}

export const meetingService = new MeetingService();
