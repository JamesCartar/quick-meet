import type { ComponentProps } from 'react';
import { useId } from 'react';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { useFieldContext } from './context';
import { FieldError, useFieldStatus } from './field-error';

type CheckboxFieldProps = Omit<
	ComponentProps<typeof Checkbox>,
	'id' | 'name' | 'checked' | 'defaultChecked' | 'onCheckedChange' | 'onBlur'
> & { label: string };

export function CheckboxField({ label, ...props }: CheckboxFieldProps) {
	const field = useFieldContext<boolean>();
	const id = useId();
	const { message, invalid } = useFieldStatus();
	const errorId = `${id}-error`;

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<Checkbox
					{...props}
					id={id}
					name={field.name}
					checked={field.state.value}
					onBlur={field.handleBlur}
					onCheckedChange={(checked) => field.handleChange(checked === true)}
					aria-invalid={invalid}
					aria-describedby={
						[props['aria-describedby'], invalid ? errorId : undefined]
							.filter(Boolean)
							.join(' ') || undefined
					}
				/>
				<Label htmlFor={id}>{label}</Label>
			</div>
			<FieldError id={errorId} message={message} />
		</div>
	);
}
