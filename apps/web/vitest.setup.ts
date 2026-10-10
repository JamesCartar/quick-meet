import { vi } from 'vitest';

// jsdom does not implement the browser observer used by Radix components.
vi.stubGlobal(
	'ResizeObserver',
	class {
		observe = vi.fn();
		unobserve = vi.fn();
		disconnect = vi.fn();
	},
);
