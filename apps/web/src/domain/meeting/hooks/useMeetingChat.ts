import type {
	ChatMessage,
	ChatReaction,
	ChatReactionEvent,
} from '@meet/contracts/meeting';
import { useCallback, useEffect, useState } from 'react';
import { meetingService } from '../services';

export type ChatMessageWithReactions = ChatMessage & {
	reactions: Partial<Record<ChatReaction, string[]>>;
};

export function useMeetingChat(participantId?: string) {
	const [messages, setMessages] = useState<ChatMessageWithReactions[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!participantId) {
			setMessages([]);
			return;
		}
		return meetingService.subscribeToChat(
			(message) =>
				setMessages((current) =>
					current.some((item) => item.id === message.id)
						? current
						: [...current, { ...message, reactions: {} }],
				),
			({
				messageId,
				participantId: reactorId,
				reaction,
			}: ChatReactionEvent) => {
				setMessages((current) =>
					current.map((message) => {
						if (message.id !== messageId) return message;
						const reactions = { ...message.reactions };
						for (const key of Object.keys(reactions) as ChatReaction[]) {
							reactions[key] = reactions[key]?.filter((id) => id !== reactorId);
						}
						reactions[reaction] = [...(reactions[reaction] ?? []), reactorId];
						return { ...message, reactions };
					}),
				);
			},
			(failure) => setError(failure.message),
		);
	}, [participantId]);

	const send = useCallback(
		async (content: string) => {
			if (!participantId) return;
			setError(null);
			try {
				await meetingService.sendChatMessage({
					senderId: participantId,
					content,
				});
			} catch (failure) {
				setError(
					failure instanceof Error
						? failure.message
						: 'Unable to send message.',
				);
			}
		},
		[participantId],
	);

	const react = useCallback(
		async (messageId: string, reaction: ChatReaction) => {
			if (!participantId) return;
			try {
				await meetingService.reactToChatMessage({
					participantId,
					messageId,
					reaction,
				});
			} catch (failure) {
				setError(
					failure instanceof Error
						? failure.message
						: 'Unable to add reaction.',
				);
			}
		},
		[participantId],
	);

	return { messages, send, react, error };
}
