import { router } from '../config/trpc';
import meetingRouter from './meeting/meeting.router';
import welcomeRouter from './welcome/welcome.router';

export const appRouter = router({
	welcome: welcomeRouter,
	meeting: meetingRouter,
});

export type AppRouter = typeof appRouter;
