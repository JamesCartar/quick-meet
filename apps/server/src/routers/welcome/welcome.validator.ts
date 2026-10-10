import { z } from 'zod';

export const welcomeResponseValidator = z.object({
	message: z.string(),
});

export type WelcomeResponse = z.infer<typeof welcomeResponseValidator>;
