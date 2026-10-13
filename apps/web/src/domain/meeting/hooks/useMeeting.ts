import type { MediaState, Participant } from '@meet/contracts/meeting';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveDisplayName } from '../lib/display-name';
import { getMeetingError } from '../lib/media';
import { meetingService } from '../services';
import { useLocalMedia } from './useLocalMedia';
import { useMeetingPresence } from './useMeetingPresence';
import { usePeerConnections } from './usePeerConnections';
import { useScreenShare } from './useScreenShare';

export function useMeeting() {
	const [session, setSession] = useState<{
		participant: Participant;
		serverTime: number;
	} | null>(null);
	const [status, setStatus] = useState<'idle' | 'joining' | 'joined' | 'left'>(
		'idle',
	);
	const local = useLocalMedia(status !== 'joined');
	const screen = useScreenShare();
	const joinMutation = meetingService.useJoinMeeting();
	const renameMutation = meetingService.useRenameParticipant();
	const [error, setError] = useState<string | null>(null);
	const sessionId = useRef<string | null>(null);
	const joinVersion = useRef(0);
	const joining = useRef(false);

	const leave = useCallback(async () => {
		joinVersion.current++;
		const id = sessionId.current;
		sessionId.current = null;
		screen.stop();
		local.stop();
		setSession(null);
		setStatus('left');
		if (id) {
			try {
				await meetingService.leave({ id });
			} catch {
				setError(
					'You left the call. Your presence will clear automatically in about a minute.',
				);
			}
		}
	}, [local.stop, screen.stop]);

	const onExpired = useCallback(
		(message: string) => {
			void leave().then(() => setError(message));
		},
		[leave],
	);

	const presence = useMeetingPresence(
		session,
		local.media,
		onExpired,
		screen.sharing,
	);
	const participants = useMemo(() => {
		if (!session) return presence.participants;
		const self = {
			...session.participant,
			...local.media,
			screenSharing: screen.sharing,
		};
		return [
			self,
			...presence.participants.filter(
				(participant) => participant.id !== self.id,
			),
		];
	}, [session, presence.participants, local.media, screen.sharing]);
	const peers = usePeerConnections(
		session?.participant.id,
		local.stream,
		participants,
		local.revision,
		screen.stream,
		screen.revision,
	);

	const join = async (displayName: string, options: MediaState) => {
		if (joining.current || sessionId.current) return;
		joining.current = true;
		const version = ++joinVersion.current;
		const id = crypto.randomUUID();
		setStatus('joining');
		setError(null);
		try {
			const stream = await local.prepare(options);
			if (version !== joinVersion.current) return;
			const joined = await joinMutation.mutateAsync({
				id,
				displayName,
				microphoneEnabled: stream
					.getAudioTracks()
					.some((track) => track.readyState === 'live'),
				cameraEnabled: stream
					.getVideoTracks()
					.some((track) => track.readyState === 'live'),
			});
			if (version !== joinVersion.current) {
				await meetingService.leave({ id });
				return;
			}
			sessionId.current = id;
			setSession(joined);
			setStatus('joined');
			saveDisplayName(joined.participant.displayName);
		} catch (failure) {
			if (version === joinVersion.current) {
				local.stop();
				setStatus('idle');
				setError(getMeetingError(failure));
			}
			// Also clean up if a join succeeded on the server but its response was lost.
			void meetingService.leave({ id }).catch(() => {});
		} finally {
			joining.current = false;
		}
	};

	const rename = async (displayName: string) => {
		const id = sessionId.current;
		if (!id) return;
		const result = await renameMutation.mutateAsync({ id, displayName });
		if (sessionId.current !== id) return;
		setSession(result);
		saveDisplayName(result.participant.displayName);
	};

	useEffect(() => {
		const onPageHide = () => {
			const id = sessionId.current;
			if (id) meetingService.leaveOnPageHide(id);
			void leave();
		};
		window.addEventListener('pagehide', onPageHide);
		return () => {
			window.removeEventListener('pagehide', onPageHide);
			joinVersion.current++;
			const id = sessionId.current;
			sessionId.current = null;
			if (id) void meetingService.leave({ id }).catch(() => {});
		};
	}, [leave]);

	return {
		status,
		error,
		join,
		leave,
		rename,
		participants,
		selfId: session?.participant.id,
		localStream: local.stream,
		media: local.media,
		mediaBusy: local.busy,
		mediaRevision: local.revision,
		toggleMedia: local.toggle,
		devicePreferences: local.devicePreferences,
		availableDevices: local.availableDevices,
		selectDevice: local.selectDevice,
		screenSharing: screen.sharing,
		screenShareBusy: screen.busy,
		screenShareSupported: screen.supported,
		toggleScreenShare: async () => {
			if (sessionId.current) await screen.toggle();
		},
		localScreenStream: screen.stream,
		screenRevision: screen.revision,
		remoteScreenStreams: peers.screenStreams,
		remoteStreams: peers.streams,
		connectionStates: peers.states,
		retryPeer: peers.retry,
		connected: presence.connected,
		warning: screen.error ?? local.error ?? peers.error ?? presence.error,
		warningVersion: local.warningVersion + screen.warningVersion,
	};
}
