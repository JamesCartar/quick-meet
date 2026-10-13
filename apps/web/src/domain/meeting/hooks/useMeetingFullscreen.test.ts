import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useMeetingFullscreen } from './useMeetingFullscreen';

let element: Element | null;
let allowed: boolean;
const requestFullscreen = vi.fn();
const exitFullscreen = vi.fn();
function changeFullscreen(next: Element | null) {
	element = next;
	document.dispatchEvent(new Event('fullscreenchange'));
}
beforeEach(() => {
	element = null;
	allowed = true;
	Object.defineProperty(document, 'fullscreenElement', {
		configurable: true,
		get: () => element,
	});
	Object.defineProperty(document, 'fullscreenEnabled', {
		configurable: true,
		get: () => allowed,
	});
	Object.defineProperty(document.documentElement, 'requestFullscreen', {
		configurable: true,
		value: requestFullscreen,
	});
	Object.defineProperty(document, 'exitFullscreen', {
		configurable: true,
		value: exitFullscreen,
	});
	requestFullscreen
		.mockReset()
		.mockImplementation(async () => changeFullscreen(document.documentElement));
	exitFullscreen
		.mockReset()
		.mockImplementation(async () => changeFullscreen(null));
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	Reflect.deleteProperty(document.documentElement, 'requestFullscreen');
	Reflect.deleteProperty(document, 'exitFullscreen');
	Reflect.deleteProperty(document, 'fullscreenElement');
	Reflect.deleteProperty(document, 'fullscreenEnabled');
});

it('toggles fullscreen on and off while keeping the whole meeting document visible', async () => {
	const { result } = renderHook(() => useMeetingFullscreen(true));
	await act(() => result.current.toggle());
	expect(requestFullscreen).toHaveBeenCalledOnce();
	expect(result.current.fullscreen).toBe(true);
	await act(() => result.current.toggle());
	expect(exitFullscreen).toHaveBeenCalledOnce();
	expect(result.current.fullscreen).toBe(false);
});

it('updates state when the browser exits fullscreen with Escape', async () => {
	const { result } = renderHook(() => useMeetingFullscreen(true));
	await act(() => result.current.toggle());
	act(() => changeFullscreen(null));
	expect(result.current.fullscreen).toBe(false);
});

it('exits fullscreen when leaving the meeting', async () => {
	const { result, rerender } = renderHook(
		({ enabled }) => useMeetingFullscreen(enabled),
		{ initialProps: { enabled: true } },
	);
	await act(() => result.current.toggle());
	await act(async () => rerender({ enabled: false }));
	expect(exitFullscreen).toHaveBeenCalledOnce();
	await act(() => result.current.toggle());
	expect(requestFullscreen).toHaveBeenCalledOnce();
});

it('releases fullscreen on unmount', async () => {
	const { result, unmount } = renderHook(() => useMeetingFullscreen(true));
	await act(() => result.current.toggle());
	unmount();
	expect(exitFullscreen).toHaveBeenCalledOnce();
});

it('does not exit fullscreen it did not request', () => {
	element = document.documentElement;
	const { unmount } = renderHook(() => useMeetingFullscreen(true));
	unmount();
	expect(exitFullscreen).not.toHaveBeenCalled();
});

it('handles unsupported browsers and rejected fullscreen requests', async () => {
	allowed = false;
	const { result, rerender } = renderHook(() => useMeetingFullscreen(true));
	await act(() => result.current.toggle());
	expect(result.current.supported).toBe(false);
	expect(result.current.error).toContain('not supported');
	allowed = true;
	rerender();
	requestFullscreen.mockRejectedValueOnce(new Error('Denied'));
	await act(() => result.current.toggle());
	expect(result.current.error).toContain('Could not change fullscreen');
	expect(result.current.fullscreen).toBe(false);
});

it('ignores duplicate requests and exits a pending request if the meeting ends', async () => {
	let resolve!: () => void;
	requestFullscreen.mockImplementation(
		() =>
			new Promise<void>((done) => {
				resolve = done;
			}),
	);
	const { result, rerender } = renderHook(
		({ enabled }) => useMeetingFullscreen(enabled),
		{ initialProps: { enabled: true } },
	);
	let request!: Promise<void>;
	act(() => {
		request = result.current.toggle();
	});
	await act(() => result.current.toggle());
	expect(requestFullscreen).toHaveBeenCalledOnce();
	rerender({ enabled: false });
	await act(async () => {
		changeFullscreen(document.documentElement);
		resolve();
		await request;
	});
	expect(exitFullscreen).toHaveBeenCalledOnce();
});
