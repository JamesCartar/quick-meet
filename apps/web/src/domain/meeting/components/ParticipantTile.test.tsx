import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ParticipantTile } from './ParticipantTile';

vi.mock('../hooks/useSpeaking', () => ({ useSpeaking: () => false }));
afterEach(cleanup);
const participant = {
	id: 'self',
	displayName: 'Alex Lee',
	joinedAt: 1,
	lastSeen: 1,
	microphoneEnabled: false,
	cameraEnabled: false,
};

it('shows the avatar without Camera off text for local and connected remote participants', () => {
	const { rerender } = render(
		<ParticipantTile
			participant={participant}
			stream={null}
			local
			onRetry={vi.fn()}
		/>,
	);
	expect(screen.queryByText('Camera off')).toBeNull();
	expect(screen.getByText('AL')).toBeTruthy();
	rerender(
		<ParticipantTile
			participant={participant}
			stream={null}
			local={false}
			connectionState="connected"
			onRetry={vi.fn()}
		/>,
	);
	expect(screen.queryByText('Camera off')).toBeNull();
	expect(screen.getByText('AL')).toBeTruthy();
});

it('keeps connection status and reconnect controls', () => {
	const { rerender } = render(
		<ParticipantTile
			participant={participant}
			stream={null}
			local={false}
			connectionState="connecting"
			onRetry={vi.fn()}
		/>,
	);
	expect(screen.getByText('Connecting…')).toBeTruthy();
	rerender(
		<ParticipantTile
			participant={participant}
			stream={null}
			local={false}
			connectionState="failed"
			onRetry={vi.fn()}
		/>,
	);
	expect(screen.getByText('Connection interrupted')).toBeTruthy();
	expect(screen.getByRole('button', { name: 'Reconnect' })).toBeTruthy();
});
