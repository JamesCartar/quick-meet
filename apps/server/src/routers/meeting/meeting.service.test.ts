import { PRESENCE_TIMEOUT_MS } from '@meet/contracts/meeting';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MeetingService } from './meeting.service';

const createParticipant = () => ({
	id: crypto.randomUUID(),
	displayName: 'Teammate',
	microphoneEnabled: true,
	cameraEnabled: true,
});

afterEach(() => vi.useRealTimers());

describe('MeetingService', () => {
	it('broadcasts sharing state immediately and includes it in new subscriptions', async () => {
		const room = new MeetingService();
		const input = createParticipant();
		const listener = vi.fn();
		const subscription = room.subscribe(listener);
		await room.join(input);
		await room.heartbeat({ ...input, screenSharing: true });
		expect(listener).toHaveBeenLastCalledWith({
			type: 'participants',
			participants: {
				[input.id]: expect.objectContaining({ screenSharing: true }),
			},
		});
		const newcomer = vi.fn();
		const second = room.subscribe(newcomer);
		expect(newcomer).toHaveBeenCalledWith({
			type: 'participants',
			participants: {
				[input.id]: expect.objectContaining({ screenSharing: true }),
			},
		});
		await room.heartbeat({ ...input, screenSharing: false });
		expect(listener).toHaveBeenLastCalledWith({
			type: 'participants',
			participants: {
				[input.id]: expect.objectContaining({ screenSharing: false }),
			},
		});
		subscription.close();
		second.close();
	});

	it('enforces five active participants and evicts expired sessions', async () => {
		vi.useFakeTimers();
		const room = new MeetingService();
		const inputs = Array.from({ length: 6 }, createParticipant);
		for (const input of inputs.slice(0, 5)) await room.join(input);
		await expect(room.join(inputs[5])).rejects.toThrow('full');
		vi.advanceTimersByTime(PRESENCE_TIMEOUT_MS + 1);
		await room.join(inputs[5]);
		await expect(room.heartbeat(inputs[0])).rejects.toThrow('expired');
	});

	it('broadcasts presence and replays only unacknowledged signals to their recipient', async () => {
		const room = new MeetingService();
		const sender = createParticipant();
		const recipient = createParticipant();
		const first = vi.fn();
		const second = vi.fn();
		const subscription = room.subscribe(first);
		await room.join(sender);
		await room.join(recipient);
		expect(first).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'participants' }),
		);
		const { id } = await room.sendSignal({
			senderId: sender.id,
			recipientId: recipient.id,
			payload: { type: 'request-offer' },
		});
		expect(first).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: 'signal' }),
		);
		const receiver = room.subscribe(second);
		receiver.identify(recipient.id);
		expect(second).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'signal',
				signal: expect.objectContaining({ id }),
			}),
		);
		await room.acknowledgeSignals(recipient.id, [id]);
		second.mockClear();
		receiver.identify(recipient.id);
		expect(second).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: 'signal' }),
		);
		subscription.close();
		receiver.close();
	});
});
