import { createFileRoute } from '@tanstack/react-router';
import MeetingPage from '@/domain/meeting/pages/MeetingPage';

export const Route = createFileRoute('/')({
	component: MeetingPage,
});
