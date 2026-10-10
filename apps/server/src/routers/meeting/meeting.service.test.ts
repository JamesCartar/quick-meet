import { describe, expect, it, vi } from 'vitest';
import type { MeetingRoomClient } from '../../providers/meeting-room.service';
import MeetingService from './meeting.service';

const input = {
	id: crypto.randomUUID(),
	displayName: 'Teammate',
	microphoneEnabled: true,
	cameraEnabled: true,
};

function createRoom(): MeetingRoomClient {
	return {
		join: vi.fn().mockResolvedValue({ participant: input, serverTime: 1 }),
		heartbeat: vi.fn().mockResolvedValue({ serverTime: 2 }),
		rename: vi.fn().mockResolvedValue({ participant: input, serverTime: 3 }),
		leave: vi.fn().mockResolvedValue({ left: true }),
		sendSignal: vi.fn().mockResolvedValue({ id: crypto.randomUUID() }),
		acknowledgeSignals: vi.fn().mockResolvedValue({ acknowledged: true }),
	};
}

describe('MeetingService', () => {
	it('delegates meeting operations to the Durable Object room', async () => {
		const room = createRoom();
		const service = new MeetingService(room);
		await service.join(input);
		await service.heartbeat({
			id: input.id,
			microphoneEnabled: false,
			cameraEnabled: false,
		});
		await service.rename({ id: input.id, displayName: 'New name' });
		await service.sendSignal({
			senderId: input.id,
			recipientId: crypto.randomUUID(),
			payload: { type: 'request-offer' },
		});
		await service.acknowledgeSignals(input.id, [crypto.randomUUID()]);
		await service.leave(input.id);
		expect(room.join).toHaveBeenCalledWith(input);
		expect(room.heartbeat).toHaveBeenCalled();
		expect(room.rename).toHaveBeenCalled();
		expect(room.sendSignal).toHaveBeenCalled();
		expect(room.acknowledgeSignals).toHaveBeenCalled();
		expect(room.leave).toHaveBeenCalledWith(input.id);
	});
});
