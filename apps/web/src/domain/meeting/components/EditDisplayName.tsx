import { joinMeetingSchema } from '@meet/contracts/meeting';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppForm } from '@/shared/components/form';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/shared/components/ui/dialog';
import { getMeetingError } from '../lib/media';

const nameSchema = joinMeetingSchema.pick({ displayName: true });

type Props = {
	displayName: string;
	onSave: (displayName: string) => Promise<void>;
};

export function EditDisplayName({ displayName, onSave }: Props) {
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const form = useAppForm({
		defaultValues: { displayName },
		validators: { onChange: nameSchema, onSubmit: nameSchema },
		onSubmit: async ({ value }) => {
			setSaving(true);
			setError(null);
			try {
				await onSave(value.displayName.trim());
				setOpen(false);
			} catch (failure) {
				setError(getMeetingError(failure));
			} finally {
				setSaving(false);
			}
		},
	});

	useEffect(() => {
		if (!open) {
			form.reset({ displayName });
			setError(null);
		}
	}, [open, displayName, form]);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!saving) setOpen(next);
			}}
		>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					aria-label="Change your name"
					className="size-11 shrink-0 px-3 sm:w-auto"
				>
					<Pencil className="size-4" />
					<span className="hidden max-w-28 truncate sm:inline">
						{displayName}
					</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="dark p-6">
				<DialogHeader>
					<DialogTitle>Change your name</DialogTitle>
					<DialogDescription>
						This name is shown to everyone in the meeting.
					</DialogDescription>
				</DialogHeader>
				<form
					className="space-y-5"
					onSubmit={(event) => {
						event.preventDefault();
						void form.handleSubmit();
					}}
				>
					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					<fieldset disabled={saving}>
						<form.AppField name="displayName">
							{(field) => (
								<field.TextField
									label="Your name"
									maxLength={50}
									autoComplete="name"
								/>
							)}
						</form.AppField>
					</fieldset>
					<DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0">
						<Button
							type="button"
							variant="outline"
							disabled={saving}
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<form.AppForm>
							<form.SubmitButton label="Save name" loadingLabel="Saving…" />
						</form.AppForm>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
