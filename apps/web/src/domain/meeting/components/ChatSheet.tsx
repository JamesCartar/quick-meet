import type { ChatReaction, Participant } from '@meet/contracts/meeting';
import { MessageCircle, Send, Smile } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/common/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/shared/components/ui/sheet';
import type { ChatMessageWithReactions } from '../hooks/useMeetingChat';

const reactions: ChatReaction[] = ['😂', '😊', '😢', '👍', '👎', '🖕'];
const urlPattern = /(https?:\/\/[^\s]+)/g;

function renderMessage(content: string) {
	return content.split(urlPattern).map((part, index) =>
		/^https?:\/\//.test(part) ? (
			<a
				key={`${part}-${index}`}
				href={part}
				target="_blank"
				rel="noreferrer"
				className="underline underline-offset-2 hover:opacity-80"
			>
				{part}
			</a>
		) : (
			<span key={`${part}-${index}`}>{part}</span>
		),
	);
}

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	messages: ChatMessageWithReactions[];
	participants: Participant[];
	selfId: string;
	onSend: (content: string) => Promise<void>;
	onReact: (messageId: string, reaction: ChatReaction) => Promise<void>;
	error: string | null;
};

export function ChatSheet({
	open,
	onOpenChange,
	messages,
	participants,
	selfId,
	onSend,
	onReact,
	error,
}: Props) {
	const [draft, setDraft] = useState('');
	const [activeMentionIndex, setActiveMentionIndex] = useState(0);
	const [reactionMenuId, setReactionMenuId] = useState<string | null>(null);
	const chatViewportRef = useRef<HTMLDivElement>(null);
	const reactionPopoverRef = useRef<HTMLDivElement>(null);
	const scrollAfterSend = useRef(false);
	const mention = draft.match(/(?:^|\s)@([^\s@]*)$/)?.[1].toLowerCase();
	const mentionSuggestions = useMemo(
		() =>
			mention === undefined
				? []
				: participants
						.filter((participant) =>
							participant.displayName.toLowerCase().includes(mention),
						)
						.slice(0, 4),
		[mention, participants],
	);

	useEffect(() => {
		setActiveMentionIndex(0);
	}, [mention]);

	const send = async () => {
		const content = draft.trim();
		if (!content) return;
		scrollAfterSend.current = true;
		await onSend(content);
		setDraft('');
	};

	useEffect(() => {
		if (!reactionMenuId) return;
		const onPointerDown = (event: PointerEvent) => {
			if (!reactionPopoverRef.current?.contains(event.target as Node))
				setReactionMenuId(null);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setReactionMenuId(null);
		};
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [reactionMenuId]);

	useEffect(() => {
		if (!open) return;
		const frame = requestAnimationFrame(() => {
			if (chatViewportRef.current) {
				chatViewportRef.current.scrollTop =
					chatViewportRef.current.scrollHeight;
			}
		});
		return () => cancelAnimationFrame(frame);
	}, [open]);

	useEffect(() => {
		if (!scrollAfterSend.current || messages.length === 0) return;
		scrollAfterSend.current = false;
		requestAnimationFrame(() => {
			if (chatViewportRef.current)
				chatViewportRef.current.scrollTop =
					chatViewportRef.current.scrollHeight;
		});
	}, [messages.length]);

	const addMention = (name: string) => {
		setDraft((current) => current.replace(/@[^\s@]*$/, `@${name} `));
		setActiveMentionIndex(0);
	};
	const addReaction = async (messageId: string, reaction: ChatReaction) => {
		await onReact(messageId, reaction);
		setReactionMenuId(null);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="dark h-svh max-h-svh w-screen max-w-none rounded-none border-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:rounded-l-xl sm:border-l">
				<SheetHeader className="border-b px-6 py-5 pr-14">
					<SheetTitle className="flex items-center gap-2 text-lg">
						<MessageCircle className="size-5" />
						Meeting chat
					</SheetTitle>
				</SheetHeader>
				<div className="flex min-h-0 flex-1 flex-col px-4">
					<ScrollArea className="min-h-0 flex-1" viewportRef={chatViewportRef}>
						<div className="space-y-1 py-4 pl-2 pr-3 sm:pr-5">
							{messages.length === 0 ? (
								<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
									<MessageCircle className="size-8" />
									<p>
										No messages yet.
										<br />
										Start the conversation.
									</p>
								</div>
							) : (
								messages.map((message) => {
									const own = message.senderId === selfId;
									const activeReactions = reactions.filter(
										(reaction) => message.reactions[reaction]?.length,
									);
									return (
										<div
											key={message.id}
											className={cn(
												'flex flex-col gap-0.5',
												own ? 'items-end' : 'items-start',
											)}
										>
											<span className="px-2 text-xs text-muted-foreground">
												{own ? 'You' : message.displayName}
											</span>
											<div className="w-fit min-w-0 max-w-[82%]">
												<div
													className={cn(
														'box-border w-fit min-w-0 max-w-full rounded-2xl px-3.5 py-2.5 text-sm leading-5 [overflow-wrap:anywhere] whitespace-pre-wrap',
														own
															? 'rounded-br-sm bg-primary text-primary-foreground'
															: 'rounded-bl-sm bg-muted',
													)}
												>
													{renderMessage(message.content)}
												</div>
											</div>
											<div className="flex items-center gap-1">
												{activeReactions.map((reaction) => (
													<button
														key={reaction}
														type="button"
														className="rounded-full border bg-muted/70 px-2 py-0.5 text-xs hover:bg-muted"
														aria-label={`React ${reaction}`}
														onClick={() =>
															void addReaction(message.id, reaction)
														}
													>
														{reaction} {message.reactions[reaction]?.length}
													</button>
												))}
												<div
													className="relative"
													ref={(node) => {
														if (reactionMenuId === message.id) {
															reactionPopoverRef.current = node;
														}
													}}
												>
													<Button
														variant="ghost"
														size="icon-sm"
														className="size-7 rounded-full text-muted-foreground opacity-70 transition-colors hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100"
														aria-label="Add reaction"
														onClick={() =>
															setReactionMenuId((current) =>
																current === message.id ? null : message.id,
															)
														}
													>
														<Smile />
													</Button>
													{reactionMenuId === message.id && (
														<div
															className={cn(
																'absolute top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5 rounded-full border bg-popover p-1 shadow-lg ring-1 ring-foreground/10',
																own ? 'right-full mr-2' : 'left-full ml-2',
															)}
														>
															{reactions.map((reaction) => (
																<button
																	key={reaction}
																	type="button"
																	className="flex size-8 items-center justify-center rounded-full text-base transition-colors hover:bg-muted"
																	aria-label={`React ${reaction}`}
																	onClick={() =>
																		void addReaction(message.id, reaction)
																	}
																>
																	{reaction}
																</button>
															))}
														</div>
													)}
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>
					</ScrollArea>
					{mentionSuggestions.length > 0 && (
						<div
							id="chat-mention-listbox"
							role="listbox"
							aria-label="Mention participant"
							className="mb-2 rounded-lg border bg-popover p-1 shadow-sm"
						>
							<p className="px-2 py-1 text-xs text-muted-foreground">
								Mention someone
							</p>
							{mentionSuggestions.map((participant, index) => (
								<button
									key={participant.id}
									id={`chat-mention-option-${participant.id}`}
									role="option"
									aria-selected={index === activeMentionIndex}
									type="button"
									className={cn(
										'block w-full rounded px-2 py-1.5 text-left text-sm',
										index === activeMentionIndex && 'bg-muted',
									)}
									onMouseEnter={() => setActiveMentionIndex(index)}
									onClick={() => addMention(participant.displayName)}
								>
									@{participant.displayName}
								</button>
							))}
						</div>
					)}
					{error && <p className="mb-2 text-xs text-destructive">{error}</p>}
					<div className="relative flex items-end gap-2 border-t py-4">
						<Input
							id="chat-message"
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							onKeyDown={(event) => {
								if (
									event.key === 'ArrowDown' &&
									mentionSuggestions.length > 0
								) {
									event.preventDefault();
									setActiveMentionIndex(
										(index) => (index + 1) % mentionSuggestions.length,
									);
									return;
								}
								if (event.key === 'ArrowUp' && mentionSuggestions.length > 0) {
									event.preventDefault();
									setActiveMentionIndex(
										(index) =>
											(index - 1 + mentionSuggestions.length) %
											mentionSuggestions.length,
									);
									return;
								}
								if (event.key === 'Enter' && !event.shiftKey) {
									event.preventDefault();
									if (mentionSuggestions.length > 0) {
										addMention(
											mentionSuggestions[activeMentionIndex].displayName,
										);
									} else {
										void send();
									}
								}
							}}
							aria-autocomplete="list"
							aria-controls={
								mentionSuggestions.length > 0
									? 'chat-mention-listbox'
									: undefined
							}
							aria-activedescendant={
								mentionSuggestions[activeMentionIndex]
									? `chat-mention-option-${mentionSuggestions[activeMentionIndex].id}`
									: undefined
							}
							placeholder="use @ to mention"
							aria-label="Chat message"
							maxLength={1000}
						/>
						<Button
							type="button"
							size="icon"
							aria-label="Send message"
							disabled={!draft.trim()}
							onClick={() => void send()}
						>
							<Send />
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
