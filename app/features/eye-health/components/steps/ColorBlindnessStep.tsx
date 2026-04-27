import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
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
import { Input } from '@/components/ui/input/input.component';
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import type { EyeHealthContent } from '@/features/eye-health/content/eye-health-content';
import { formatEyeHealthText } from '@/features/eye-health/content/eye-health-content';

interface ColorBlindnessStepProps {
	content: EyeHealthContent;
	fileName: string;
	currentIndex: number;
	total: number;
	initialAnswer?: string;
	onSubmitAnswer: (answer: string) => void;
}

export function ColorBlindnessStep({
	content,
	fileName,
	currentIndex,
	total,
	initialAnswer,
	onSubmitAnswer,
}: ColorBlindnessStepProps) {
	const [isImageLoaded, setIsImageLoaded] = useState(false);
	const imagePath = `/images/ishihara/${fileName}`;
	const isLastPlate = currentIndex >= total;

	const form = useForm({
		defaultValues: {
			answer: initialAnswer ?? '',
		},
		onSubmit: ({ value }) => {
			onSubmitAnswer(value.answer);
		},
	});

	return (
		<Card className="border-border/70 bg-card/90 shadow-sm backdrop-blur">
			<CardHeader className="space-y-2">
				<CardTitle className="text-xl">
					{content.steps.colorBlindness.title}
				</CardTitle>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{content.steps.colorBlindness.description}
				</p>
				<p className="inline-flex w-fit rounded-full border border-border/70 bg-muted/45 px-2 py-1 text-xs font-medium">
					{formatEyeHealthText(content.steps.colorBlindness.plateCounter, {
						current: currentIndex,
						total,
					})}
				</p>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						void form.handleSubmit();
					}}
					className="space-y-4"
				>
					<div className="relative overflow-hidden rounded-xl border border-border/70 bg-muted/20 p-2">
						{!isImageLoaded && (
							<div className="space-y-2">
								<Skeleton className="aspect-square w-full rounded-lg" />
								<p className="text-muted-foreground text-xs">
									{content.steps.colorBlindness.loadingImage}
								</p>
							</div>
						)}
						<img
							src={imagePath}
							alt={formatEyeHealthText(content.steps.colorBlindness.imageAlt, {
								index: currentIndex,
							})}
							className={`mx-auto aspect-square w-full max-w-sm rounded-lg object-contain transition-opacity duration-200 ${
								isImageLoaded ? 'opacity-100' : 'opacity-0'
							}`}
							onLoad={() => setIsImageLoaded(true)}
						/>
					</div>

					<form.Field
						name="answer"
						validators={{
							onChange: ({ value }) => {
								if (!value.trim()) return undefined;
								return /^\d+$/.test(value.trim())
									? undefined
									: content.steps.colorBlindness.inputInvalid;
							},
							onSubmit: ({ value }) =>
								value.trim().length > 0 ? undefined : content.common.required,
						}}
					>
						{(field) => (
							<Field data-invalid={Boolean(field.state.meta.errors.length)}>
								<FieldLabel htmlFor="ishihara-answer">
									{content.steps.colorBlindness.inputLabel}
								</FieldLabel>
								<FieldDescription>
									{content.steps.colorBlindness.inputHint}
								</FieldDescription>
								<Input
									id="ishihara-answer"
									autoFocus
									inputMode="numeric"
									placeholder={content.steps.colorBlindness.inputPlaceholder}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
								/>
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
								{isLastPlate
									? content.steps.colorBlindness.finish
									: content.steps.colorBlindness.next}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
