import { createHmac } from 'node:crypto';
import {
	type ChatMessage,
	type ChatReactionEvent,
	type JoinMeetingInput,
	MAX_PARTICIPANTS,
	type Participant,
	type Participants,
	PRESENCE_TIMEOUT_MS,
	type Signal,
	type SignalPayload,
} from '@meet/contracts/meeting';
import { TRPCError } from '@trpc/server';

type HeartbeatInput = Pick<
	Participant,
	'id' | 'microphoneEnabled' | 'cameraEnabled' | 'screenSharing'
>;
type SendSignalInput = {
	senderId: string;
	recipientId: string;
	payload: SignalPayload;
};
type Event =
	| { type: 'participants'; participants: Participants }
	| { type: 'signal'; signal: Signal }
	| { type: 'chat-message'; message: ChatMessage }
	| { type: 'chat-reaction'; reaction: ChatReactionEvent };

type Listener = (event: Event) => void;

/** One room per Node process. Run only one API process/instance. */
export class MeetingService {
	private participants: Participants = {};
	private readonly inboxes = new Map<string, Map<string, Signal>>();
	private readonly listeners = new Set<{
		participantId?: string;
		send: Listener;
	}>();

	private publish(event: Event) {
		for (const listener of this.listeners) {
			if (
				event.type === 'participants' ||
				event.type === 'chat-message' ||
				event.type === 'chat-reaction' ||
				listener.participantId === event.signal.recipientId
			) {
				try {
					listener.send(event);
				} catch {
					this.listeners.delete(listener);
				}
			}
		}
	}

	private prune() {
		const now = Date.now();
		let changed = false;
		for (const [id, participant] of Object.entries(this.participants)) {
			if (participant.lastSeen >= now - PRESENCE_TIMEOUT_MS) continue;
			delete this.participants[id];
			this.inboxes.delete(id);
			changed = true;
		}
		if (changed)
			this.publish({ type: 'participants', participants: this.participants });
	}

	/** Subscribe before joining; replay unacknowledged signals on reconnect. */
	subscribe(send: Listener) {
		this.prune();
		const listener: { participantId?: string; send: Listener } = { send };
		this.listeners.add(listener);
		send({ type: 'participants', participants: this.participants });
		return {
			identify: (participantId?: string) => {
				listener.participantId = participantId;
				this.prune();
				send({ type: 'participants', participants: this.participants });
				if (!participantId) return;
				for (const signal of this.inboxes.get(participantId)?.values() ?? [])
					send({ type: 'signal', signal });
			},
			close: () => {
				this.listeners.delete(listener);
			},
		};
	}

	getTurnCredentials() {
		const serverUrls = (process.env.TURN_SERVER_URLS ?? '')
			.split(',')
			.map((url) => url.trim())
			.filter(Boolean);
		const secret = process.env.TURN_SHARED_SECRET?.trim();
		if (serverUrls.length === 0 || !secret) return { iceServers: [] as const };

		const expiresAt = Math.floor(Date.now() / 1000) + 3600;
		const username = `${expiresAt}:meeting`;
		const credential = createHmac('sha1', secret)
			.update(username)
			.digest('base64');

		return {
			iceServers: [{ urls: serverUrls, username, credential }],
			expiresAt: expiresAt * 1000,
		};
	}

	async join(input: JoinMeetingInput) {
		this.prune();
		if (this.participants[input.id])
			throw new TRPCError({
				code: 'CONFLICT',
				message: 'This participant has already joined.',
			});
		if (Object.keys(this.participants).length >= MAX_PARTICIPANTS)
			throw new TRPCError({
				code: 'CONFLICT',
				message: 'The meeting is full. Try again when someone leaves.',
			});
		const serverTime = Date.now();
		const participant = {
			...input,
			screenSharing: false,
			joinedAt: serverTime,
			lastSeen: serverTime,
		};
		this.participants[input.id] = participant;
		this.publish({ type: 'participants', participants: this.participants });
		return { participant, serverTime };
	}

	async heartbeat(input: HeartbeatInput) {
		this.prune();
		const participant = this.participants[input.id];
		if (!participant)
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Your meeting session expired. Please join again.',
			});
		const serverTime = Date.now();
		this.participants[input.id] = {
			...participant,
			...input,
			lastSeen: serverTime,
		};
		this.publish({ type: 'participants', participants: this.participants });
		return { serverTime };
	}

	async rename(input: { id: string; displayName: string }) {
		this.prune();
		const participant = this.participants[input.id];
		if (!participant)
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Your meeting session expired. Please join again.',
			});
		const serverTime = Date.now();
		const updated = {
			...participant,
			displayName: input.displayName,
			lastSeen: serverTime,
		};
		this.participants[input.id] = updated;
		this.publish({ type: 'participants', participants: this.participants });
		return { participant: updated, serverTime };
	}

	async leave(id: string) {
		delete this.participants[id];
		this.inboxes.delete(id);
		this.publish({ type: 'participants', participants: this.participants });
		return { left: true as const };
	}

	async sendSignal(input: SendSignalInput) {
		this.prune();
		if (input.senderId === input.recipientId)
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Cannot send a signal to yourself.',
			});
		if (
			!this.participants[input.senderId] ||
			!this.participants[input.recipientId]
		)
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'The participant is no longer in the meeting.',
			});
		const signal: Signal = {
			...input,
			id: crypto.randomUUID(),
			createdAt: Date.now(),
		};
		let inbox = this.inboxes.get(input.recipientId);
		if (!inbox) {
			inbox = new Map();
			this.inboxes.set(input.recipientId, inbox);
		}
		inbox.set(signal.id, signal);
		this.publish({ type: 'signal', signal });
		return { id: signal.id };
	}

	async acknowledgeSignals(id: string, messageIds: string[]) {
		const inbox = this.inboxes.get(id);
		for (const messageId of messageIds) inbox?.delete(messageId);
		return { acknowledged: true as const };
	}

	async sendChatMessage(input: { senderId: string; content: string }) {
		this.prune();
		const sender = this.participants[input.senderId];
		if (!sender)
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'The participant is no longer in the meeting.',
			});
		const message: ChatMessage = {
			id: crypto.randomUUID(),
			senderId: sender.id,
			displayName: sender.displayName,
			content: input.content,
			createdAt: Date.now(),
		};
		this.publish({ type: 'chat-message', message });
		return message;
	}

	async reactToChatMessage(input: ChatReactionEvent) {
		this.prune();
		if (!this.participants[input.participantId])
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'The participant is no longer in the meeting.',
			});
		this.publish({ type: 'chat-reaction', reaction: input });
		return { reacted: true as const };
	}

	/** Periodically evict expired participants even when no requests arrive. */
	sweep() {
		this.prune();
	}
}

export const meetingService = new MeetingService();
