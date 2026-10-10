import {
	type JoinMeetingInput,
	MAX_PARTICIPANTS,
	type Participants,
	PRESENCE_TIMEOUT_MS,
	participantsSchema,
} from '@meet/contracts/meeting';
import { TRPCError } from '@trpc/server';
import type { FirebaseService } from '../../providers/firebase';
import type {
	HeartbeatInput,
	RenameParticipantInput,
	SendSignalInput,
} from './meeting.validator';

class MeetingService {
	constructor(private readonly firebase: FirebaseService) {}

	async join(input: JoinMeetingInput) {
		const result = await this.updateParticipants((participants, now) => {
			if (participants[input.id]) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'This participant has already joined.',
				});
			}
			if (Object.keys(participants).length >= MAX_PARTICIPANTS) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'The meeting is full. Try again when someone leaves.',
				});
			}
			return {
				...participants,
				[input.id]: { ...input, joinedAt: now, lastSeen: now },
			};
		});
		return {
			participant: result.participants[input.id],
			serverTime: result.serverTime,
		};
	}

	async heartbeat(input: HeartbeatInput) {
		const result = await this.updateParticipants((participants, now) => {
			const participant = participants[input.id];
			if (!participant) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Your meeting session expired. Please join again.',
				});
			}
			return {
				...participants,
				[input.id]: { ...participant, ...input, lastSeen: now },
			};
		});
		return { serverTime: result.serverTime };
	}

	async rename(input: RenameParticipantInput) {
		const result = await this.updateParticipants((participants, now) => {
			const participant = participants[input.id];
			if (!participant)
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Your meeting session expired. Please join again.',
				});
			return {
				...participants,
				[input.id]: {
					...participant,
					displayName: input.displayName,
					lastSeen: now,
				},
			};
		});
		return {
			participant: result.participants[input.id],
			serverTime: result.serverTime,
		};
	}

	async leave(id: string) {
		await this.updateParticipants((participants) => {
			const remaining = { ...participants };
			delete remaining[id];
			return remaining;
		});
		await this.firebase.remove(`meeting/signaling/${id}`);
		return { left: true };
	}

	async sendSignal(input: SendSignalInput) {
		if (input.senderId === input.recipientId) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Cannot send a signal to yourself.',
			});
		}
		const now = Date.now();
		const participants = participantsSchema.parse(
			(await this.firebase.get('meeting/participants')) ?? {},
		);
		for (const id of [input.senderId, input.recipientId]) {
			if (
				!participants[id] ||
				participants[id].lastSeen < now - PRESENCE_TIMEOUT_MS
			) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'The participant is no longer in the meeting.',
				});
			}
		}
		const id = crypto.randomUUID();
		await this.firebase.set(`meeting/signaling/${input.recipientId}/${id}`, {
			...input,
			id,
			createdAt: now,
		});
		return { id };
	}

	async acknowledgeSignals(id: string, messageIds: string[]) {
		await Promise.all(
			messageIds.map((messageId) =>
				this.firebase.remove(`meeting/signaling/${id}/${messageId}`),
			),
		);
		return { acknowledged: true };
	}

	// Conditional writes prevent simultaneous joins from overfilling the mesh.
	private async updateParticipants(
		update: (participants: Participants, now: number) => Participants,
	) {
		for (let attempt = 0; attempt < 8; attempt++) {
			const snapshot = await this.firebase.getWithETag('meeting/participants');
			const stored = participantsSchema.parse(snapshot.data ?? {});
			const now = Date.now();
			const active = Object.fromEntries(
				Object.entries(stored).filter(
					([, participant]) =>
						participant.lastSeen >= now - PRESENCE_TIMEOUT_MS,
				),
			);
			const updated = update(active, now);
			if (
				await this.firebase.compareAndSet(
					'meeting/participants',
					snapshot.etag,
					updated,
				)
			) {
				const expiredIds = Object.keys(stored).filter((id) => !active[id]);
				await Promise.allSettled(
					expiredIds.map((id) =>
						this.firebase.remove(`meeting/signaling/${id}`),
					),
				);
				return { participants: updated, serverTime: now };
			}
		}
		throw new TRPCError({
			code: 'CONFLICT',
			message: 'The meeting is busy. Please try again.',
		});
	}
}

export default MeetingService;
