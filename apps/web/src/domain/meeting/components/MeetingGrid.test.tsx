import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MeetingGrid } from './MeetingGrid';

vi.mock('@thangdevalone/meeting-grid-layout-react', () => ({
	GridContainer: ({
		children,
		count,
	}: {
		children: React.ReactNode;
		count: number;
	}) => (
		<div data-testid="grid" data-count={count}>
			{children}
		</div>
	),
	GridItem: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));
vi.mock('./ParticipantTile', () => ({
	ParticipantTile: ({
		participant,
	}: {
		participant: { displayName: string };
	}) => <div>{participant.displayName} camera tile</div>,
}));
vi.mock('./ScreenShareTile', () => ({
	ScreenShareTile: ({ displayName }: { displayName: string }) => (
		<div>{displayName} screen tile</div>
	),
}));
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

it('adds screen tiles without replacing camera tiles and removes them when sharing stops', () => {
	vi.stubGlobal('matchMedia', () => ({
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}));
	const participants = ['Alex', 'Sam'].map((displayName, index) => ({
		id: String(index),
		displayName,
		joinedAt: 1,
		lastSeen: 1,
		microphoneEnabled: true,
		cameraEnabled: true,
		screenSharing: true,
	}));
	const props = {
		participants,
		selfId: '0',
		localStream: null,
		remoteStreams: {},
		connectionStates: {},
		onRetry: vi.fn(),
		audioOutputId: 'default',
		localStreamRevision: 0,
		localScreenStream: {} as MediaStream,
		remoteScreenStreams: {},
		screenRevision: 0,
	};
	const { rerender } = render(<MeetingGrid {...props} />);
	expect(screen.getByTestId('grid').getAttribute('data-count')).toBe('4');
	for (const name of ['Alex', 'Sam']) {
		expect(screen.getByText(`${name} camera tile`)).toBeTruthy();
		expect(screen.getByText(`${name} screen tile`)).toBeTruthy();
	}
	rerender(
		<MeetingGrid
			{...props}
			participants={participants.map((participant) => ({
				...participant,
				screenSharing: false,
			}))}
		/>,
	);
	expect(screen.getByTestId('grid').getAttribute('data-count')).toBe('2');
	expect(screen.queryByText('Alex screen tile')).toBeNull();
	expect(screen.queryByText('Sam screen tile')).toBeNull();
	expect(screen.getByText('Alex camera tile')).toBeTruthy();
});
