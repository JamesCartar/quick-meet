import {
	type Participants,
	PRESENCE_TIMEOUT_MS,
} from '@meet/contracts/meeting';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	type FirebasePath,
	FirebaseService,
	type FirebaseValue,
} from '../../providers/firebase';
import MeetingService from './meeting.service';

class MemoryFirebase extends FirebaseService {
	participants: Participants = {};
	signals = new Map<string, FirebaseValue>();
	private version = 0;

	constructor() {
		super({
			ALLOWED_ORIGINS: '',
			FIREBASE_DATABASE_URL: 'https://example.firebasedatabase.app',
		});
	}

	override async get() {
		return structuredClone(this.participants);
	}
	override async getWithETag() {
		return {
			data: structuredClone(this.participants),
			etag: String(this.version),
		};
	}
	override async compareAndSet(
		_path: FirebasePath,
		etag: string,
		value: FirebaseValue,
	) {
		if (etag !== String(this.version)) return false;
		this.participants = structuredClone(value) as Participants;
		this.version++;
		return true;
	}
	override async set(path: FirebasePath, value: FirebaseValue) {
		this.signals.set(path, value);
	}
	override async remove(path: FirebasePath) {
		for (const key of this.signals.keys())
			if (key === path || key.startsWith(`${path}/`)) this.signals.delete(key);
	}
}

function joinInput() {
	return {
		id: crypto.randomUUID(),
		displayName: 'Teammate',
		microphoneEnabled: true,
		cameraEnabled: true,
	};
}

afterEach(() => vi.useRealTimers());

describe('MeetingService', () => {
	it('admits at most five participants even during concurrent joins', async () => {
		const firebase = new MemoryFirebase();
		const service = new MeetingService(firebase);
		const results = await Promise.allSettled(
			Array.from({ length: 6 }, () => service.join(joinInput())),
		);
		expect(
			results.filter((result) => result.status === 'fulfilled'),
		).toHaveLength(5);
		expect(Object.keys(firebase.participants)).toHaveLength(5);
	});

	it('removes expired participants and their inboxes when admitting someone', async () => {
		vi.useFakeTimers();
		const firebase = new MemoryFirebase();
		const service = new MeetingService(firebase);
		const stale = joinInput();
		await service.join(stale);
		firebase.signals.set(`meeting/signaling/${stale.id}/message`, {
			old: true,
		});
		vi.advanceTimersByTime(PRESENCE_TIMEOUT_MS + 1);
		await service.join(joinInput());
		expect(firebase.participants[stale.id]).toBeUndefined();
		expect(firebase.signals.size).toBe(0);
	});

	it('updates media state and refuses to revive an expired session', async () => {
		vi.useFakeTimers();
		const firebase = new MemoryFirebase();
		const service = new MeetingService(firebase);
		const input = joinInput();
		await service.join(input);
		await service.heartbeat({
			id: input.id,
			microphoneEnabled: false,
			cameraEnabled: false,
		});
		expect(firebase.participants[input.id].cameraEnabled).toBe(false);
		vi.advanceTimersByTime(PRESENCE_TIMEOUT_MS + 1);
		await expect(service.heartbeat(input)).rejects.toThrow('expired');
	});

	it('validates signaling membership and deletes acknowledged messages', async () => {
		const firebase = new MemoryFirebase();
		const service = new MeetingService(firebase);
		const alice = joinInput();
		const bob = joinInput();
		await service.join(alice);
		await service.join(bob);
		const { id } = await service.sendSignal({
			senderId: alice.id,
			recipientId: bob.id,
			payload: { type: 'offer', sdp: 'sdp' },
		});
		expect(firebase.signals.size).toBe(1);
		await service.acknowledgeSignals(bob.id, [id]);
		expect(firebase.signals.size).toBe(0);
		await expect(
			service.sendSignal({
				senderId: alice.id,
				recipientId: crypto.randomUUID(),
				payload: { type: 'request-offer' },
			}),
		).rejects.toThrow('no longer');
		await expect(
			service.sendSignal({
				senderId: alice.id,
				recipientId: alice.id,
				payload: { type: 'request-offer' },
			}),
		).rejects.toThrow('yourself');
	});

	it('renames an active participant without changing its session identity', async () => {
		const firebase = new MemoryFirebase();
		const service = new MeetingService(firebase);
		const input = joinInput();
		await service.join(input);
		const joinedAt = firebase.participants[input.id].joinedAt;
		const result = await service.rename({
			id: input.id,
			displayName: 'New name',
		});
		expect(result.participant.displayName).toBe('New name');
		expect(result.participant.id).toBe(input.id);
		expect(result.participant.joinedAt).toBe(joinedAt);
		await service.leave(input.id);
		await expect(
			service.rename({ id: input.id, displayName: 'New name' }),
		).rejects.toThrow('expired');
	});

	it('cleans up on leave and supports repeated cleanup requests', async () => {
		const firebase = new MemoryFirebase();
		const service = new MeetingService(firebase);
		const input = joinInput();
		await service.join(input);
		firebase.signals.set(`meeting/signaling/${input.id}/message`, {});
		await service.leave(input.id);
		await service.leave(input.id);
		expect(Object.keys(firebase.participants)).toHaveLength(0);
		expect(firebase.signals.size).toBe(0);
	});
});
