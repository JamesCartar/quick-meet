import { useId } from 'react';
import { Label } from '@/shared/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/components/ui/select';
import { useFieldContext } from './context';
import { FieldError, useFieldStatus } from './field-error';

type SelectOptionsFieldProps = {
	label: string;
	options: { label: string; value: string; disabled?: boolean }[];
	placeholder?: string;
	disabled?: boolean;
};

export function SelectOptionsField({
	label,
	options,
	placeholder = 'Select an option',
	disabled,
}: SelectOptionsFieldProps) {
	const field = useFieldContext<string>();
	const id = useId();
	const { message, invalid } = useFieldStatus();
	const errorId = `${id}-error`;

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Select
				name={field.name}
				value={field.state.value}
				onValueChange={field.handleChange}
				disabled={disabled}
			>
				<SelectTrigger
					id={id}
					onBlur={field.handleBlur}
					aria-invalid={invalid}
					aria-describedby={invalid ? errorId : undefined}
				>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem
							key={option.value}
							value={option.value}
							disabled={option.disabled}
						>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<FieldError id={errorId} message={message} />
		</div>
	);
}
