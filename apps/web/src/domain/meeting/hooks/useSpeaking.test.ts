import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSpeaking } from './useSpeaking';

let level = 0;
const source = { connect: vi.fn(), disconnect: vi.fn() };
const analyser = {
	fftSize: 512,
	disconnect: vi.fn(),
	getFloatTimeDomainData: (samples: Float32Array) => samples.fill(level),
};
const close = vi.fn().mockResolvedValue(undefined);
class FakeAudioContext {
	state = 'running';
	createMediaStreamSource() {
		return source;
	}
	createAnalyser() {
		return analyser;
	}
	close = close;
}
class FakeStream {
	getAudioTracks() {
		return [{ enabled: true, readyState: 'live' }];
	}
}

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
	level = 0;
});

it('shows actual voice activity and returns to quiet after speech ends', () => {
	vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
	vi.stubGlobal('AudioContext', FakeAudioContext);
	vi.stubGlobal('MediaStream', FakeStream);
	const stream = new FakeStream() as unknown as MediaStream;
	const { result, rerender, unmount } = renderHook(
		({ enabled }) => useSpeaking(stream, enabled),
		{ initialProps: { enabled: true } },
	);
	expect(result.current).toBe(false);
	level = 0.06;
	act(() => {
		vi.advanceTimersByTime(100);
	});
	expect(result.current).toBe(true);
	level = 0;
	act(() => {
		vi.advanceTimersByTime(400);
	});
	expect(result.current).toBe(false);
	level = 0.1;
	act(() => {
		vi.advanceTimersByTime(100);
	});
	expect(result.current).toBe(true);
	rerender({ enabled: false });
	expect(result.current).toBe(false);
	expect(close).toHaveBeenCalledTimes(1);
	expect(source.disconnect).toHaveBeenCalledTimes(1);
	unmount();
	expect(vi.getTimerCount()).toBe(0);
});
