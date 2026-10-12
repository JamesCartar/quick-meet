import { publicProcedure, router } from '../../config/trpc';
import {
	acknowledgeSignalsValidator,
	heartbeatValidator,
	joinMeetingValidator,
	participantIdValidator,
	renameParticipantValidator,
	sendSignalValidator,
	sendChatMessageValidator,
	reactToChatMessageValidator,
} from './meeting.validator';

const meetingRouter = router({
	turnCredentials: publicProcedure.query(({ ctx }) =>
		ctx.meetingService.getTurnCredentials(),
	),
	join: publicProcedure
		.input(joinMeetingValidator)
		.mutation(({ ctx, input }) => ctx.meetingService.join(input)),
	heartbeat: publicProcedure
		.input(heartbeatValidator)
		.mutation(({ ctx, input }) => ctx.meetingService.heartbeat(input)),
	rename: publicProcedure
		.input(renameParticipantValidator)
		.mutation(({ ctx, input }) => ctx.meetingService.rename(input)),
	leave: publicProcedure
		.input(participantIdValidator)
		.mutation(({ ctx, input }) => ctx.meetingService.leave(input.id)),
	sendSignal: publicProcedure
		.input(sendSignalValidator)
		.mutation(({ ctx, input }) => ctx.meetingService.sendSignal(input)),
	acknowledgeSignals: publicProcedure
		.input(acknowledgeSignalsValidator)
		.mutation(({ ctx, input }) =>
			ctx.meetingService.acknowledgeSignals(input.id, input.messageIds),
		),
	sendChatMessage: publicProcedure
		.input(sendChatMessageValidator)
		.mutation(({ ctx, input }) => ctx.meetingService.sendChatMessage(input)),
	reactToChatMessage: publicProcedure
		.input(reactToChatMessageValidator)
		.mutation(({ ctx, input }) => ctx.meetingService.reactToChatMessage(input)),

});

export default meetingRouter;
