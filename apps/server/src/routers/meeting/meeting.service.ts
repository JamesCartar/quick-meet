import type { JoinMeetingInput } from '@meet/contracts/meeting';
import type { MeetingRoomClient } from '../../providers/meeting-room.service';
import type {
	HeartbeatInput,
	RenameParticipantInput,
	SendSignalInput,
} from './meeting.validator';

class MeetingService {
	constructor(private readonly room: MeetingRoomClient) {}

	join(input: JoinMeetingInput) {
		return this.room.join(input);
	}

	heartbeat(input: HeartbeatInput) {
		return this.room.heartbeat(input);
	}

	rename(input: RenameParticipantInput) {
		return this.room.rename(input);
	}

	leave(id: string) {
		return this.room.leave(id);
	}

	sendSignal(input: SendSignalInput) {
		return this.room.sendSignal(input);
	}

	acknowledgeSignals(id: string, messageIds: string[]) {
		return this.room.acknowledgeSignals(id, messageIds);
	}
}

export default MeetingService;
