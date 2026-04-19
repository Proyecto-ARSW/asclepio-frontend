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
import type { EyeHealthContent } from '@/features/eye-health/content/eye-health-content';
import type {
	AcuityAnswers,
	AcuityDirection,
	AcuityTargets,
} from '@/features/eye-health/hooks/useEyeHealthTest';

interface AcuityStepProps {
	content: EyeHealthContent;
	targets: AcuityTargets;
	initialValue: AcuityAnswers | null;
	onSubmit: (value: AcuityAnswers) => void;
}

function directionLabel(
	content: EyeHealthContent,
	direction: AcuityDirection,
): string {
	if (direction === 'up') return content.steps.acuity.optionUp;
	if (direction === 'right') return content.steps.acuity.optionRight;
	if (direction === 'down') return content.steps.acuity.optionDown;
	return content.steps.acuity.optionLeft;
}

function LandoltRing({ direction }: { direction: AcuityDirection }) {
	const gapClass =
		direction === 'up'
			? 'top-[-1px] left-1/2 h-7 w-4 -translate-x-1/2 rounded-b-md'
			: direction === 'right'
				? 'right-[-1px] top-1/2 h-4 w-7 -translate-y-1/2 rounded-l-md'
				: direction === 'down'
					? 'bottom-[-1px] left-1/2 h-7 w-4 -translate-x-1/2 rounded-t-md'
					: 'left-[-1px] top-1/2 h-4 w-7 -translate-y-1/2 rounded-r-md';

	return (
		<div className="mx-auto flex w-full justify-center">
			<div className="relative size-28 rounded-full border-14 border-foreground/80 bg-transparent sm:size-32">
				<div className={`absolute bg-background ${gapClass}`} />
			</div>
		</div>
	);
}

function EyeQuestion({
	content,
	eye,
	targetDirection,
}: {
	content: EyeHealthContent;
	eye: 'leftEye' | 'rightEye';
	targetDirection: AcuityDirection;
}) {
	const options: AcuityDirection[] = ['up', 'right', 'down', 'left'];
	const prompt =
		eye === 'leftEye'
			? content.steps.acuity.leftEyePrompt
			: content.steps.acuity.rightEyePrompt;

	return (
		<div className="rounded-xl border border-border/70 bg-background/70 p-3">
			<p className="text-sm font-medium">{prompt}</p>
			<p className="text-muted-foreground mt-1 text-xs">
				{content.steps.acuity.answerLabel}
			</p>
			<div className="mt-3">
				<LandoltRing direction={targetDirection} />
			</div>
			<div className="mt-3 grid grid-cols-2 gap-2">
				{options.map((direction) => (
					<label
						key={`${eye}-${direction}`}
						htmlFor={`${eye}-${direction}`}
						className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
					>
						<RadioGroupItem id={`${eye}-${direction}`} value={direction} />
						{directionLabel(content, direction)}
					</label>
				))}
			</div>
		</div>
	);
}

export function AcuityStep({
	content,
	targets,
	initialValue,
	onSubmit,
}: AcuityStepProps) {
	const form = useForm({
		defaultValues: {
			leftEye: initialValue?.leftEye ?? '',
			rightEye: initialValue?.rightEye ?? '',
		} as { leftEye: AcuityDirection | ''; rightEye: AcuityDirection | '' },
		onSubmit: ({ value }) => {
			if (!value.leftEye || !value.rightEye) return;
			onSubmit({
				leftEye: value.leftEye,
				rightEye: value.rightEye,
			});
		},
	});

	return (
		<Card className="border-border/70 bg-card/90 shadow-sm backdrop-blur">
			<CardHeader className="space-y-2">
				<CardTitle className="text-xl">{content.steps.acuity.title}</CardTitle>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{content.steps.acuity.description}
				</p>
				<p className="inline-flex w-fit rounded-full border border-border/70 bg-muted/45 px-2 py-1 text-xs font-medium">
					{content.steps.acuity.distanceHint}
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
					<form.Field
						name="leftEye"
						validators={{
							onSubmit: ({ value }) =>
								value ? undefined : content.common.required,
						}}
					>
						{(field) => (
							<Field data-invalid={Boolean(field.state.meta.errors.length)}>
								<FieldLabel>{content.steps.acuity.leftEyePrompt}</FieldLabel>
								<FieldDescription>
									{content.steps.acuity.answerLabel}
								</FieldDescription>
								<RadioGroup
									value={field.state.value}
									onValueChange={(value) =>
										field.handleChange((value ?? '') as AcuityDirection | '')
									}
								>
									<EyeQuestion
										content={content}
										eye="leftEye"
										targetDirection={targets.leftEye}
									/>
								</RadioGroup>
								<FieldError
									errors={field.state.meta.errors.map((message) => ({
										message,
									}))}
								/>
							</Field>
						)}
					</form.Field>

					<form.Field
						name="rightEye"
						validators={{
							onSubmit: ({ value }) =>
								value ? undefined : content.common.required,
						}}
					>
						{(field) => (
							<Field data-invalid={Boolean(field.state.meta.errors.length)}>
								<FieldLabel>{content.steps.acuity.rightEyePrompt}</FieldLabel>
								<FieldDescription>
									{content.steps.acuity.answerLabel}
								</FieldDescription>
								<RadioGroup
									value={field.state.value}
									onValueChange={(value) =>
										field.handleChange((value ?? '') as AcuityDirection | '')
									}
								>
									<EyeQuestion
										content={content}
										eye="rightEye"
										targetDirection={targets.rightEye}
									/>
								</RadioGroup>
								<FieldError
									errors={field.state.meta.errors.map((message) => ({
										message,
									}))}
								/>
							</Field>
						)}
					</form.Field>

					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<Button type="submit" disabled={!canSubmit || isSubmitting}>
								{content.steps.acuity.submit}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
