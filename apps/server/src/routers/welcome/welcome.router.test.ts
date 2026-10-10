import { expect, it } from 'vitest';
import { appRouter } from '../index';

it('returns the welcome response through the router and service', async () => {
	const meetingRoom = {} as never;
	const caller = appRouter.createCaller({
		env: { ALLOWED_ORIGINS: '', MEETING_ROOM: meetingRoom },
		meetingRoom,
	});
	expect(await caller.welcome.get()).toEqual({ message: 'Welcome to Meet!' });
});
