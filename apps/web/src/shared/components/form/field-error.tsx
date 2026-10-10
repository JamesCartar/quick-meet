import { useStore } from '@tanstack/react-form';
import { useFieldContext } from './context';

export function useFieldStatus() {
	const field = useFieldContext<unknown>();
	const submissionAttempts = useStore(
		field.form.store,
		(state) => state.submissionAttempts,
	);
	const showError = field.state.meta.isTouched || submissionAttempts > 0;
	const messages = showError
		? field.state.meta.errors.flatMap((error: unknown) => {
				if (typeof error === 'string') return [error];
				if (
					error &&
					typeof error === 'object' &&
					'message' in error &&
					typeof error.message === 'string'
				) {
					return [error.message];
				}
				return [];
			})
		: [];

	return {
		message: [...new Set(messages)].join(' '),
		invalid: messages.length > 0,
	};
}

export function FieldError({ id, message }: { id: string; message: string }) {
	if (!message) return null;
	return (
		<p id={id} role="alert" className="text-sm text-destructive">
			{message}
		</p>
	);
}
