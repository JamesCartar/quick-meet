import type { ComponentProps } from 'react';
import { useId } from 'react';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useFieldContext } from './context';
import { FieldError, useFieldStatus } from './field-error';

type TextAreaProps = Omit<
	ComponentProps<typeof Textarea>,
	'id' | 'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur'
> & { label: string };

export function TextArea({ label, ...props }: TextAreaProps) {
	const field = useFieldContext<string>();
	const id = useId();
	const { message, invalid } = useFieldStatus();
	const errorId = `${id}-error`;

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Textarea
				{...props}
				id={id}
				name={field.name}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(event) => field.handleChange(event.target.value)}
				aria-invalid={invalid}
				aria-describedby={
					[props['aria-describedby'], invalid ? errorId : undefined]
						.filter(Boolean)
						.join(' ') || undefined
				}
			/>
			<FieldError id={errorId} message={message} />
		</div>
	);
}
