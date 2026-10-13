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
	expect(
		screen
			.getByLabelText('Alex Lee video')
			.classList.contains('object-contain'),
	).toBe(true);
	expect(
		screen.getByLabelText('Alex Lee video').classList.contains('object-cover'),
	).toBe(false);
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

it('keeps the connecting spinner at the far-right edge without occupying the pin corner', () => {
	render(
		<ParticipantTile
			participant={participant}
			stream={null}
			local={false}
			connectionState="connecting"
			compact
			onRetry={vi.fn()}
		/>,
	);
	const indicator = screen.getByLabelText('Connecting').parentElement;
	expect(indicator?.classList.contains('right-2')).toBe(true);
	expect(indicator?.classList.contains('bottom-2')).toBe(true);
	expect(indicator?.classList.contains('right-10')).toBe(false);
	expect(indicator?.classList.contains('@max-[320px]/tile:right-1')).toBe(true);
});

it('shrinks sidebar avatars and initials on both desktop and narrow tiles without shrinking the main tile', () => {
	const { container, rerender } = render(
		<ParticipantTile
			participant={participant}
			stream={null}
			local
			compact
			onRetry={vi.fn()}
		/>,
	);
	const avatar = container.querySelector('[data-slot="avatar"]');
	expect(avatar?.classList.contains('sm:size-10')).toBe(true);
	expect(avatar?.classList.contains('@max-[320px]/tile:size-8')).toBe(true);
	expect(screen.getByText('AL').classList.contains('sm:text-sm')).toBe(true);
	expect(
		screen.getByText('AL').classList.contains('@max-[320px]/tile:text-xs'),
	).toBe(true);
	rerender(
		<ParticipantTile
			participant={participant}
			stream={null}
			local
			onRetry={vi.fn()}
		/>,
	);
	expect(
		container
			.querySelector('[data-slot="avatar"]')
			?.classList.contains('sm:size-24'),
	).toBe(true);
	expect(screen.getByText('AL').classList.contains('sm:text-3xl')).toBe(true);
});
