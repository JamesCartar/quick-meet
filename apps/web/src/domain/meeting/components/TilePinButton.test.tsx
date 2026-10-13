import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { TilePinButton } from './TilePinButton';

afterEach(cleanup);

it('supports keyboard pinning and keeps an accessible unpin control visible', async () => {
	const user = userEvent.setup();
	const onToggle = vi.fn();
	const { rerender } = render(
		<TilePinButton label="Alex's camera" pinned={false} onToggle={onToggle} />,
	);
	const button = screen.getByRole('button', { name: "Pin Alex's camera" });
	expect(button.getAttribute('aria-pressed')).toBe('false');
	expect(button.className).toContain('group-hover/tile:opacity-100');
	expect(button.className).toContain('group-focus-within/tile:opacity-100');
	expect(button.className).toContain('[@media(hover:none)]:opacity-100');
	await user.tab();
	expect(document.activeElement).toBe(button);
	await user.keyboard('{Enter}');
	expect(onToggle).toHaveBeenCalledOnce();
	rerender(<TilePinButton label="Alex's camera" pinned onToggle={onToggle} />);
	const unpin = screen.getByRole('button', { name: "Unpin Alex's camera" });
	expect(unpin.getAttribute('aria-pressed')).toBe('true');
	expect(unpin.classList.contains('opacity-100')).toBe(true);
	await user.click(unpin);
	expect(onToggle).toHaveBeenCalledTimes(2);
});
