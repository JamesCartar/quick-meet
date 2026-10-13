import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createJoinSound } from './join-sound';

function oscillator() {
	return {
		type: '',
		frequency: { setValueAtTime: vi.fn() },
		connect: vi.fn(),
		disconnect: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
		onended: null as (() => void) | null,
	};
}

function gain() {
	return {
		gain: {
			setValueAtTime: vi.fn(),
			linearRampToValueAtTime: vi.fn(),
			exponentialRampToValueAtTime: vi.fn(),
		},
		connect: vi.fn(),
		disconnect: vi.fn(),
	};
}

class FakeAudioContext {
	static instances: FakeAudioContext[] = [];
	state = 'suspended';
	currentTime = 10;
	destination = {};
	oscillators: ReturnType<typeof oscillator>[] = [];
	gains: ReturnType<typeof gain>[] = [];
	constructor() {
		FakeAudioContext.instances.push(this);
	}
	resume = vi.fn().mockImplementation(async () => {
		this.state = 'running';
	});
	close = vi.fn().mockResolvedValue(undefined);
	setSinkId = vi.fn().mockResolvedValue(undefined);
	createOscillator() {
		const node = oscillator();
		this.oscillators.push(node);
		return node;
	}
	createGain() {
		const node = gain();
		this.gains.push(node);
		return node;
	}
}

beforeEach(() => {
	FakeAudioContext.instances = [];
	vi.stubGlobal('AudioContext', FakeAudioContext);
});
afterEach(() => vi.unstubAllGlobals());

it('unlocks audio on Join and schedules a quiet two-note chime with cleanup', () => {
	const sound = createJoinSound();
	sound.play();
	expect(FakeAudioContext.instances).toHaveLength(0);
	sound.prepare();
	sound.prepare();
	const context = FakeAudioContext.instances[0];
	expect(FakeAudioContext.instances).toHaveLength(1);
	expect(context.resume).toHaveBeenCalledOnce();
	sound.play();
	expect(context.oscillators).toHaveLength(2);
	expect(context.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(
		660,
		10,
	);
	expect(context.oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(
		880,
		10.14,
	);
	expect(context.gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(
		0.14,
		10.015,
	);
	context.oscillators[0].onended?.();
	expect(context.oscillators[0].disconnect).toHaveBeenCalledOnce();
	expect(context.gains[0].disconnect).toHaveBeenCalledOnce();
	sound.play();
	expect(context.oscillators[2].start).toHaveBeenCalledWith(10.45);
	sound.close();
	sound.close();
	expect(context.close).toHaveBeenCalledOnce();
	sound.play();
	expect(context.oscillators).toHaveLength(4);
});

it('routes notifications to the selected speaker and falls back if it disappears', async () => {
	const sound = createJoinSound();
	sound.setOutput('speaker-2');
	sound.prepare();
	const context = FakeAudioContext.instances[0];
	expect(context.setSinkId).toHaveBeenCalledWith('speaker-2');
	context.setSinkId.mockRejectedValueOnce(new Error('Output unavailable'));
	sound.setOutput('missing-speaker');
	await vi.waitFor(() =>
		expect(context.setSinkId).toHaveBeenLastCalledWith(''),
	);
	sound.setOutput('default');
	expect(context.setSinkId).toHaveBeenLastCalledWith('');
	sound.close();
});

it('supports browsers without AudioContext output selection', () => {
	const sound = createJoinSound();
	sound.prepare();
	Reflect.deleteProperty(FakeAudioContext.instances[0], 'setSinkId');
	expect(() => sound.setOutput('speaker-2')).not.toThrow();
	expect(() => sound.play()).not.toThrow();
	sound.close();
});

it('does not queue delayed sounds while audio is blocked', () => {
	const sound = createJoinSound();
	sound.prepare();
	const context = FakeAudioContext.instances[0];
	context.state = 'suspended';
	sound.play();
	expect(context.oscillators).toHaveLength(0);
	sound.close();
});

it('gracefully handles unsupported or unavailable audio', () => {
	vi.stubGlobal('AudioContext', undefined);
	const sound = createJoinSound();
	expect(() => sound.prepare()).not.toThrow();
	expect(() => sound.play()).not.toThrow();
	vi.stubGlobal(
		'AudioContext',
		class {
			constructor() {
				throw new Error('Unavailable');
			}
		},
	);
	expect(() => sound.prepare()).not.toThrow();
	sound.close();
});
