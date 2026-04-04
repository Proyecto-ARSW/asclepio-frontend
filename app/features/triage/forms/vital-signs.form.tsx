import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button/button.component';
import {
	Field,
	FieldError,
	FieldLabel,
} from '@/components/ui/field/field.component';
import { Input } from '@/components/ui/input/input.component';
import type { TriageVitalSigns } from '@/features/triage/triage.types';
import type { TriageContent } from '@/features/triage/triage-content';

interface VitalSignsFormProps {
	content: TriageContent;
	initialValues?: TriageVitalSigns;
	disabled?: boolean;
	onSubmit: (vitalSigns: TriageVitalSigns) => Promise<void>;
}

interface VitalSignsFormValues {
	temperature_c: string;
	heart_rate_bpm: string;
	respiratory_rate_bpm: string;
	systolic_bp_mmhg: string;
	diastolic_bp_mmhg: string;
	oxygen_saturation_pct: string;
	weight_kg: string;
	height_cm: string;
}

function parseNumber(value: string): number | undefined {
	if (!value.trim()) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function VitalSignsForm({
	content,
	initialValues,
	disabled,
	onSubmit,
}: VitalSignsFormProps) {
	const form = useForm({
		defaultValues: {
			temperature_c: initialValues?.temperature_c?.toString() ?? '',
			heart_rate_bpm: initialValues?.heart_rate_bpm?.toString() ?? '',
			respiratory_rate_bpm:
				initialValues?.respiratory_rate_bpm?.toString() ?? '',
			systolic_bp_mmhg: initialValues?.systolic_bp_mmhg?.toString() ?? '',
			diastolic_bp_mmhg: initialValues?.diastolic_bp_mmhg?.toString() ?? '',
			oxygen_saturation_pct:
				initialValues?.oxygen_saturation_pct?.toString() ?? '',
			weight_kg: initialValues?.weight_kg?.toString() ?? '',
			height_cm: initialValues?.height_cm?.toString() ?? '',
		},
		onSubmit: async ({ value }) => {
			await onSubmit({
				temperature_c: parseNumber(value.temperature_c),
				heart_rate_bpm: parseNumber(value.heart_rate_bpm),
				respiratory_rate_bpm: parseNumber(value.respiratory_rate_bpm),
				systolic_bp_mmhg: parseNumber(value.systolic_bp_mmhg),
				diastolic_bp_mmhg: parseNumber(value.diastolic_bp_mmhg),
				oxygen_saturation_pct: parseNumber(value.oxygen_saturation_pct),
				weight_kg: parseNumber(value.weight_kg),
				height_cm: parseNumber(value.height_cm),
			});
		},
	});

	const fields: Array<{ key: keyof VitalSignsFormValues; label: string }> = [
		{ key: 'temperature_c', label: content.forms.vitalSigns.temperature },
		{ key: 'heart_rate_bpm', label: content.forms.vitalSigns.heartRate },
		{
			key: 'respiratory_rate_bpm',
			label: content.forms.vitalSigns.respiratoryRate,
		},
		{ key: 'systolic_bp_mmhg', label: content.forms.vitalSigns.systolicBp },
		{ key: 'diastolic_bp_mmhg', label: content.forms.vitalSigns.diastolicBp },
		{
			key: 'oxygen_saturation_pct',
			label: content.forms.vitalSigns.oxygenSaturation,
		},
		{ key: 'weight_kg', label: content.forms.vitalSigns.weight },
		{ key: 'height_cm', label: content.forms.vitalSigns.height },
	];

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
			className="space-y-4"
		>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{fields.map((item) => (
					<form.Field
						key={item.key}
						name={item.key}
						validators={{
							onChange: ({ value }) => {
								if (!value.trim()) return undefined;
								return Number.isFinite(Number(value))
									? undefined
									: content.errors.invalidNumber;
							},
						}}
					>
						{(field) => (
							<Field data-invalid={Boolean(field.state.meta.errors.length)}>
								<FieldLabel htmlFor={field.name}>{item.label}</FieldLabel>
								<Input
									id={field.name}
									type="number"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									disabled={disabled}
								/>
								<FieldError
									errors={field.state.meta.errors.map((message) => ({
										message,
									}))}
								/>
							</Field>
						)}
					</form.Field>
				))}
			</div>
			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<Button
						type="submit"
						disabled={disabled || !canSubmit || isSubmitting}
					>
						{isSubmitting
							? content.forms.vitalSigns.saving
							: content.forms.vitalSigns.submit}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
