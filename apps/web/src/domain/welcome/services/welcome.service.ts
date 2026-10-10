import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/common/api/trpc';

class WelcomeService {
	getWelcomeQueryOptions = () => trpc.welcome.get.queryOptions();

	useGetWelcome = () => useQuery(this.getWelcomeQueryOptions());
}

export const welcomeService = new WelcomeService();
