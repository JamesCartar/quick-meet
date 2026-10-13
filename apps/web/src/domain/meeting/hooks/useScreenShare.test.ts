import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useScreenShare } from './useScreenShare';

class FakeStream {
	tracks: MediaStreamTrack[] = [];
	getTracks() {
		return [...this.tracks];
	}
	getVideoTracks() {
		return this.tracks.filter((track) => track.kind === 'video');
	}
	addTrack(track: MediaStreamTrack) {
		this.tracks.push(track);
	}
	removeTrack(track: MediaStreamTrack) {
		this.tracks = this.tracks.filter((item) => item !== track);
	}
}
function capture() {
	const track = Object.assign(new EventTarget(), {
		kind: 'video',
		readyState: 'live',
		contentHint: '',
		stop: vi.fn(),
	}) as unknown as MediaStreamTrack;
	const stream = new MediaStream();
	stream.addTrack(track);
	return { track, stream };
}
const getDisplayMedia = vi.fn();
beforeEach(() => {
	getDisplayMedia.mockReset();
	vi.stubGlobal('MediaStream', FakeStream);
	vi.stubGlobal('navigator', { mediaDevices: { getDisplayMedia } });
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

it('captures a separate video-only stream and handles the browser stop action', async () => {
	const { track, stream } = capture();
	getDisplayMedia.mockResolvedValue(stream);
	const { result } = renderHook(useScreenShare);
	const original = result.current.stream;
	await act(() => result.current.toggle());
	expect(getDisplayMedia).toHaveBeenCalledWith(
		expect.objectContaining({ audio: false }),
	);
	expect(result.current.sharing).toBe(true);
	expect(result.current.stream).toBe(original);
	expect(original.getVideoTracks()).toEqual([track]);
	act(() => track.dispatchEvent(new Event('ended')));
	expect(result.current.sharing).toBe(false);
	expect(original.getTracks()).toEqual([]);
	expect(track.stop).toHaveBeenCalledOnce();
});

it('stops sharing explicitly and releases capture on unmount', async () => {
	const first = capture();
	const second = capture();
	getDisplayMedia
		.mockResolvedValueOnce(first.stream)
		.mockResolvedValueOnce(second.stream);
	const { result, unmount } = renderHook(useScreenShare);
	await act(() => result.current.toggle());
	await act(() => result.current.toggle());
	expect(first.track.stop).toHaveBeenCalledOnce();
	expect(result.current.sharing).toBe(false);
	await act(() => result.current.toggle());
	unmount();
	expect(second.track.stop).toHaveBeenCalledOnce();
});

it('discards a pending capture after leaving and prevents duplicate pickers', async () => {
	const captured = capture();
	let resolve!: (stream: MediaStream) => void;
	getDisplayMedia.mockReturnValue(
		new Promise<MediaStream>((done) => {
			resolve = done;
		}),
	);
	const { result } = renderHook(useScreenShare);
	let request!: Promise<void>;
	act(() => {
		request = result.current.toggle();
	});
	await act(() => result.current.toggle());
	expect(getDisplayMedia).toHaveBeenCalledOnce();
	act(() => result.current.stop());
	await act(async () => {
		resolve(captured.stream);
		await request;
	});
	expect(captured.track.stop).toHaveBeenCalledOnce();
	expect(result.current.sharing).toBe(false);
	expect(result.current.busy).toBe(false);
});

it('treats picker cancellation normally and reports capture failures', async () => {
	getDisplayMedia
		.mockRejectedValueOnce(new DOMException('Cancelled', 'NotAllowedError'))
		.mockRejectedValueOnce(
			new DOMException('Capture failed', 'NotReadableError'),
		);
	const { result } = renderHook(useScreenShare);
	await act(() => result.current.toggle());
	expect(result.current.error).toBeNull();
	expect(result.current.sharing).toBe(false);
	await act(() => result.current.toggle());
	expect(result.current.error).toContain('Could not share your screen');
	expect(result.current.busy).toBe(false);
});

it('does not attempt capture in an unsupported browser', async () => {
	vi.stubGlobal('navigator', { mediaDevices: {} });
	const { result } = renderHook(useScreenShare);
	expect(result.current.supported).toBe(false);
	await act(() => result.current.toggle());
	expect(getDisplayMedia).not.toHaveBeenCalled();
	expect(result.current.error).toContain('not supported');
});
