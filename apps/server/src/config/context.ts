import { meetingService } from '../routers/meeting/meeting.service';

export function createContext() {
	return { meetingService };
}

export type Context = ReturnType<typeof createContext>;
