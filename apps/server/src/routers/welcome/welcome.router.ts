import { publicProcedure, router, t } from '../../config/trpc';
import WelcomeService from './welcome.service';
import { welcomeResponseValidator } from './welcome.validator';

const withWelcomeService = t.middleware(({ ctx, next }) =>
	next({
		ctx: {
			...ctx,
			welcomeService: new WelcomeService(),
		},
	}),
);

const welcomeProcedure = publicProcedure.use(withWelcomeService);

const welcomeRouter = router({
	get: welcomeProcedure
		.output(welcomeResponseValidator)
		.query(({ ctx }) => ctx.welcomeService.getWelcome()),
});

export default welcomeRouter;
