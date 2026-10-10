import type { Participant } from '@meet/contracts/meeting';
import { useEffect, useRef, useState } from 'react';
import { MeetingMesh } from '../lib/mesh';
import { meetingService } from '../services';

export function usePeerConnections(
	id: string | undefined,
	stream: MediaStream | null,
	participants: Participant[],
	mediaRevision: number,
) {
	const meshRef = useRef<MeetingMesh | null>(null);
	const [streams, setStreams] = useState<Record<string, MediaStream>>({});
	const [states, setStates] = useState<Record<string, RTCPeerConnectionState>>(
		{},
	);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setStreams({});
		setStates({});
		setError(null);
		if (!id || !stream) return;
		let active = true;
		const mesh = new MeetingMesh(id, stream, {
			sendSignal: (recipientId, payload) =>
				meetingService.sendSignal(id, recipientId, payload),
			onStream: (peerId, remoteStream) => {
				if (!active) return;
				setStreams((current) => {
					const next = { ...current };
					if (remoteStream) next[peerId] = remoteStream;
					else delete next[peerId];
					return next;
				});
			},
			onConnectionState: (peerId, state) => {
				if (active) setStates((current) => ({ ...current, [peerId]: state }));
			},
			onError: (message) => {
				if (active) setError(message);
			},
		});
		meshRef.current = mesh;
		const seen = new Set<string>();
		const unsubscribe = meetingService.subscribeToSignals(
			id,
			(signal) => {
				if (seen.has(signal.id)) return;
				seen.add(signal.id);
				void mesh
					.receive(signal)
					.then(() => meetingService.acknowledgeSignal(id, signal.id))
					.catch(() => {
						if (active)
							setError(
								'A participant connection needs attention. Try reconnecting.',
							);
					});
			},
			(failure) => {
				if (active) setError(failure.message);
			},
		);
		return () => {
			active = false;
			unsubscribe();
			mesh.close();
			meshRef.current = null;
		};
	}, [id, stream]);

	useEffect(() => {
		meshRef.current?.reconcile(participants);
	}, [participants]);
	useEffect(() => {
		void mediaRevision;
		void meshRef.current
			?.syncLocalTracks()
			.catch(() =>
				setError('Could not update your camera or microphone connection.'),
			);
	}, [mediaRevision]);

	const retry = (peerId: string) => {
		setError(null);
		meshRef.current?.retry(peerId);
	};
	return { streams, states, error, retry };
}
