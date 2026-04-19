import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button/button.component';
import {
	Field,
	FieldError,
	FieldLabel,
} from '@/components/ui/field/field.component';
import { Textarea } from '@/components/ui/textarea/textarea.component';
import type { TriageContent } from '@/features/triage/triage-content';

interface CloseTriageFormProps {
	content: TriageContent;
	disabled?: boolean;
	onSubmit: (reason: string) => Promise<void>;
}

export function CloseTriageForm({
	content,
	disabled,
	onSubmit,
}: CloseTriageFormProps) {
	const form = useForm({
		defaultValues: {
			reason: '',
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value.reason);
			form.setFieldValue('reason', '');
		},
	});

	return (
		<form
			aria-label={content.forms.close.formLabel}
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
			className="space-y-3"
		>
			<form.Field
				name="reason"
				validators={{
					onChange: ({ value }) =>
						value.trim().length > 0 ? undefined : content.errors.required,
				}}
			>
				{(field) => (
					<Field data-invalid={Boolean(field.state.meta.errors.length)}>
						<FieldLabel htmlFor={field.name}>
							{content.forms.close.label}
						</FieldLabel>
						<Textarea
							id={field.name}
							aria-describedby="triage-close-reason-desc"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder={content.forms.close.placeholder}
							disabled={disabled}
						/>
						<p id="triage-close-reason-desc" className="sr-only">{content.forms.close.closeReasonDesc}</p>
						<FieldError
							errors={field.state.meta.errors.map((message) => ({ message }))}
						/>
					</Field>
				)}
			</form.Field>
			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<Button
						type="submit"
						variant="destructive"
						disabled={disabled || !canSubmit || isSubmitting}
					>
						{isSubmitting
							? content.forms.close.sending
							: content.forms.close.submit}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

// Daniel Useche
