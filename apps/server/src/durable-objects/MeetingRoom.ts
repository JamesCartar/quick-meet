import {
	type JoinMeetingInput,
	MAX_PARTICIPANTS,
	type Participant,
	type Participants,
	PRESENCE_TIMEOUT_MS,
	participantSchema,
	type Signal,
	type SignalPayload,
} from '@meet/contracts/meeting';
import { z } from 'zod';

const websocketMessageSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('subscribe'),
		participantId: z.uuid().optional(),
	}),
]);

type StoredSignals = Record<string, Record<string, Signal>>;
type RoomState = {
	participants: Participants;
	signals: StoredSignals;
};

type RoomRequest =
	| { operation: 'join'; input: JoinMeetingInput }
	| {
			operation: 'heartbeat';
			input: Pick<Participant, 'id' | 'microphoneEnabled' | 'cameraEnabled'>;
	  }
	| { operation: 'rename'; input: { id: string; displayName: string } }
	| { operation: 'leave'; id: string }
	| {
			operation: 'sendSignal';
			input: { senderId: string; recipientId: string; payload: SignalPayload };
	  }
	| { operation: 'acknowledgeSignals'; id: string; messageIds: string[] };

type RoomResponse =
	| { ok: true; result: unknown }
	| { ok: false; code: string; message: string };

const emptyState = (): RoomState => ({ participants: {}, signals: {} });

export class MeetingRoom implements DurableObject {
	constructor(
		private readonly ctx: DurableObjectState,
		_env: CloudflareBindings,
	) {
		this.ctx.blockConcurrencyWhile(async () => {
			if (!(await this.ctx.storage.get<RoomState>('state'))) {
				await this.ctx.storage.put('state', emptyState());
			}
			await this.scheduleAlarm();
		});
	}

	async alarm() {
		const state = await this.getState();
		const now = Date.now();
		const activeEntries = Object.entries(state.participants).filter(
			([, participant]) => participant.lastSeen >= now - PRESENCE_TIMEOUT_MS,
		);
		const participants = Object.fromEntries(activeEntries);
		const expiredIds = Object.keys(state.participants).filter(
			(id) => !participants[id],
		);
		if (expiredIds.length > 0) {
			for (const id of expiredIds) delete state.signals[id];
			state.participants = participants;
			await this.saveState(state);
			this.broadcastParticipants(state.participants);
		}
		await this.scheduleAlarm();
	}

	async fetch(request: Request) {
		const url = new URL(request.url);
		if (url.pathname === '/ws') return this.acceptWebSocket(request);
		if (url.pathname !== '/internal' || request.method !== 'POST')
			return new Response('Not found', { status: 404 });

		try {
			const input = (await request.json()) as RoomRequest;
			const response = await this.handleRequest(input);
			return Response.json(response, { status: response.ok ? 200 : 400 });
		} catch (error) {
			return Response.json(
				{
					ok: false,
					code: 'INTERNAL_SERVER_ERROR',
					message:
						error instanceof Error ? error.message : 'Room request failed.',
				} satisfies RoomResponse,
				{ status: 500 },
			);
		}
	}

	private async handleRequest(input: RoomRequest): Promise<RoomResponse> {
		const state = await this.getActiveState();
		switch (input.operation) {
			case 'join':
				return this.join(state, input.input);
			case 'heartbeat':
				return this.heartbeat(state, input.input);
			case 'rename':
				return this.rename(state, input.input);
			case 'leave':
				return this.leave(state, input.id);
			case 'sendSignal':
				return this.sendSignal(state, input.input);
			case 'acknowledgeSignals':
				return this.acknowledgeSignals(state, input.id, input.messageIds);
		}
	}

	private async join(
		state: RoomState,
		input: JoinMeetingInput,
	): Promise<RoomResponse> {
		if (state.participants[input.id])
			return this.failure('CONFLICT', 'This participant has already joined.');
		if (Object.keys(state.participants).length >= MAX_PARTICIPANTS)
			return this.failure(
				'CONFLICT',
				'The meeting is full. Try again when someone leaves.',
			);
		const now = Date.now();
		const participant = participantSchema.parse({
			...input,
			joinedAt: now,
			lastSeen: now,
		});
		state.participants[input.id] = participant;
		await this.saveState(state);
		this.broadcastParticipants(state.participants);
		return { ok: true, result: { participant, serverTime: now } };
	}

	private async heartbeat(
		state: RoomState,
		input: Pick<Participant, 'id' | 'microphoneEnabled' | 'cameraEnabled'>,
	): Promise<RoomResponse> {
		const participant = state.participants[input.id];
		if (!participant)
			return this.failure(
				'NOT_FOUND',
				'Your meeting session expired. Please join again.',
			);
		const now = Date.now();
		state.participants[input.id] = { ...participant, ...input, lastSeen: now };
		await this.saveState(state);
		this.broadcastParticipants(state.participants);
		return { ok: true, result: { serverTime: now } };
	}

	private async rename(
		state: RoomState,
		input: { id: string; displayName: string },
	): Promise<RoomResponse> {
		const participant = state.participants[input.id];
		if (!participant)
			return this.failure(
				'NOT_FOUND',
				'Your meeting session expired. Please join again.',
			);
		const now = Date.now();
		const updated = {
			...participant,
			displayName: input.displayName,
			lastSeen: now,
		};
		state.participants[input.id] = updated;
		await this.saveState(state);
		this.broadcastParticipants(state.participants);
		return { ok: true, result: { participant: updated, serverTime: now } };
	}

	private async leave(state: RoomState, id: string): Promise<RoomResponse> {
		delete state.participants[id];
		delete state.signals[id];
		await this.saveState(state);
		this.broadcastParticipants(state.participants);
		return { ok: true, result: { left: true } };
	}

	private async sendSignal(
		state: RoomState,
		input: { senderId: string; recipientId: string; payload: SignalPayload },
	): Promise<RoomResponse> {
		if (input.senderId === input.recipientId)
			return this.failure('BAD_REQUEST', 'Cannot send a signal to yourself.');
		const now = Date.now();
		for (const id of [input.senderId, input.recipientId]) {
			if (
				!state.participants[id] ||
				state.participants[id].lastSeen < now - PRESENCE_TIMEOUT_MS
			)
				return this.failure(
					'NOT_FOUND',
					'The participant is no longer in the meeting.',
				);
		}
		const signal: Signal = {
			...input,
			id: crypto.randomUUID(),
			createdAt: now,
		};
		const inbox = state.signals[input.recipientId] ?? {};
		inbox[signal.id] = signal;
		state.signals[input.recipientId] = inbox;
		await this.saveState(state);
		this.sendToParticipant(input.recipientId, { type: 'signal', signal });
		return { ok: true, result: { id: signal.id } };
	}

	private async acknowledgeSignals(
		state: RoomState,
		id: string,
		messageIds: string[],
	): Promise<RoomResponse> {
		const inbox = state.signals[id];
		if (inbox) for (const messageId of messageIds) delete inbox[messageId];
		await this.saveState(state);
		return { ok: true, result: { acknowledged: true } };
	}

	private acceptWebSocket(request: Request) {
		if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
			return new Response('Expected WebSocket upgrade.', { status: 426 });
		const pair = new WebSocketPair();
		const client = pair[0];
		const server = pair[1];
		this.ctx.acceptWebSocket(server);
		return new Response(null, { status: 101, webSocket: client });
	}

	webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
		void this.handleSocketMessage(socket, String(message));
	}

	webSocketClose(_socket: WebSocket) {}

	webSocketError(_socket: WebSocket) {}

	private async handleSocketMessage(socket: WebSocket, raw: string) {
		let value: unknown;
		try {
			value = JSON.parse(raw);
		} catch {
			return;
		}
		const parsed = websocketMessageSchema.safeParse(value);
		if (!parsed.success) return;
		const participantId = parsed.data.participantId;
		socket.serializeAttachment({ participantId });
		const state = await this.getActiveState();
		socket.send(
			JSON.stringify({
				type: 'participants',
				participants: state.participants,
			}),
		);
		if (!participantId) return;
		for (const signal of Object.values(state.signals[participantId] ?? {}))
			socket.send(JSON.stringify({ type: 'signal', signal }));
	}

	private async getState() {
		return (await this.ctx.storage.get<RoomState>('state')) ?? emptyState();
	}

	private async getActiveState() {
		const state = await this.getState();
		const now = Date.now();
		for (const id of Object.keys(state.participants)) {
			if (state.participants[id].lastSeen < now - PRESENCE_TIMEOUT_MS) {
				delete state.participants[id];
				delete state.signals[id];
			}
		}
		return state;
	}

	private async saveState(state: RoomState) {
		await this.ctx.storage.put('state', state);
	}

	private async scheduleAlarm() {
		await this.ctx.storage.setAlarm(Date.now() + 60_000);
	}

	private broadcastParticipants(participants: Participants) {
		const message = JSON.stringify({ type: 'participants', participants });
		for (const socket of this.ctx.getWebSockets()) this.send(socket, message);
	}

	private sendToParticipant(participantId: string, value: unknown) {
		const message = JSON.stringify(value);
		for (const socket of this.ctx.getWebSockets()) {
			const attachment = socket.deserializeAttachment() as {
				participantId?: string;
			} | null;
			if (attachment?.participantId === participantId)
				this.send(socket, message);
		}
	}

	private send(socket: WebSocket, message: string) {
		try {
			socket.send(message);
		} catch {
			// The close event removes dead sockets from the room.
		}
	}

	private failure(code: string, message: string): RoomResponse {
		return { ok: false, code, message };
	}
}
