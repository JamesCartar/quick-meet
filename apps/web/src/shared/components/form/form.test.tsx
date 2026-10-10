import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { useAppForm } from './index';

const schema = z.object({
	name: z.string().min(3, 'Name must have at least three characters.'),
	description: z.string(),
	enabled: z.boolean(),
});
type Values = z.infer<typeof schema>;

function TestForm({
	onSubmit,
}: {
	onSubmit: (value: Values) => void | Promise<void>;
}) {
	const form = useAppForm({
		defaultValues: { name: '', description: '', enabled: false },
		validators: { onChange: schema, onSubmit: schema },
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
		>
			<form.AppField name="name">
				{(field) => <field.TextField label="Name" />}
			</form.AppField>
			<form.AppField name="description">
				{(field) => <field.TextArea label="Description" />}
			</form.AppField>
			<form.AppField name="enabled">
				{(field) => <field.CheckboxField label="Enabled" />}
			</form.AppField>
			<form.AppForm>
				<form.SubmitButton label="Save" loadingLabel="Saving..." />
			</form.AppForm>
		</form>
	);
}

afterEach(cleanup);

it('connects generated shadcn fields to TanStack Form and submits values', async () => {
	const submit = vi.fn();
	const user = userEvent.setup();
	render(<TestForm onSubmit={submit} />);
	expect(
		screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled'),
	).toBe(true);
	await user.type(screen.getByLabelText('Name'), 'Alice');
	await user.type(screen.getByLabelText('Description'), 'Team meeting');
	await user.click(screen.getByRole('checkbox', { name: 'Enabled' }));
	await user.click(screen.getByRole('button', { name: 'Save' }));
	expect(submit).toHaveBeenCalledWith({
		name: 'Alice',
		description: 'Team meeting',
		enabled: true,
	});
});

it('associates validation errors with the input and clears them after correction', async () => {
	const user = userEvent.setup();
	render(<TestForm onSubmit={vi.fn()} />);
	const input = screen.getByLabelText('Name');
	await user.type(input, 'A');
	await user.tab();
	expect(screen.getByRole('alert').textContent).toBe(
		'Name must have at least three characters.',
	);
	expect(input.getAttribute('aria-invalid')).toBe('true');
	expect(input.getAttribute('aria-describedby')).toBe(
		screen.getByRole('alert').id,
	);
	await user.type(input, 'lice');
	expect(screen.queryByRole('alert')).toBeNull();
	expect(input.getAttribute('aria-invalid')).toBe('false');
});

it('disables the submit button while an async submission is pending', async () => {
	let finish: (() => void) | undefined;
	const pending = new Promise<void>((resolve) => {
		finish = resolve;
	});
	const user = userEvent.setup();
	render(<TestForm onSubmit={() => pending} />);
	await user.type(screen.getByLabelText('Name'), 'Alice');
	await user.click(screen.getByRole('button', { name: 'Save' }));
	const button = screen.getByRole('button', { name: 'Saving...' });
	expect(button.hasAttribute('disabled')).toBe(true);
	expect(button.getAttribute('aria-busy')).toBe('true');
	await act(async () => {
		finish?.();
		await pending;
	});
	expect(
		screen.getByRole('button', { name: 'Save' }).getAttribute('aria-busy'),
	).toBe('false');
});
