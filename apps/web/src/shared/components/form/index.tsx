import { createFormHook } from '@tanstack/react-form';
import { CheckboxField } from './checkbox';
import { fieldContext, formContext } from './context';
import { SelectOptionsField } from './select-field';
import { SubmitButton } from './submit-button';
import { TextArea } from './text-area';
import { TextField } from './text-field';

export {
	fieldContext,
	formContext,
	useFieldContext,
	useFormContext,
} from './context';

export const { useAppForm, withForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: { TextField, TextArea, CheckboxField, SelectOptionsField },
	formComponents: { SubmitButton },
});
