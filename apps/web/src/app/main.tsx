import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { queryClient, trpc } from '@/common/api/trpc';
import { routeTree } from '../routeTree.gen';
import '../index.css';

const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
	context: { trpc, queryClient },
	defaultNotFoundComponent: () => <p>Page not found.</p>,
	defaultErrorComponent: ({ error, reset }) => (
		<div role="alert">
			<p>{error instanceof Error ? error.message : 'Something went wrong.'}</p>
			<button type="button" onClick={reset}>
				Try again
			</button>
		</div>
	),
	Wrap: function WrapComponent({ children }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	},
});

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById('root');
if (!rootElement) {
	throw new Error('Root element not found');
}

createRoot(rootElement).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
