import { getApp, getApps, initializeApp } from 'firebase/app';
import type { DataSnapshot } from 'firebase/database';
import { getDatabase, onValue, ref } from 'firebase/database';

// Firebase web configuration is public; database rules control client access.
const firebaseConfig = {
	apiKey: 'AIzaSyDQRPm44TI4pN0TR6Un5YvbSaQ7_mdIDIM',
	authDomain: 'meet-8ee96.firebaseapp.com',
	databaseURL:
		'https://meet-8ee96-default-rtdb.asia-southeast1.firebasedatabase.app',
	projectId: 'meet-8ee96',
	storageBucket: 'meet-8ee96.firebasestorage.app',
	messagingSenderId: '476435853786',
	appId: '1:476435853786:web:9cfaa80996aff38d53d0e3',
};

const firebaseApp =
	getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const firebaseDatabase = getDatabase(firebaseApp);

export type MeetingReadPath = 'meeting/participants' | 'meeting/signaling';

export function subscribeToMeeting(
	path: MeetingReadPath,
	onChange: (snapshot: DataSnapshot) => void,
	onError: (error: Error) => void,
) {
	return onValue(ref(firebaseDatabase, path), onChange, onError);
}
