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
import { Slider } from '@/components/ui/slider/slider.component';
import type { EyeHealthContent } from '@/features/eye-health/content/eye-health-content';
import { formatEyeHealthText } from '@/features/eye-health/content/eye-health-content';
import type { CalibrationResult } from '@/features/eye-health/hooks/useEyeHealthTest';

interface CalibrationStepProps {
	content: EyeHealthContent;
	initialValue: CalibrationResult | null;
	onSubmit: (value: CalibrationResult) => void;
}

type CalibrationFormValues = {
	maxBrightness: 'yes' | 'no' | '';
	scalePercent: number;
};

function getReferenceWidthClass(scalePercent: number): string {
	switch (scalePercent) {
		case 80:
			return 'w-[56%]';
		case 85:
			return 'w-[60%]';
		case 90:
			return 'w-[64%]';
		case 95:
			return 'w-[68%]';
		case 100:
			return 'w-[72%]';
		case 105:
			return 'w-[76%]';
		case 110:
			return 'w-[80%]';
		case 115:
			return 'w-[84%]';
		case 120:
			return 'w-[88%]';
		case 125:
			return 'w-[92%]';
		case 130:
			return 'w-[96%]';
		case 135:
			return 'w-full';
		case 140:
			return 'w-full';
		default:
			return 'w-[72%]';
	}
}

export function CalibrationStep({
	content,
	initialValue,
	onSubmit,
}: CalibrationStepProps) {
	const defaultValues: CalibrationFormValues = {
		maxBrightness: initialValue
			? initialValue.maxBrightness
				? 'yes'
				: 'no'
			: '',
		scalePercent: initialValue?.scalePercent ?? 100,
	};

	const form = useForm({
		defaultValues,
		onSubmit: ({ value }) => {
			onSubmit({
				maxBrightness: value.maxBrightness === 'yes',
				scalePercent: value.scalePercent,
			});
		},
	});

	return (
		<Card className="border-border/70 bg-card/90 shadow-sm backdrop-blur">
			<CardHeader className="space-y-2">
				<CardTitle className="text-xl">
					{content.steps.calibration.title}
				</CardTitle>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{content.steps.calibration.description}
				</p>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						void form.handleSubmit();
					}}
					className="space-y-6"
				>
					<form.Field
						name="maxBrightness"
						validators={{
							onSubmit: ({ value }) =>
								value === 'yes'
									? undefined
									: content.steps.calibration.brightnessRequired,
						}}
					>
						{(field) => (
							<Field data-invalid={Boolean(field.state.meta.errors.length)}>
								<FieldLabel>
									{content.steps.calibration.brightnessLabel}
								</FieldLabel>
								<FieldDescription>
									{content.steps.calibration.brightnessHint}
								</FieldDescription>
								<RadioGroup
									value={field.state.value}
									onValueChange={(value) =>
										field.handleChange((value ?? '') as 'yes' | 'no' | '')
									}
									className="grid grid-cols-1 gap-2 sm:grid-cols-2"
								>
									<label
										htmlFor="brightness-yes"
										className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
									>
										<RadioGroupItem id="brightness-yes" value="yes" />
										{content.common.yes}
									</label>
									<label
										htmlFor="brightness-no"
										className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
									>
										<RadioGroupItem id="brightness-no" value="no" />
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

					<form.Field name="scalePercent">
						{(field) => (
							<Field>
								<FieldLabel>
									{formatEyeHealthText(content.steps.calibration.scaleLabel, {
										value: field.state.value,
									})}
								</FieldLabel>
								<FieldDescription>
									{content.steps.calibration.scaleHint}
								</FieldDescription>
								<Slider
									value={[field.state.value]}
									min={80}
									max={140}
									step={5}
									onValueChange={(value) => {
										const nextValue = Array.isArray(value)
											? (value[0] ?? 100)
											: value;
										field.handleChange(nextValue);
									}}
									aria-label={content.steps.calibration.scaleLabel}
								/>
								<div className="rounded-xl border border-dashed border-border/80 bg-muted/35 p-3">
									<p className="text-muted-foreground mb-2 text-xs">
										{content.steps.calibration.referenceLabel}
									</p>
									<div
										className={`mx-auto h-12 rounded-md border-2 border-primary/70 bg-primary/10 transition-all duration-150 ${getReferenceWidthClass(
											field.state.value,
										)}`}
									/>
								</div>
							</Field>
						)}
					</form.Field>

					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<Button type="submit" disabled={!canSubmit || isSubmitting}>
								{content.steps.calibration.submit}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
