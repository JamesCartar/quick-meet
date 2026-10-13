import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
vi.mock('@/common/api/trpc', () => ({
	serverUrl: 'https://example.com',
	trpc: {},
	trpcClient: {
		meeting: {
			turnCredentials: { query },
			heartbeat: {},
			leave: {},
			sendChatMessage: {},
			reactToChatMessage: {},
		},
	},
}));

beforeEach(() => {
	vi.resetModules();
	query.mockReset();
	vi.useFakeTimers();
	vi.setSystemTime(1_000_000);
});
afterEach(() => vi.useRealTimers());

it('shares requests and refreshes TURN credentials before expiry', async () => {
	const { meetingService } = await import('./meeting.service');
	query.mockResolvedValue({
		iceServers: [],
		expiresAt: Date.now() + 3_600_000,
	});
	const first = meetingService.getTurnCredentials();
	expect(meetingService.getTurnCredentials()).toBe(first);
	await first;
	await meetingService.getTurnCredentials();
	expect(query).toHaveBeenCalledTimes(1);
	vi.setSystemTime(Date.now() + 3_540_000);
	await meetingService.getTurnCredentials();
	expect(query).toHaveBeenCalledTimes(2);
});

it('does not permanently cache a failed credentials request', async () => {
	const { meetingService } = await import('./meeting.service');
	query
		.mockRejectedValueOnce(new Error('Offline'))
		.mockResolvedValue({ iceServers: [] });
	await expect(meetingService.getTurnCredentials()).rejects.toThrow('Offline');
	await expect(meetingService.getTurnCredentials()).resolves.toEqual({
		iceServers: [],
	});
	expect(query).toHaveBeenCalledTimes(2);
});

it('periodically rechecks an unconfigured TURN server', async () => {
	const { meetingService } = await import('./meeting.service');
	query.mockResolvedValue({ iceServers: [] });
	await meetingService.getTurnCredentials();
	vi.setSystemTime(Date.now() + 60_000);
	await meetingService.getTurnCredentials();
	expect(query).toHaveBeenCalledTimes(2);
});
