import { publicProcedure, router, t } from '../../config/trpc';
import { MeetingRoomService } from '../../providers/meeting-room.service';
import MeetingService from './meeting.service';
import {
	acknowledgeSignalsValidator,
	heartbeatValidator,
	joinMeetingValidator,
	participantIdValidator,
	renameParticipantValidator,
	sendSignalValidator,
} from './meeting.validator';

const withMeetingService = t.middleware(({ ctx, next }) =>
	next({
		ctx: {
			...ctx,
			meetingService: new MeetingService(
				new MeetingRoomService(ctx.meetingRoom),
			),
		},
	}),
);
const meetingProcedure = publicProcedure.use(withMeetingService);

const meetingRouter = router({
	join: meetingProcedure
		.input(joinMeetingValidator)
		.mutation(({ ctx, input }) => ctx.meetingService.join(input)),
	heartbeat: meetingProcedure
		.input(heartbeatValidator)
		.mutation(({ ctx, input }) => ctx.meetingService.heartbeat(input)),
	rename: meetingProcedure
		.input(renameParticipantValidator)
		.mutation(({ ctx, input }) => ctx.meetingService.rename(input)),
	leave: meetingProcedure
		.input(participantIdValidator)
		.mutation(({ ctx, input }) => ctx.meetingService.leave(input.id)),
	sendSignal: meetingProcedure
		.input(sendSignalValidator)
		.mutation(({ ctx, input }) => ctx.meetingService.sendSignal(input)),
	acknowledgeSignals: meetingProcedure
		.input(acknowledgeSignalsValidator)
		.mutation(({ ctx, input }) =>
			ctx.meetingService.acknowledgeSignals(input.id, input.messageIds),
		),
});

export default meetingRouter;
