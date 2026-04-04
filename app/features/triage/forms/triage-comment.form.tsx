import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button/button.component';
import {
	Field,
	FieldError,
	FieldLabel,
} from '@/components/ui/field/field.component';
import { Textarea } from '@/components/ui/textarea/textarea.component';
import type { TriageContent } from '@/features/triage/triage-content';

interface TriageCommentFormProps {
	content: TriageContent;
	disabled?: boolean;
	onSubmit: (comment: string) => Promise<void>;
}

export function TriageCommentForm({
	content,
	disabled,
	onSubmit,
}: TriageCommentFormProps) {
	const form = useForm({
		defaultValues: {
			comment: '',
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value.comment);
			form.setFieldValue('comment', '');
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
			className="space-y-3"
		>
			<form.Field
				name="comment"
				validators={{
					onChange: ({ value }) =>
						value.trim().length > 0 ? undefined : content.errors.required,
				}}
			>
				{(field) => (
					<Field data-invalid={Boolean(field.state.meta.errors.length)}>
						<FieldLabel htmlFor={field.name}>
							{content.forms.comment.label}
						</FieldLabel>
						<Textarea
							id={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder={content.forms.comment.placeholder}
							disabled={disabled}
						/>
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
						disabled={disabled || !canSubmit || isSubmitting}
					>
						{isSubmitting
							? content.forms.comment.sending
							: content.forms.comment.submit}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
