import type { Context as HonoContext } from 'hono';
import { FirebaseService } from '../providers/firebase';

export type Bindings = {
	ALLOWED_ORIGINS: string;
	FIREBASE_DATABASE_URL: string;
	FIREBASE_SERVICE_ACCOUNT?: string;
};

export function createContext({
	context,
}: {
	context: HonoContext<{ Bindings: Bindings }>;
}) {
	return {
		env: context.env,
		firebase: new FirebaseService(context.env),
	};
}

export type Context = ReturnType<typeof createContext>;
