import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field/field.component';
import {
	RadioGroup,
	RadioGroupItem,
} from '@/components/ui/radio-group/radio-group.component';
import { Textarea } from '@/components/ui/textarea/textarea.component';
import type { EyeHealthContent } from '@/features/eye-health/content/eye-health-content';
import type { AstigmatismResult } from '@/features/eye-health/hooks/useEyeHealthTest';

interface AstigmatismStepProps {
	content: EyeHealthContent;
	initialValue: AstigmatismResult | null;
	onSubmit: (value: AstigmatismResult) => void;
}

type AstigmatismValues = {
	linesUniform: 'yes' | 'no' | '';
	notes: string;
};

export function AstigmatismStep({
	content,
	initialValue,
	onSubmit,
}: AstigmatismStepProps) {
	const form = useForm({
		defaultValues: {
			linesUniform: initialValue
				? initialValue.linesUniform
					? 'yes'
					: 'no'
				: '',
			notes: initialValue?.notes ?? '',
		} satisfies AstigmatismValues,
		onSubmit: ({ value }) => {
			onSubmit({
				linesUniform: value.linesUniform === 'yes',
				notes: value.notes.trim(),
			});
		},
	});

	return (
		<Card className="border-border/70 bg-card/90 shadow-sm backdrop-blur">
			<CardHeader className="space-y-2">
				<CardTitle className="text-xl">
					{content.steps.astigmatism.title}
				</CardTitle>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{content.steps.astigmatism.description}
				</p>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						void form.handleSubmit();
					}}
					className="space-y-5"
				>
					<div className="mx-auto max-w-sm rounded-xl border border-border/70 bg-background/60 p-4">
						<div className="mx-auto aspect-square w-full max-w-64 rounded-full border border-border/80 bg-[repeating-conic-gradient(color-mix(in_oklch,var(--color-foreground)_68%,transparent)_0deg_2deg,transparent_2deg_12deg)] p-8">
							<div className="h-full w-full rounded-full border border-border/70 bg-background/75" />
						</div>
					</div>

					<form.Field
						name="linesUniform"
						validators={{
							onSubmit: ({ value }) =>
								value ? undefined : content.common.required,
						}}
					>
						{(field) => (
							<Field data-invalid={Boolean(field.state.meta.errors.length)}>
								<FieldLabel>{content.steps.astigmatism.question}</FieldLabel>
								<FieldDescription>
									{content.steps.astigmatism.description}
								</FieldDescription>
								<RadioGroup
									value={field.state.value}
									onValueChange={(value) =>
										field.handleChange((value ?? '') as 'yes' | 'no' | '')
									}
									className="grid grid-cols-1 gap-2 sm:grid-cols-2"
								>
									<label
										htmlFor="astigmatism-yes"
										className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
									>
										<RadioGroupItem id="astigmatism-yes" value="yes" />
										{content.common.yes}
									</label>
									<label
										htmlFor="astigmatism-no"
										className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
									>
										<RadioGroupItem id="astigmatism-no" value="no" />
										{content.common.no}
									</label>
								</RadioGroup>
								<FieldError
									errors={field.state.meta.errors.map((message) => ({
										message,
									}))}
								/>
							</Field>
						)}
					</form.Field>

					<form.Field name="notes">
						{(field) => (
							<Field>
								<FieldLabel htmlFor="astigmatism-notes">
									{content.steps.astigmatism.notesLabel}
								</FieldLabel>
								<Textarea
									id="astigmatism-notes"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									placeholder={content.steps.astigmatism.notesPlaceholder}
								/>
							</Field>
						)}
					</form.Field>

					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<Button type="submit" disabled={!canSubmit || isSubmitting}>
								{content.steps.astigmatism.submit}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
