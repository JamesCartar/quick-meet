import { expect, it } from 'vitest';
import { FirebaseService } from '../../providers/firebase';
import { appRouter } from '../index';

it('returns the welcome response through the router and service', async () => {
	const env = {
		ALLOWED_ORIGINS: 'http://localhost:5173',
		FIREBASE_DATABASE_URL: 'https://example.firebasedatabase.app',
	};
	const caller = appRouter.createCaller({
		env,
		firebase: new FirebaseService(env),
	});
	expect(await caller.welcome.get()).toEqual({ message: 'Welcome to Meet!' });
});
