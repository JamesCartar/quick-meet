import type { Participant } from '@meet/contracts/meeting';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MeetingGrid } from './MeetingGrid';

// Exercise the installed package itself, not a simulated pin/pagination layout.
beforeEach(() => {
	vi.stubGlobal('matchMedia', () => ({
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
	}));
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
			unobserve() {}
		},
	);
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280);
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(720);
	vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function participants(count = 5, sharing = true): Participant[] {
	return Array.from({ length: count }, (_, index) => ({
		id: String(index),
		displayName: `Person ${index}`,
		joinedAt: 1,
		lastSeen: 1,
		microphoneEnabled: false,
		cameraEnabled: false,
		screenSharing: sharing,
	}));
}
function stream() {
	return Object.assign(new EventTarget(), {
		getVideoTracks: () => [],
		getAudioTracks: () => [],
		getTracks: () => [],
	}) as unknown as MediaStream;
}
function props(records = participants()) {
	return {
		participants: records,
		selfId: '0',
		localStream: null,
		remoteStreams: {},
		connectionStates: {},
		onRetry: vi.fn(),
		audioOutputId: 'default',
		localStreamRevision: 0,
		localScreenStream: stream(),
		remoteScreenStreams: {},
		screenRevision: 0,
		onStopScreenShare: vi.fn(),
	};
}
function pin(name: string, kind = 'camera') {
	return screen.getByRole('button', { name: `Pin ${name}'s ${kind}` });
}
function unpin(name: string, kind = 'camera') {
	return screen.getByRole('button', { name: `Unpin ${name}'s ${kind}` });
}

it('keeps gallery camera/screen tiles distinct and wires local stop sharing', async () => {
	const user = userEvent.setup();
	const input = props(participants(2));
	const { rerender } = render(<MeetingGrid {...input} />);
	expect(screen.getAllByRole('button', { name: /^Pin / })).toHaveLength(4);
	expect(screen.queryByRole('navigation')).toBeNull();
	await user.click(screen.getByRole('button', { name: 'Stop sharing screen' }));
	expect(input.onStopScreenShare).toHaveBeenCalledOnce();
	rerender(<MeetingGrid {...input} participants={participants(2, false)} />);
	expect(screen.getAllByRole('button', { name: /^Pin / })).toHaveLength(2);
	expect(
		screen.queryByRole('button', { name: 'Stop sharing screen' }),
	).toBeNull();
});

it('pins and unpins a participant, restoring the complete gallery', async () => {
	const user = userEvent.setup();
	render(<MeetingGrid {...props()} />);
	await user.click(pin('Person 0'));
	expect(unpin('Person 0').getAttribute('aria-pressed')).toBe('true');
	expect(screen.getAllByRole('button', { name: /^(Pin|Unpin) / })).toHaveLength(
		5,
	);
	await user.click(unpin('Person 0'));
	expect(screen.getAllByRole('button', { name: /^Pin / })).toHaveLength(10);
	expect(screen.queryByRole('navigation')).toBeNull();
});

it('switches between a camera and screen pin without pinning both', async () => {
	const user = userEvent.setup();
	render(<MeetingGrid {...props(participants(2))} />);
	await user.click(pin('Person 0'));
	await user.click(pin('Person 0', 'screen'));
	expect(unpin('Person 0', 'screen')).toBeTruthy();
	expect(pin('Person 0').getAttribute('aria-pressed')).toBe('false');
	expect(screen.getAllByRole('button', { name: /^Unpin / })).toHaveLength(1);
});

it('does not show pagination for exactly four remaining tiles', async () => {
	const user = userEvent.setup();
	render(<MeetingGrid {...props(participants(5, false))} />);
	await user.click(pin('Person 0'));
	expect(screen.getAllByRole('button', { name: /^(Pin|Unpin) / })).toHaveLength(
		5,
	);
	expect(screen.queryByRole('navigation')).toBeNull();
});

it('paginates nine remaining tiles in groups of four without hiding the pin', async () => {
	const user = userEvent.setup();
	render(<MeetingGrid {...props()} />);
	await user.click(pin('Person 0'));
	expect(screen.getByText('Page 1 of 3')).toBeTruthy();
	expect(
		(
			screen.getByRole('button', {
				name: 'Previous tiles',
			}) as HTMLButtonElement
		).disabled,
	).toBe(true);
	for (let i = 1; i <= 4; i++) expect(pin(`Person ${i}`)).toBeTruthy();
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	expect(screen.getByText('Page 2 of 3')).toBeTruthy();
	for (let i = 0; i <= 3; i++)
		expect(pin(`Person ${i}`, 'screen')).toBeTruthy();
	expect(unpin('Person 0')).toBeTruthy();
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	expect(screen.getByText('Page 3 of 3')).toBeTruthy();
	expect(screen.getAllByRole('button', { name: /^(Pin|Unpin) / })).toHaveLength(
		2,
	);
	expect(pin('Person 4', 'screen')).toBeTruthy();
	expect(unpin('Person 0')).toBeTruthy();
	expect(
		(screen.getByRole('button', { name: 'Next tiles' }) as HTMLButtonElement)
			.disabled,
	).toBe(true);
	await user.click(screen.getByRole('button', { name: 'Previous tiles' }));
	expect(screen.getByText('Page 2 of 3')).toBeTruthy();
});

it('returns to the first sidebar page when pinning a tile from the last page', async () => {
	const user = userEvent.setup();
	render(<MeetingGrid {...props()} />);
	await user.click(pin('Person 0'));
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	await user.click(pin('Person 4', 'screen'));
	expect(screen.getByText('Page 1 of 3')).toBeTruthy();
	expect(unpin('Person 4', 'screen')).toBeTruthy();
	expect(pin('Person 0')).toBeTruthy();
});

it('clears a pin when the participant leaves', async () => {
	const user = userEvent.setup();
	const input = props();
	const { rerender } = render(<MeetingGrid {...input} />);
	await user.click(pin('Person 1'));
	rerender(
		<MeetingGrid
			{...input}
			participants={input.participants.filter(
				(participant) => participant.id !== '1',
			)}
		/>,
	);
	expect(screen.queryByRole('button', { name: /^Unpin / })).toBeNull();
	expect(screen.queryByRole('navigation')).toBeNull();
	expect(screen.getAllByRole('button', { name: /^Pin / })).toHaveLength(8);
});

it('clears a screen pin when sharing ends while retaining the participant camera', async () => {
	const user = userEvent.setup();
	const input = props();
	const { rerender } = render(<MeetingGrid {...input} />);
	await user.click(pin('Person 0'));
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	await user.click(pin('Person 1', 'screen'));
	rerender(
		<MeetingGrid
			{...input}
			participants={input.participants.map((participant) =>
				participant.id === '1'
					? { ...participant, screenSharing: false }
					: participant,
			)}
		/>,
	);
	expect(screen.queryByRole('button', { name: /^Unpin / })).toBeNull();
	expect(pin('Person 1')).toBeTruthy();
	expect(
		screen.queryByRole('button', { name: "Pin Person 1's screen" }),
	).toBeNull();
});

it('clamps pagination when tiles disappear and does not revive a stale page when they return', async () => {
	const user = userEvent.setup();
	const input = props();
	const { rerender } = render(<MeetingGrid {...input} />);
	await user.click(pin('Person 0'));
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	rerender(<MeetingGrid {...input} participants={participants(4)} />);
	expect(screen.getByText('Page 2 of 2')).toBeTruthy();
	expect(unpin('Person 0')).toBeTruthy();
	rerender(<MeetingGrid {...input} participants={participants(5, false)} />);
	expect(screen.queryByRole('navigation')).toBeNull();
	rerender(<MeetingGrid {...input} />);
	expect(screen.getByText('Page 1 of 3')).toBeTruthy();
});

it('keeps the same pin through participant reordering and renaming', async () => {
	const user = userEvent.setup();
	const input = props();
	const { rerender } = render(<MeetingGrid {...input} />);
	await user.click(pin('Person 2'));
	rerender(
		<MeetingGrid
			{...input}
			participants={[...input.participants]
				.reverse()
				.map((participant) =>
					participant.id === '2'
						? { ...participant, displayName: 'Renamed' }
						: participant,
				)}
		/>,
	);
	expect(unpin('Renamed')).toBeTruthy();
});

it('clears pin and pagination for a new meeting session', async () => {
	const user = userEvent.setup();
	const input = props();
	const { rerender } = render(<MeetingGrid {...input} />);
	await user.click(pin('Person 0'));
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	rerender(<MeetingGrid {...input} selfId="1" />);
	expect(screen.queryByRole('button', { name: /^Unpin / })).toBeNull();
	expect(screen.queryByRole('navigation')).toBeNull();
});

it('handles empty and single-tile meetings and rapid repeated pin clicks', async () => {
	const user = userEvent.setup();
	const input = props([]);
	const { rerender } = render(<MeetingGrid {...input} />);
	expect(screen.queryByRole('button')).toBeNull();
	rerender(<MeetingGrid {...input} participants={participants(1, false)} />);
	await user.click(pin('Person 0'));
	expect(unpin('Person 0')).toBeTruthy();
	expect(screen.queryByRole('navigation')).toBeNull();
	await user.click(unpin('Person 0'));
	await user.dblClick(pin('Person 0'));
	expect(pin('Person 0')).toBeTruthy();
});

it('keeps pagination overlaid and applies thumbnail sizing on every sidebar page', async () => {
	const user = userEvent.setup();
	render(<MeetingGrid {...props()} />);
	await user.click(pin('Person 0'));
	const navigation = screen.getByRole('navigation', {
		name: 'Other tiles pagination',
	});
	expect(navigation.classList.contains('absolute')).toBe(true);
	expect(navigation.classList.contains('mt-3')).toBe(false);
	const main = screen.getByRole('region', { name: 'Person 0, you' });
	expect(
		main
			.querySelector('[data-slot="avatar"]')
			?.classList.contains('sm:size-24'),
	).toBe(true);
	for (let i = 1; i <= 4; i++) {
		const thumbnail = screen.getByRole('region', { name: `Person ${i}` });
		expect(
			thumbnail
				.querySelector('[data-slot="avatar"]')
				?.classList.contains('sm:size-10'),
		).toBe(true);
	}
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	expect(
		screen
			.getByRole('button', { name: 'Stop sharing screen' })
			.classList.contains('h-8'),
	).toBe(true);
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	expect(pin('Person 4', 'screen').classList.contains('size-7')).toBe(true);
	await user.click(screen.getByRole('button', { name: 'Previous tiles' }));
	await user.click(pin('Person 0', 'screen'));
	expect(
		screen
			.getByRole('button', { name: 'Stop sharing screen' })
			.classList.contains('h-11'),
	).toBe(true);
});

it.each([
	[320, 568],
	[390, 844],
	[844, 390],
	[768, 1024],
	[1280, 800],
])(
	'keeps gallery, pinned and paginated tiles at 16:9 in a %sx%s grid',
	async (width, height) => {
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(
			width,
		);
		vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(
			height,
		);
		const user = userEvent.setup();
		const { container } = render(<MeetingGrid {...props()} />);
		const checkRatios = () => {
			const frames = Array.from(
				container.querySelectorAll<HTMLElement>('[data-grid-index]'),
			);
			expect(frames.length).toBeGreaterThan(0);
			for (const frame of frames) {
				expect(
					Number.parseFloat(frame.style.width) /
						Number.parseFloat(frame.style.height),
				).toBeCloseTo(16 / 9, 2);
			}
		};
		await waitFor(checkRatios);
		await user.click(pin('Person 0'));
		await waitFor(checkRatios);
		await user.click(screen.getByRole('button', { name: 'Next tiles' }));
		await waitFor(checkRatios);
	},
);

it('paginates short landscape galleries and uses fewer sidebar thumbnails instead of changing their ratio', async () => {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: query.includes('max-height'),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
	}));
	const user = userEvent.setup();
	render(<MeetingGrid {...props()} />);
	expect(
		screen.getByRole('navigation', { name: 'Meeting tiles pagination' }),
	).toBeTruthy();
	expect(screen.getAllByRole('button', { name: /^Pin / })).toHaveLength(4);
	await user.click(pin('Person 0'));
	expect(screen.getByText('Page 1 of 5')).toBeTruthy();
	expect(screen.getAllByRole('button', { name: /^(Pin|Unpin) / })).toHaveLength(
		3,
	);
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	expect(pin('Person 3')).toBeTruthy();
	expect(pin('Person 4')).toBeTruthy();
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	expect(pin('Person 0', 'screen')).toBeTruthy();
	await user.click(unpin('Person 0'));
	expect(screen.getByText('Page 1 of 3')).toBeTruthy();
});

it('retains the pin and clamps pagination when resizing between regular and short layouts', async () => {
	let short = false;
	let onChange = () => {};
	vi.stubGlobal('matchMedia', (query: string) => ({
		get matches() {
			return query.includes('max-height') && short;
		},
		addEventListener: (_event: string, callback: () => void) => {
			if (query.includes('max-height')) onChange = callback;
		},
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
	}));
	const user = userEvent.setup();
	render(<MeetingGrid {...props()} />);
	await user.click(pin('Person 0'));
	act(() => {
		short = true;
		onChange();
	});
	expect(screen.getByText('Page 1 of 5')).toBeTruthy();
	for (let i = 0; i < 4; i++)
		await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	expect(screen.getByText('Page 5 of 5')).toBeTruthy();
	act(() => {
		short = false;
		onChange();
	});
	expect(screen.getByText('Page 3 of 3')).toBeTruthy();
	expect(unpin('Person 0')).toBeTruthy();
});

it.each([
	[1366, 616],
	[1920, 928],
	[1280, 568],
	[1024, 616],
])(
	'keeps a three-tile pin dominant and thumbnails tightly stacked in a fitted %sx%s stage',
	async (width, height) => {
		// JSDOM has no size-container CSS layout. Supply the dimensions that
		// the responsive 8:3 stage has in a landscape meeting container.
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(
			Math.min(width, height * (8 / 3)),
		);
		vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(
			Math.min(height, width / (8 / 3)),
		);
		const user = userEvent.setup();
		for (const records of [
			participants(3, false),
			participants(2, false).map((participant) =>
				participant.id === '1'
					? { ...participant, screenSharing: true }
					: participant,
			),
		]) {
			const { container, unmount } = render(
				<MeetingGrid {...props(records)} />,
			);
			const checkDominance = () => {
				expect(
					container.querySelector('[data-pinned-stage="3"]')?.className,
				).toContain('aspect-[8/3]');
				const frames = Array.from(
					container.querySelectorAll<HTMLElement>('[data-grid-index]'),
				);
				expect(frames).toHaveLength(3);
				const main = frames.find((frame) => frame.dataset.gridMain === 'true');
				expect(main).toBeTruthy();
				const mainWidth = Number.parseFloat(main?.style.width ?? '0');
				const mainHeight = Number.parseFloat(main?.style.height ?? '0');
				const others = frames.filter((frame) => frame !== main);
				for (const frame of frames)
					expect(
						Number.parseFloat(frame.style.width) /
							Number.parseFloat(frame.style.height),
					).toBeCloseTo(16 / 9, 2);
				for (const other of others)
					expect(mainWidth).toBeGreaterThan(
						Number.parseFloat(other.style.width) * 1.5,
					);
				expect(mainHeight).toBeCloseTo(
					others.reduce(
						(sum, frame) => sum + Number.parseFloat(frame.style.height),
						0,
					) + 12,
					2,
				);
			};
			await user.click(pin('Person 0'));
			await waitFor(checkDominance, { timeout: 3000 });
			await user.click(
				pin('Person 1', records[1].screenSharing ? 'screen' : 'camera'),
			);
			await waitFor(checkDominance, { timeout: 3000 });
			unmount();
		}
	},
);

it('uses a dominant two-tile stage and returns to automatic layout when more tiles join', async () => {
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(
		1280 / (20 / 9),
	);
	const user = userEvent.setup();
	const { container, rerender } = render(
		<MeetingGrid {...props(participants(2, false))} />,
	);
	await user.click(pin('Person 1'));
	expect(
		container.querySelector('[data-pinned-stage="2"]')?.className,
	).toContain('aspect-[20/9]');
	await waitFor(() => {
		const frames = Array.from(
			container.querySelectorAll<HTMLElement>('[data-grid-index]'),
		);
		const main = frames.find((frame) => frame.dataset.gridMain === 'true');
		const other = frames.find((frame) => frame !== main);
		expect(Number.parseFloat(main?.style.width ?? '0')).toBeGreaterThan(
			Number.parseFloat(other?.style.width ?? '0') * 3,
		);
	});
	rerender(<MeetingGrid {...props(participants(4, false))} />);
	expect(container.querySelector('[data-pinned-stage]')).toBeNull();
	expect(unpin('Person 1')).toBeTruthy();
});

it('keeps all remote audio elements mounted and video muted across pins and pages', async () => {
	const user = userEvent.setup();
	const input = {
		...props(),
		remoteStreams: Object.fromEntries(
			[1, 2, 3, 4].map((id) => [String(id), stream()]),
		),
	};
	render(<MeetingGrid {...input} />);
	const audio = [1, 2, 3, 4].map((id) =>
		screen.getByLabelText(`Person ${id} audio`),
	);
	await user.click(pin('Person 0'));
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	await user.click(screen.getByRole('button', { name: 'Next tiles' }));
	for (const [index, element] of audio.entries())
		expect(screen.getByLabelText(`Person ${index + 1} audio`)).toBe(element);
	await user.click(unpin('Person 0'));
	await waitFor(() =>
		expect(screen.getByLabelText('Person 1 video')).toBeTruthy(),
	);
	expect(
		(screen.getByLabelText('Person 1 video') as HTMLVideoElement).muted,
	).toBe(true);
});
