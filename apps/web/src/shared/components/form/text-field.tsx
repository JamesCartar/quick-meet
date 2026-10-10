import type { ComponentProps } from 'react';
import { useId } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useFieldContext } from './context';
import { FieldError, useFieldStatus } from './field-error';

type TextFieldProps = Omit<
	ComponentProps<typeof Input>,
	'id' | 'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'type'
> & {
	label: string;
	type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
};

export function TextField({ label, type = 'text', ...props }: TextFieldProps) {
	const field = useFieldContext<string>();
	const id = useId();
	const { message, invalid } = useFieldStatus();
	const errorId = `${id}-error`;

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Input
				{...props}
				id={id}
				name={field.name}
				type={type}
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
