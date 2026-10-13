import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ParticipantTile } from './ParticipantTile';

const useSpeaking = vi.hoisted(() => vi.fn(() => false));
vi.mock('../hooks/useSpeaking', () => ({ useSpeaking }));
beforeEach(() => {
	useSpeaking.mockReturnValue(false);
	vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});
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

it('animates around the camera-off avatar only while an unmuted participant speaks', () => {
	const props = {
		participant: { ...participant, microphoneEnabled: true },
		stream: null,
		local: false,
		connectionState: 'connected' as const,
		onRetry: vi.fn(),
	};
	const { container, rerender } = render(<ParticipantTile {...props} />);
	const halo = container.querySelector('.meeting-speaking-halo');
	const avatar = container.querySelector('[data-slot="avatar"]');
	expect(halo?.getAttribute('data-active')).toBe('false');
	expect(halo?.getAttribute('aria-hidden')).toBe('true');
	// The ring and avatar share a wrapper, so percentage-based sizing follows it.
	expect(halo?.parentElement).toBe(avatar?.parentElement);
	useSpeaking.mockReturnValue(true);
	rerender(<ParticipantTile {...props} />);
	expect(halo?.getAttribute('data-active')).toBe('true');
	rerender(<ParticipantTile {...props} participant={participant} />);
	expect(halo?.getAttribute('data-active')).toBe('false');
	useSpeaking.mockReturnValue(false);
	rerender(<ParticipantTile {...props} />);
	expect(halo?.getAttribute('data-active')).toBe('false');
});

it('keeps the wave on compact tiles but hides it for connecting or failed peers', () => {
	useSpeaking.mockReturnValue(true);
	const props = {
		participant: { ...participant, microphoneEnabled: true },
		stream: null,
		local: false,
		compact: true,
		onRetry: vi.fn(),
	};
	const { container, rerender } = render(
		<ParticipantTile {...props} connectionState="connected" />,
	);
	expect(
		container
			.querySelector('.meeting-speaking-halo')
			?.getAttribute('data-active'),
	).toBe('true');
	expect(
		container
			.querySelector('[data-slot="avatar"]')
			?.classList.contains('sm:size-10'),
	).toBe(true);
	rerender(<ParticipantTile {...props} connectionState="connecting" />);
	expect(
		container
			.querySelector('.meeting-speaking-halo')
			?.getAttribute('data-active'),
	).toBe('false');
	rerender(<ParticipantTile {...props} connectionState="failed" />);
	expect(
		container
			.querySelector('.meeting-speaking-halo')
			?.getAttribute('data-active'),
	).toBe('false');
});

it('detaches the video without restarting the stream when the camera turns off', () => {
	const stream = {
		getVideoTracks: () => [{ readyState: 'live' }],
	} as unknown as MediaStream;
	const props = { stream, local: true, onRetry: vi.fn() };
	const { rerender } = render(
		<ParticipantTile
			{...props}
			participant={{ ...participant, cameraEnabled: true }}
		/>,
	);
	const video = screen.getByLabelText('Alex Lee video') as HTMLVideoElement;
	expect(video.srcObject).toBe(stream);
	expect(video.autoplay).toBe(false);
	expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
	rerender(<ParticipantTile {...props} participant={participant} />);
	expect(video.srcObject).toBeNull();
	expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
	rerender(
		<ParticipantTile
			{...props}
			participant={{ ...participant, cameraEnabled: true }}
		/>,
	);
	expect(video.srcObject).toBe(stream);
	expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});

it('does not load empty or audio-only streams into the video tile', () => {
	const stream = { getVideoTracks: () => [] } as unknown as MediaStream;
	render(
		<ParticipantTile
			participant={{ ...participant, cameraEnabled: true }}
			stream={stream}
			local
			onRetry={vi.fn()}
		/>,
	);
	expect(
		(screen.getByLabelText('Alex Lee video') as HTMLVideoElement).srcObject,
	).toBeNull();
	expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
});

it('never overlays the wave on a visible camera feed', () => {
	useSpeaking.mockReturnValue(true);
	const stream = {
		getVideoTracks: () => [{ readyState: 'live' }],
	} as unknown as MediaStream;
	const { container } = render(
		<ParticipantTile
			participant={{
				...participant,
				microphoneEnabled: true,
				cameraEnabled: true,
			}}
			stream={stream}
			local
			onRetry={vi.fn()}
		/>,
	);
	expect(container.querySelector('.meeting-speaking-halo')).toBeNull();
	expect(screen.queryByText('AL')).toBeNull();
});
