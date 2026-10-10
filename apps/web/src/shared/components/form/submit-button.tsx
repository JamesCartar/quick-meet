import type { ComponentProps } from 'react';
import { Button } from '@/shared/components/ui/button';
import { useFormContext } from './context';

type SubmitButtonProps = Omit<
	ComponentProps<typeof Button>,
	'type' | 'children'
> & {
	label: string;
	loadingLabel?: string;
	allowInvalid?: boolean;
	requireDirty?: boolean;
};

export function SubmitButton({
	label,
	loadingLabel = 'Submitting...',
	disabled = false,
	allowInvalid = false,
	requireDirty = true,
	...props
}: SubmitButtonProps) {
	const form = useFormContext();
	return (
		<form.Subscribe
			selector={(state) => ({
				isSubmitting: state.isSubmitting,
				canSubmit: state.canSubmit,
				isDirty: state.isDirty,
			})}
		>
			{({ isSubmitting, canSubmit, isDirty }) => (
				<Button
					{...props}
					type="submit"
					aria-busy={isSubmitting}
					disabled={
						disabled ||
						isSubmitting ||
						(!allowInvalid && !canSubmit) ||
						(requireDirty && !isDirty)
					}
				>
					{isSubmitting ? loadingLabel : label}
				</Button>
			)}
		</form.Subscribe>
	);
}
