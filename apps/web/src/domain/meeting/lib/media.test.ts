import { afterEach, expect, it, vi } from 'vitest';
import { requestPreviewMedia } from './media';
import { getMediaPreferences, saveMediaPreferences } from './media-preferences';

class FakeStream {
	constructor(private tracks: { kind: string }[] = []) {}
	getTracks() {
		return this.tracks;
	}
	getAudioTracks() {
		return this.tracks.filter((track) => track.kind === 'audio');
	}
	getVideoTracks() {
		return this.tracks.filter((track) => track.kind === 'video');
	}
	addTrack(track: { kind: string }) {
		this.tracks.push(track);
	}
}

afterEach(() => {
	vi.unstubAllGlobals();
	localStorage.clear();
});

it('uses an approved camera and microphone together', async () => {
	const stream = new FakeStream([{ kind: 'audio' }, { kind: 'video' }]);
	const getUserMedia = vi.fn().mockResolvedValue(stream);
	vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
	vi.stubGlobal('MediaStream', FakeStream);
	const result = await requestPreviewMedia({
		microphoneEnabled: true,
		cameraEnabled: true,
	});
	expect(result.stream).toBe(stream);
	expect(result.error).toBeNull();
	expect(getUserMedia).toHaveBeenCalledTimes(1);
});

it('keeps an available microphone when camera access is denied', async () => {
	const getUserMedia = vi
		.fn()
		.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
		.mockResolvedValueOnce(new FakeStream([{ kind: 'audio' }]))
		.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'));
	vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
	vi.stubGlobal('MediaStream', FakeStream);
	const result = await requestPreviewMedia({
		microphoneEnabled: true,
		cameraEnabled: true,
	});
	expect(result.media).toEqual({
		microphoneEnabled: true,
		cameraEnabled: false,
	});
	expect(result.error).toContain('Camera access was denied');
});

it('supports joining without devices when both permissions are denied', async () => {
	const getUserMedia = vi
		.fn()
		.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
	vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
	vi.stubGlobal('MediaStream', FakeStream);
	const result = await requestPreviewMedia({
		microphoneEnabled: true,
		cameraEnabled: true,
	});
	expect(result.media).toEqual({
		microphoneEnabled: false,
		cameraEnabled: false,
	});
	expect(result.stream.getTracks()).toHaveLength(0);
	expect(result.error).toContain('Microphone access was denied');
});

it('does not request device access when saved choices are both off', async () => {
	const getUserMedia = vi.fn();
	vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
	vi.stubGlobal('MediaStream', FakeStream);
	await requestPreviewMedia({ microphoneEnabled: false, cameraEnabled: false });
	expect(getUserMedia).not.toHaveBeenCalled();
});

it('validates and restores stored device preferences', () => {
	saveMediaPreferences({ microphoneEnabled: false, cameraEnabled: true });
	expect(getMediaPreferences()).toEqual({
		microphoneEnabled: false,
		cameraEnabled: true,
	});
	localStorage.setItem('meet-media-preferences', '{bad-json');
	expect(getMediaPreferences()).toEqual({
		microphoneEnabled: true,
		cameraEnabled: true,
	});
});
