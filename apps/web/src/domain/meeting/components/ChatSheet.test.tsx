import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ChatSheet } from './ChatSheet';

const participants = ['Alex Morgan', 'Sam Rivera', 'Priya Shah'].map(
	(displayName, index) => ({
		id: ['self', 'sam', 'priya'][index],
		displayName,
		joinedAt: 1,
		lastSeen: 1,
		microphoneEnabled: false,
		cameraEnabled: false,
	}),
);
const props = {
	open: true,
	onOpenChange: vi.fn(),
	messages: [],
	participants,
	selfId: 'self',
	onSend: vi.fn().mockResolvedValue(undefined),
	onReact: vi.fn().mockResolvedValue(undefined),
	error: null,
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

it('renders repeated links without duplicate keys or losing adjacent text', () => {
	const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
	try {
		render(
			<ChatSheet
				{...props}
				messages={[
					{
						id: 'message',
						senderId: 'sam',
						displayName: 'Sam Rivera',
						content: 'https://example.com and https://example.com',
						createdAt: 1,
						reactions: {},
					},
				]}
			/>,
		);
		const links = screen.getAllByRole('link', { name: 'https://example.com' });
		expect(links).toHaveLength(2);
		expect(links[0].getAttribute('href')).toBe('https://example.com');
		expect(links[0].parentElement?.textContent).toBe(
			'https://example.com and https://example.com',
		);
		expect(errors.mock.calls.flat().join(' ')).not.toMatch(
			/same key|unique.*key/i,
		);
	} finally {
		errors.mockRestore();
	}
});

it('resets keyboard mention selection when typing and sends the completed message', async () => {
	const user = userEvent.setup();
	render(<ChatSheet {...props} />);
	const input = screen.getByRole('textbox', { name: 'Chat message' });
	await user.type(input, '@');
	await user.keyboard('{ArrowDown}{ArrowDown}');
	expect(input.getAttribute('aria-activedescendant')).toBe(
		'chat-mention-option-priya',
	);
	await user.type(input, 'Sam');
	expect(input.getAttribute('aria-activedescendant')).toBe(
		'chat-mention-option-sam',
	);
	await user.keyboard('{Enter}');
	await user.type(input, 'Thanks for sharing.');
	await user.click(screen.getByRole('button', { name: 'Send message' }));
	await waitFor(() =>
		expect(props.onSend).toHaveBeenCalledWith(
			'@Sam Rivera Thanks for sharing.',
		),
	);
	expect((input as HTMLInputElement).value).toBe('');
});
