import { expect, it } from 'vitest';
import { appRouter } from '../index';

it('returns the welcome response through the router and service', async () => {
	const caller = appRouter.createCaller({ meetingService: {} as never });
	expect(await caller.welcome.get()).toEqual({ message: 'Welcome to Meet!' });
});
