import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import type { AppRouter } from 'server/types';

export const queryClient = new QueryClient();

export const serverUrl = (
	import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8787'
).replace(/\/+$/, '');

export const trpcClient = createTRPCClient<AppRouter>({
	links: [httpBatchLink({ url: `${serverUrl}/trpc` })],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
