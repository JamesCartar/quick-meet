import type {
	Participant,
	Signal,
	SignalPayload,
} from '@meet/contracts/meeting';

type MeshCallbacks = {
	sendSignal: (recipientId: string, payload: SignalPayload) => Promise<unknown>;
	onStream: (id: string, stream: MediaStream | null) => void;
	onConnectionState: (id: string, state: RTCPeerConnectionState) => void;
	onError: (message: string) => void;
};

type Peer = {
	connection: RTCPeerConnection;
	stream: MediaStream;
	audioSender: RTCRtpSender | null;
	videoSender: RTCRtpSender | null;
	candidates: RTCIceCandidateInit[];
	work: Promise<void>;
	outgoing: Promise<void>;
	restartTimer: ReturnType<typeof setTimeout> | undefined;
	restarts: number;
};

export class MeetingMesh {
	private readonly peers = new Map<string, Peer>();
	private closed = false;

	constructor(
		private readonly localId: string,
		private readonly localStream: MediaStream,
		private readonly callbacks: MeshCallbacks,
		private readonly turnServers: RTCIceServer[] = [],
	) {}

	reconcile(participants: Participant[]) {
		const ids = new Set(participants.map((participant) => participant.id));
		for (const id of this.peers.keys()) if (!ids.has(id)) this.removePeer(id);
		for (const participant of participants) {
			if (participant.id === this.localId || this.peers.has(participant.id))
				continue;
			const peer = this.createPeer(participant.id);
			// Exactly one side offers, so simultaneous joins do not cause SDP glare.
			if (this.localId < participant.id) {
				void this.enqueue(peer, () => this.offer(participant.id, peer)).catch(
					() => {},
				);
			}
		}
	}

	async receive(signal: Signal) {
		if (this.closed || signal.senderId === this.localId) return;
		const peer =
			this.peers.get(signal.senderId) ?? this.createPeer(signal.senderId);
		await this.enqueue(peer, async () => {
			const payload = signal.payload;
			if (payload.type === 'candidate') {
				if (this.matchesRemoteDescription(peer, payload.candidate)) {
					await peer.connection.addIceCandidate(payload.candidate);
				} else if (peer.candidates.length < 128) {
					peer.candidates.push(payload.candidate);
				}
			} else if (payload.type === 'offer') {
				if (signal.senderId > this.localId) return;
				await peer.connection.setRemoteDescription({
					type: 'offer',
					sdp: payload.sdp,
				});
				await this.flushCandidates(peer);
				await this.configureTracks(peer);
				const answer = await peer.connection.createAnswer();
				await peer.connection.setLocalDescription(answer);
				await this.send(signal.senderId, peer, {
					type: 'answer',
					sdp: answer.sdp ?? '',
				});
			} else if (payload.type === 'answer') {
				if (peer.connection.signalingState !== 'have-local-offer') return;
				await peer.connection.setRemoteDescription({
					type: 'answer',
					sdp: payload.sdp,
				});
				await this.flushCandidates(peer);
			} else if (this.localId < signal.senderId) {
				await this.offer(signal.senderId, peer, true);
			}
		});
	}

	async syncLocalTracks() {
		const audio =
			this.localStream
				.getAudioTracks()
				.find((track) => track.readyState === 'live') ?? null;
		const video =
			this.localStream
				.getVideoTracks()
				.find((track) => track.readyState === 'live') ?? null;
		await Promise.all(
			[...this.peers.values()].map(async (peer) => {
				await peer.audioSender?.replaceTrack(audio);
				await peer.videoSender?.replaceTrack(video);
			}),
		);
	}

	retry(id: string) {
		const peer = this.peers.get(id);
		if (!peer || this.closed) return;
		peer.restarts++;
		void this.enqueue(peer, () =>
			this.localId < id
				? this.offer(id, peer, true)
				: this.send(id, peer, { type: 'request-offer' }),
		).catch(() => {});
	}

	close() {
		this.closed = true;
		for (const id of this.peers.keys()) this.removePeer(id);
	}

	private createPeer(id: string) {
		const connection = new RTCPeerConnection({
			iceServers: [
				{
					urls: [
						'stun:stun.l.google.com:19302',
						'stun:stun1.l.google.com:19302',
					],
				},
				...this.turnServers,
			],
		});
		const peer: Peer = {
			connection,
			audioSender: null,
			videoSender: null,
			stream: new MediaStream(),
			candidates: [],
			work: Promise.resolve(),
			outgoing: Promise.resolve(),
			restartTimer: undefined,
			restarts: 0,
		};
		this.peers.set(id, peer);
		this.callbacks.onConnectionState(id, 'connecting');
		connection.ontrack = (event) => {
			if (this.closed) return;
			if (!peer.stream.getTracks().some((track) => track.id === event.track.id))
				peer.stream.addTrack(event.track);
			this.callbacks.onStream(id, peer.stream);
		};
		connection.onicecandidate = (event) => {
			if (!event.candidate || this.closed) return;
			const candidate = event.candidate;
			void this.send(id, peer, {
				type: 'candidate',
				candidate: {
					candidate: candidate.candidate,
					sdpMid: candidate.sdpMid,
					sdpMLineIndex: candidate.sdpMLineIndex,
					usernameFragment: candidate.usernameFragment,
				},
			}).catch(() => {});
		};
		connection.onconnectionstatechange = () => {
			if (this.closed) return;
			const state = connection.connectionState;
			this.callbacks.onConnectionState(id, state);
			if (state === 'connected') {
				clearTimeout(peer.restartTimer);
				peer.restartTimer = undefined;
				peer.restarts = 0;
			}
			if (
				(state === 'disconnected' || state === 'failed') &&
				!peer.restartTimer &&
				peer.restarts < 2
			) {
				peer.restartTimer = setTimeout(
					() => {
						peer.restartTimer = undefined;
						this.retry(id);
					},
					state === 'failed' ? 1000 : 8000,
				);
			}
		};
		return peer;
	}

	private async offer(id: string, peer: Peer, restart = false) {
		if (this.closed || peer.connection.signalingState !== 'stable') return;
		await this.configureTracks(peer);
		const offer = await peer.connection.createOffer({ iceRestart: restart });
		await peer.connection.setLocalDescription(offer);
		await this.send(id, peer, { type: 'offer', sdp: offer.sdp ?? '' });
	}

	private async configureTracks(peer: Peer) {
		// Answerers reuse the offer's transceivers; pre-creating them can leave
		// local tracks attached to unused senders and produce one-way media.
		for (const kind of ['audio', 'video'] as const) {
			const transceiver =
				peer.connection
					.getTransceivers()
					.find((item) => item.receiver.track.kind === kind) ??
				peer.connection.addTransceiver(kind, {
					direction: 'sendrecv',
					streams: [this.localStream],
				});
			transceiver.direction = 'sendrecv';
			transceiver.sender.setStreams(this.localStream);
			await transceiver.sender.replaceTrack(
				this.localStream
					.getTracks()
					.find(
						(track) => track.kind === kind && track.readyState === 'live',
					) ?? null,
			);
			peer[kind === 'audio' ? 'audioSender' : 'videoSender'] =
				transceiver.sender;
		}
	}

	private send(id: string, peer: Peer, payload: SignalPayload) {
		const outgoing = peer.outgoing.then(async () => {
			if (!this.closed && this.peers.get(id) === peer)
				await this.callbacks.sendSignal(id, payload);
		});
		peer.outgoing = outgoing.catch(() => {});
		return outgoing.catch((error: unknown) => {
			if (!this.closed && this.peers.has(id))
				this.callbacks.onError(
					'A connection message could not be sent. Check your network.',
				);
			throw error;
		});
	}

	private enqueue(peer: Peer, operation: () => Promise<void>) {
		const work = peer.work.then(async () => {
			if (!this.closed && peer.connection.signalingState !== 'closed')
				await operation();
		});
		peer.work = work.catch(() => {});
		return work.catch((error: unknown) => {
			if (!this.closed)
				this.callbacks.onError(
					'A video connection could not be established. Try reconnecting the participant.',
				);
			throw error;
		});
	}

	private matchesRemoteDescription(peer: Peer, candidate: RTCIceCandidateInit) {
		const description = peer.connection.remoteDescription;
		return (
			description &&
			(!candidate.usernameFragment ||
				description.sdp.includes(`a=ice-ufrag:${candidate.usernameFragment}`))
		);
	}

	private async flushCandidates(peer: Peer) {
		const candidates = peer.candidates;
		peer.candidates = [];
		for (const candidate of candidates) {
			if (this.matchesRemoteDescription(peer, candidate))
				await peer.connection.addIceCandidate(candidate);
		}
	}

	private removePeer(id: string) {
		const peer = this.peers.get(id);
		if (!peer) return;
		clearTimeout(peer.restartTimer);
		peer.connection.ontrack = null;
		peer.connection.onicecandidate = null;
		peer.connection.onconnectionstatechange = null;
		peer.connection.close();
		peer.stream.getTracks().forEach((track) => {
			track.stop();
		});
		this.peers.delete(id);
		this.callbacks.onStream(id, null);
		this.callbacks.onConnectionState(id, 'closed');
	}
}
