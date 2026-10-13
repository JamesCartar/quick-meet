import type { Signal } from '@meet/contracts/meeting';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MeetingMesh } from './mesh';

class FakeStream {
	tracks: MediaStreamTrack[];
	constructor(tracks: MediaStreamTrack[] = []) {
		this.tracks = [...tracks];
	}
	getTracks() {
		return this.tracks;
	}
	getAudioTracks() {
		return this.tracks.filter((track) => track.kind === 'audio');
	}
	getVideoTracks() {
		return this.tracks.filter((track) => track.kind === 'video');
	}
	addTrack(track: MediaStreamTrack) {
		this.tracks.push(track);
	}
}

class FakeConnection {
	static instances: FakeConnection[] = [];
	signalingState = 'stable';
	connectionState = 'new';
	remoteDescription: RTCSessionDescriptionInit | null = null;
	localDescription: RTCSessionDescriptionInit | null = null;
	ontrack: ((event: RTCTrackEvent) => void) | null = null;
	onicecandidate = null;
	onconnectionstatechange: (() => void) | null = null;
	senders: {
		replaceTrack: ReturnType<typeof vi.fn>;
		setStreams: ReturnType<typeof vi.fn>;
	}[] = [];
	transceivers: {
		sender: FakeConnection['senders'][number];
		receiver: { track: { kind: string } };
		direction: string;
	}[] = [];
	constructor() {
		FakeConnection.instances.push(this);
	}
	addTransceiver(kind: string) {
		const sender = {
			replaceTrack: vi.fn().mockResolvedValue(undefined),
			setStreams: vi.fn(),
		};
		this.senders.push(sender);
		const transceiver = {
			sender,
			receiver: { track: { kind } },
			direction: 'sendrecv',
		};
		this.transceivers.push(transceiver);
		return transceiver;
	}
	getTransceivers() {
		return this.transceivers;
	}
	createOffer = vi
		.fn()
		.mockResolvedValue({ type: 'offer', sdp: 'a=ice-ufrag:test' });
	createAnswer = vi
		.fn()
		.mockResolvedValue({ type: 'answer', sdp: 'a=ice-ufrag:test' });
	setLocalDescription = vi
		.fn()
		.mockImplementation(async (description: RTCSessionDescriptionInit) => {
			this.localDescription = description;
			this.signalingState =
				description.type === 'offer' ? 'have-local-offer' : 'stable';
		});
	setRemoteDescription = vi
		.fn()
		.mockImplementation(async (description: RTCSessionDescriptionInit) => {
			this.remoteDescription = description;
			if (description.type === 'offer' && this.transceivers.length === 0) {
				this.addTransceiver('audio');
				this.addTransceiver('video');
				this.addTransceiver('video');
			}
			this.signalingState =
				description.type === 'offer' ? 'have-remote-offer' : 'stable';
		});
	addIceCandidate = vi.fn().mockResolvedValue(undefined);
	close = vi.fn().mockImplementation(() => {
		this.signalingState = 'closed';
	});
}

const lowId = '00000000-0000-4000-8000-000000000001';
const highId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
function participant(id: string) {
	return {
		id,
		displayName: id,
		joinedAt: 1,
		lastSeen: 1,
		microphoneEnabled: false,
		cameraEnabled: false,
	};
}
function signal(
	senderId: string,
	recipientId: string,
	payload: Signal['payload'],
) {
	return {
		id: crypto.randomUUID(),
		senderId,
		recipientId,
		payload,
		createdAt: Date.now(),
	};
}
function callbacks() {
	return {
		sendSignal: vi.fn().mockResolvedValue(undefined),
		onStream: vi.fn(),
		onScreenStream: vi.fn(),
		onConnectionState: vi.fn(),
		onError: vi.fn(),
	};
}

beforeEach(() => {
	FakeConnection.instances = [];
	vi.stubGlobal('RTCPeerConnection', FakeConnection);
	vi.stubGlobal('MediaStream', FakeStream);
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

it('only the lower ID offers and repeated presence snapshots do not create extra peers', async () => {
	const lowCallbacks = callbacks();
	const highCallbacks = callbacks();
	const low = new MeetingMesh(lowId, new MediaStream(), lowCallbacks);
	const high = new MeetingMesh(highId, new MediaStream(), highCallbacks);
	const participants = [participant(lowId), participant(highId)];
	low.reconcile(participants);
	low.reconcile(participants);
	high.reconcile(participants);
	await vi.waitFor(() =>
		expect(lowCallbacks.sendSignal).toHaveBeenCalledWith(highId, {
			type: 'offer',
			sdp: 'a=ice-ufrag:test',
		}),
	);
	expect(highCallbacks.sendSignal).not.toHaveBeenCalled();
	expect(FakeConnection.instances).toHaveLength(2);
	low.close();
	high.close();
});

it('buffers ICE until an offer is applied and answers afterward', async () => {
	const events = callbacks();
	const mesh = new MeetingMesh(highId, new MediaStream(), events);
	const candidate = {
		candidate: 'candidate',
		sdpMid: '0',
		sdpMLineIndex: 0,
		usernameFragment: 'test',
	};
	await mesh.receive(signal(lowId, highId, { type: 'candidate', candidate }));
	const connection = FakeConnection.instances[0];
	expect(connection.addIceCandidate).not.toHaveBeenCalled();
	expect(connection.senders).toHaveLength(0);
	await mesh.receive(
		signal(lowId, highId, { type: 'offer', sdp: 'a=ice-ufrag:test' }),
	);
	expect(connection.addIceCandidate).toHaveBeenCalledWith(candidate);
	expect(connection.senders).toHaveLength(3);
	expect(events.sendSignal).toHaveBeenCalledWith(lowId, {
		type: 'answer',
		sdp: 'a=ice-ufrag:test',
	});
	mesh.close();
});

it('replaces tracks without creating another connection and closes departed peers', async () => {
	const events = callbacks();
	const mesh = new MeetingMesh(highId, new MediaStream(), events);
	mesh.reconcile([participant(lowId), participant(highId)]);
	const connection = FakeConnection.instances[0];
	await mesh.receive(
		signal(lowId, highId, { type: 'offer', sdp: 'a=ice-ufrag:test' }),
	);
	await mesh.syncLocalTracks();
	expect(connection.senders[0].replaceTrack).toHaveBeenCalledWith(null);
	expect(connection.senders[1].replaceTrack).toHaveBeenCalledWith(null);
	expect(connection.senders[2].replaceTrack).toHaveBeenCalledWith(null);
	mesh.reconcile([participant(highId)]);
	expect(connection.close).toHaveBeenCalledTimes(1);
	expect(events.onStream).toHaveBeenCalledWith(lowId, null);
	expect(events.onScreenStream).toHaveBeenCalledWith(lowId, null);
	mesh.close();
});

it('sends camera and screen independently without renegotiating, including late joiners', async () => {
	const events = callbacks();
	const local = new MediaStream();
	const screen = new MediaStream();
	const cameraTrack = {
		id: 'camera',
		kind: 'video',
		readyState: 'live',
	} as MediaStreamTrack;
	const screenTrack = {
		id: 'screen',
		kind: 'video',
		readyState: 'live',
	} as MediaStreamTrack;
	local.addTrack(cameraTrack);
	const mesh = new MeetingMesh(highId, local, events, [], screen);
	await mesh.receive(
		signal(lowId, highId, { type: 'offer', sdp: 'a=ice-ufrag:test' }),
	);
	const connection = FakeConnection.instances[0];
	screen.addTrack(screenTrack);
	await mesh.syncLocalTracks();
	expect(connection.senders[1].replaceTrack).toHaveBeenLastCalledWith(
		cameraTrack,
	);
	expect(connection.senders[2].replaceTrack).toHaveBeenLastCalledWith(
		screenTrack,
	);
	expect(connection.createOffer).not.toHaveBeenCalled();

	const lateId = '00000000-0000-4000-8000-000000000002';
	await mesh.receive(
		signal(lateId, highId, { type: 'offer', sdp: 'a=ice-ufrag:test' }),
	);
	expect(
		FakeConnection.instances[1].senders[2].replaceTrack,
	).toHaveBeenLastCalledWith(screenTrack);
	// Ending the screen track leaves the camera sender untouched.
	Object.assign(screenTrack, { readyState: 'ended' });
	await mesh.syncLocalTracks();
	expect(connection.senders[2].replaceTrack).toHaveBeenLastCalledWith(null);
	expect(connection.senders[1].replaceTrack).toHaveBeenLastCalledWith(
		cameraTrack,
	);
	mesh.close();
});

it('routes incoming screen tracks into a separate stream and cleans up both streams', async () => {
	const events = callbacks();
	const mesh = new MeetingMesh(highId, new MediaStream(), events);
	await mesh.receive(
		signal(lowId, highId, { type: 'offer', sdp: 'a=ice-ufrag:test' }),
	);
	const connection = FakeConnection.instances[0];
	const camera = {
		id: 'camera',
		kind: 'video',
		stop: vi.fn(),
	} as unknown as MediaStreamTrack;
	const screen = {
		id: 'screen',
		kind: 'video',
		stop: vi.fn(),
	} as unknown as MediaStreamTrack;
	connection.ontrack?.({
		track: camera,
		transceiver: connection.transceivers[1],
	} as unknown as RTCTrackEvent);
	connection.ontrack?.({
		track: screen,
		transceiver: connection.transceivers[2],
	} as unknown as RTCTrackEvent);
	const cameraStream = events.onStream.mock.calls[0][1] as MediaStream;
	const screenStream = events.onScreenStream.mock.calls[0][1] as MediaStream;
	expect(cameraStream.getTracks()).toEqual([camera]);
	expect(screenStream.getTracks()).toEqual([screen]);
	mesh.close();
	expect(camera.stop).toHaveBeenCalledOnce();
	expect(screen.stop).toHaveBeenCalledOnce();
});

it('publishes a fresh stream when audio arrives after video', async () => {
	const events = callbacks();
	const mesh = new MeetingMesh(highId, new MediaStream(), events);
	await mesh.receive(
		signal(lowId, highId, { type: 'offer', sdp: 'a=ice-ufrag:test' }),
	);
	const connection = FakeConnection.instances[0];
	const camera = {
		id: 'camera',
		kind: 'video',
		stop: vi.fn(),
	} as unknown as MediaStreamTrack;
	const audio = {
		id: 'audio',
		kind: 'audio',
		stop: vi.fn(),
	} as unknown as MediaStreamTrack;
	connection.ontrack?.({
		track: camera,
		transceiver: connection.transceivers[1],
	} as unknown as RTCTrackEvent);
	connection.ontrack?.({
		track: audio,
		transceiver: connection.transceivers[0],
	} as unknown as RTCTrackEvent);
	const first = events.onStream.mock.calls[0][1] as MediaStream;
	const second = events.onStream.mock.calls[1][1] as MediaStream;
	expect(second).not.toBe(first);
	expect(first.getTracks()).toEqual([camera]);
	expect(second.getTracks()).toEqual([camera, audio]);
	mesh.close();
});

it('recovers stalled initial negotiation and exposes failure after bounded retries', async () => {
	vi.useFakeTimers();
	const events = callbacks();
	const mesh = new MeetingMesh(lowId, new MediaStream(), events);
	mesh.reconcile([participant(lowId), participant(highId)]);
	await vi.advanceTimersByTimeAsync(20_000);
	const connection = FakeConnection.instances[0];
	// No answer has arrived: resend the pending offer instead of doing nothing.
	expect(events.sendSignal).toHaveBeenCalledTimes(2);
	expect(connection.createOffer).toHaveBeenCalledTimes(1);
	await vi.advanceTimersByTimeAsync(40_000);
	expect(events.sendSignal).toHaveBeenCalledTimes(3);
	expect(events.onConnectionState).toHaveBeenLastCalledWith(highId, 'failed');
	expect(events.onError).toHaveBeenCalledOnce();
	mesh.close();
});

it('restarts stalled ICE after an answer and cancels recovery once connected', async () => {
	vi.useFakeTimers();
	const events = callbacks();
	const mesh = new MeetingMesh(lowId, new MediaStream(), events);
	mesh.reconcile([participant(lowId), participant(highId)]);
	await vi.advanceTimersByTimeAsync(0);
	await mesh.receive(
		signal(highId, lowId, { type: 'answer', sdp: 'a=ice-ufrag:test' }),
	);
	await vi.advanceTimersByTimeAsync(20_000);
	const connection = FakeConnection.instances[0];
	expect(connection.createOffer).toHaveBeenLastCalledWith({ iceRestart: true });
	connection.connectionState = 'connected';
	connection.onconnectionstatechange?.();
	await vi.advanceTimersByTimeAsync(60_000);
	expect(connection.createOffer).toHaveBeenCalledTimes(2);
	expect(events.onError).not.toHaveBeenCalled();
	mesh.close();
});
