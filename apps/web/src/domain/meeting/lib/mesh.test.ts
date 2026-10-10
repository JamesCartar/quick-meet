import type { Signal } from '@meet/contracts/meeting';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MeetingMesh } from './mesh';

class FakeStream {
	tracks: MediaStreamTrack[] = [];
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
	ontrack = null;
	onicecandidate = null;
	onconnectionstatechange = null;
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
		onConnectionState: vi.fn(),
		onError: vi.fn(),
	};
}

beforeEach(() => {
	FakeConnection.instances = [];
	vi.stubGlobal('RTCPeerConnection', FakeConnection);
	vi.stubGlobal('MediaStream', FakeStream);
});
afterEach(() => vi.unstubAllGlobals());

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
	expect(connection.senders).toHaveLength(2);
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
	mesh.reconcile([participant(highId)]);
	expect(connection.close).toHaveBeenCalledTimes(1);
	expect(events.onStream).toHaveBeenCalledWith(lowId, null);
	mesh.close();
});
