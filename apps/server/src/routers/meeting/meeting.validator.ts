import {
	joinMeetingSchema,
	mediaStateSchema,
	signalPayloadSchema,
	chatReactionSchema,
} from '@meet/contracts/meeting';
import { z } from 'zod';

export const joinMeetingValidator = joinMeetingSchema;
export const renameParticipantValidator = joinMeetingSchema.pick({
	id: true,
	displayName: true,
});
export const participantIdValidator = z.object({ id: z.uuid() });
export const heartbeatValidator = mediaStateSchema.extend({ id: z.uuid() });
export const sendSignalValidator = z.object({
	senderId: z.uuid(),
	recipientId: z.uuid(),
	payload: signalPayloadSchema,
});
export const acknowledgeSignalsValidator = participantIdValidator.extend({
	messageIds: z.array(z.uuid()).min(1).max(64),
});
export const sendChatMessageValidator = z.object({
	senderId: z.uuid(),
	content: z.string().trim().min(1).max(1000),
});
export const reactToChatMessageValidator = z.object({
	participantId: z.uuid(),
	messageId: z.uuid(),
	reaction: chatReactionSchema,
});

export type SendSignalInput = z.infer<typeof sendSignalValidator>;
export type RenameParticipantInput = z.infer<typeof renameParticipantValidator>;
export type HeartbeatInput = z.infer<typeof heartbeatValidator>;
