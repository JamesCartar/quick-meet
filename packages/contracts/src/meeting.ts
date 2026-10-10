import { z } from 'zod';

export const MAX_PARTICIPANTS = 5;
export const PRESENCE_TIMEOUT_MS = 90_000;
export const HEARTBEAT_INTERVAL_MS = 30_000;

export const mediaStateSchema = z.object({
	microphoneEnabled: z.boolean(),
	cameraEnabled: z.boolean(),
});

export const joinMeetingSchema = mediaStateSchema.extend({
	id: z.uuid(),
	displayName: z.string().trim().min(1, 'Enter your name').max(50),
});

export const participantSchema = joinMeetingSchema.extend({
	joinedAt: z.number(),
	lastSeen: z.number(),
});

export const participantsSchema = z.record(z.uuid(), participantSchema);

export const candidateSchema = z.object({
	candidate: z.string().max(4096),
	sdpMid: z.string().max(256).nullable(),
	sdpMLineIndex: z.number().int().nonnegative().nullable(),
	usernameFragment: z.string().max(256).nullable(),
});

export const signalPayloadSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('offer'), sdp: z.string().min(1).max(100_000) }),
	z.object({ type: z.literal('answer'), sdp: z.string().min(1).max(100_000) }),
	z.object({ type: z.literal('candidate'), candidate: candidateSchema }),
	z.object({ type: z.literal('request-offer') }),
]);

export const chatReactionSchema = z.enum(['😂', '😊', '😢', '👍', '👎', '🖕']);

export const chatMessageSchema = z.object({
	id: z.uuid(),
	senderId: z.uuid(),
	displayName: z.string().min(1).max(50),
	content: z.string().min(1).max(1000),
	createdAt: z.number(),
});

export const chatReactionEventSchema = z.object({
	messageId: z.uuid(),
	participantId: z.uuid(),
	reaction: chatReactionSchema,
});

export const signalSchema = z.object({
	id: z.uuid(),
	senderId: z.uuid(),
	recipientId: z.uuid(),
	createdAt: z.number(),
	payload: signalPayloadSchema,
});

export type ChatReaction = z.infer<typeof chatReactionSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatReactionEvent = z.infer<typeof chatReactionEventSchema>;
export type MediaState = z.infer<typeof mediaStateSchema>;
export type JoinMeetingInput = z.infer<typeof joinMeetingSchema>;
export type Participant = z.infer<typeof participantSchema>;
export type Participants = z.infer<typeof participantsSchema>;
export type Signal = z.infer<typeof signalSchema>;
export type SignalPayload = z.infer<typeof signalPayloadSchema>;
