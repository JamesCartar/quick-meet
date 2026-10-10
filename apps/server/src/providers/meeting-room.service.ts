import type {
	JoinMeetingInput,
	Participant,
	SignalPayload,
} from '@meet/contracts/meeting';
import { TRPCError } from '@trpc/server';

type HeartbeatInput = {
	id: string;
	microphoneEnabled: boolean;
	cameraEnabled: boolean;
};
type SendSignalInput = {
	senderId: string;
	recipientId: string;
	payload: SignalPayload;
};

type RoomRequest =
	| { operation: 'join'; input: JoinMeetingInput }
	| { operation: 'heartbeat'; input: HeartbeatInput }
	| { operation: 'rename'; input: { id: string; displayName: string } }
	| { operation: 'leave'; id: string }
	| { operation: 'sendSignal'; input: SendSignalInput }
	| { operation: 'acknowledgeSignals'; id: string; messageIds: string[] };

type RoomResponse =
	| { ok: true; result: unknown }
	| { ok: false; code: string; message: string };

type JoinResult = { participant: Participant; serverTime: number };
type HeartbeatResult = { serverTime: number };
type RenameResult = { participant: Participant; serverTime: number };
type LeaveResult = { left: true };
type SignalResult = { id: string };
type AcknowledgeResult = { acknowledged: true };

export interface MeetingRoomClient {
	join(input: JoinMeetingInput): Promise<JoinResult>;
	heartbeat(input: HeartbeatInput): Promise<HeartbeatResult>;
	rename(input: { id: string; displayName: string }): Promise<RenameResult>;
	leave(id: string): Promise<LeaveResult>;
	sendSignal(input: SendSignalInput): Promise<SignalResult>;
	acknowledgeSignals(
		id: string,
		messageIds: string[],
	): Promise<AcknowledgeResult>;
}

type DurableObjectNamespaceLike = {
	idFromName(name: string): unknown;
	get(id: unknown): {
		fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
	};
};

export class MeetingRoomService implements MeetingRoomClient {
	private readonly namespace: DurableObjectNamespaceLike;

	constructor(namespace: unknown) {
		this.namespace = namespace as DurableObjectNamespaceLike;
	}

	join(input: JoinMeetingInput) {
		return this.request<JoinResult>({ operation: 'join', input });
	}

	heartbeat(input: HeartbeatInput) {
		return this.request<HeartbeatResult>({ operation: 'heartbeat', input });
	}

	rename(input: { id: string; displayName: string }) {
		return this.request<RenameResult>({ operation: 'rename', input });
	}

	leave(id: string) {
		return this.request<LeaveResult>({ operation: 'leave', id });
	}

	sendSignal(input: SendSignalInput) {
		return this.request<SignalResult>({ operation: 'sendSignal', input });
	}

	acknowledgeSignals(id: string, messageIds: string[]) {
		return this.request<AcknowledgeResult>({
			operation: 'acknowledgeSignals',
			id,
			messageIds,
		});
	}

	private async request<TResult>(input: RoomRequest) {
		const id = this.namespace.idFromName('main');
		const response = await this.namespace
			.get(id)
			.fetch('https://meeting-room/internal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
			});
		const body = (await response.json()) as RoomResponse;
		if (!body.ok) {
			throw new TRPCError({
				code: this.toTrpcCode(body.code),
				message: body.message,
			});
		}
		return body.result as TResult;
	}

	private toTrpcCode(
		code: string,
	): 'BAD_REQUEST' | 'CONFLICT' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR' {
		if (code === 'CONFLICT' || code === 'NOT_FOUND' || code === 'BAD_REQUEST')
			return code;
		return 'INTERNAL_SERVER_ERROR';
	}
}
