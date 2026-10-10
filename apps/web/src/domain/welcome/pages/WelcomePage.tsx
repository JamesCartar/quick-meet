import { useState } from 'react';
import reactLogo from '@/assets/react.svg';
import viteLogo from '@/assets/vite.svg';
import { Button } from '@/shared/components/ui/button';

function WelcomePage() {
	const [count, setCount] = useState(0);

	return (
		<main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-6 py-12 text-center text-foreground">
			<div className="flex items-center gap-8">
				<a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
					<img src={viteLogo} className="size-24" alt="Vite logo" />
				</a>
				<a href="https://react.dev" target="_blank" rel="noopener noreferrer">
					<img src={reactLogo} className="size-24" alt="React logo" />
				</a>
			</div>
			<h1 className="text-5xl font-semibold tracking-tight">Vite + React</h1>
			<div className="space-y-6">
				<Button
					variant="secondary"
					onClick={() => setCount((value) => value + 1)}
				>
					count is {count}
				</Button>
				<p className="text-sm leading-7">
					Edit{' '}
					<code className="rounded bg-muted px-2 py-1 font-mono text-sm text-foreground">
						src/domain/welcome/pages/WelcomePage.tsx
					</code>{' '}
					and save to test HMR
				</p>
			</div>
			<p className="text-sm text-muted-foreground">
				Click on the Vite and React logos to learn more
			</p>
		</main>
	);
}

export default WelcomePage;
