import {
	BuildingOffice2Icon,
	CheckCircleIcon,
	MapPinIcon,
	PhoneIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog/dialog.component';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/field/field.component';
import { Input } from '@/components/ui/input/input.component';
import { getDashboardContent } from '@/features/dashboard/dashboard.content';
import { currentLocale } from '@/features/i18n/locale-path';
import { apiPost } from '@/lib/api';
import { type Hospital, useAuthStore } from '@/store/auth.store';

interface CreateHospitalPayload {
	nombre: string;
	departamento: string;
	ciudad: string;
	direccion: string;
	nit?: string;
	telefono?: string;
	emailContacto?: string;
	tipoInstitucion?: string;
	capacidadUrgencias?: number;
	numeroConsultorios?: number;
}

interface CreatedHospital {
	id: number;
	nombre: string;
	ciudad: string;
	departamento: string;
	direccion: string;
	nit?: string;
	activo: boolean;
}

interface CreateHospitalModalProps {
	open: boolean;
	onClose: () => void;
	onCreated: (hospital: CreatedHospital) => void;
}

export function CreateHospitalModal({
	open,
	onClose,
	onCreated,
}: CreateHospitalModalProps) {
	const { accessToken, user, setFullAuth } = useAuthStore();
	const content = getDashboardContent(currentLocale()).createHospitalModal;

	const [form, setForm] = useState<CreateHospitalPayload>({
		nombre: '',
		departamento: '',
		ciudad: '',
		direccion: '',
		nit: '',
		telefono: '',
		emailContacto: '',
		tipoInstitucion: '',
		capacidadUrgencias: undefined,
		numeroConsultorios: undefined,
	});

	const [step, setStep] = useState<'form' | 'success'>('form');
	const [createdHospital, setCreatedHospital] =
		useState<CreatedHospital | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	function set<K extends keyof CreateHospitalPayload>(
		k: K,
		v: CreateHospitalPayload[K],
	) {
		setForm((f) => ({ ...f, [k]: v }));
	}

	function validate() {
		if (!form.nombre.trim()) return content.errors.nameRequired;
		if (!form.departamento.trim()) return content.errors.departmentRequired;
		if (!form.ciudad.trim()) return content.errors.cityRequired;
		if (!form.direccion.trim()) return content.errors.addressRequired;
		return null;
	}

	async function handleSubmit() {
		const err = validate();
		if (err) {
			setError(err);
			return;
		}
		setError('');
		setLoading(true);

		try {
			const token = accessToken ?? undefined;

			const payload: CreateHospitalPayload = {
				nombre: form.nombre.trim(),
				departamento: form.departamento.trim(),
				ciudad: form.ciudad.trim(),
				direccion: form.direccion.trim(),
			};
			if (form.nit?.trim()) payload.nit = form.nit.trim();
			if (form.telefono?.trim()) payload.telefono = form.telefono.trim();
			if (form.emailContacto?.trim())
				payload.emailContacto = form.emailContacto.trim();
			if (form.tipoInstitucion?.trim())
				payload.tipoInstitucion = form.tipoInstitucion.trim();
			if (form.capacidadUrgencias)
				payload.capacidadUrgencias = form.capacidadUrgencias;
			if (form.numeroConsultorios)
				payload.numeroConsultorios = form.numeroConsultorios;

			const hospital = await apiPost<CreatedHospital>(
				'/hospitals',
				payload,
				token,
			);
			setCreatedHospital(hospital);

			await apiPost('/auth/join-hospital', { hospitalId: hospital.id }, token);

			const selectRes = await apiPost<{
				accessToken: string;
				usuario: typeof user;
				hospital: Hospital;
			}>('/auth/select-hospital', { hospitalId: hospital.id }, token);

			if (user) {
				setFullAuth(
					selectRes.accessToken,
					selectRes.usuario ?? user,
					selectRes.hospital,
				);
			}

			setStep('success');
			onCreated(hospital);
		} catch (err) {
			setError(err instanceof Error ? err.message : content.errors.submit);
		} finally {
			setLoading(false);
		}
	}

	function handleClose() {
		setForm({
			nombre: '',
			departamento: '',
			ciudad: '',
			direccion: '',
			nit: '',
			telefono: '',
			emailContacto: '',
			tipoInstitucion: '',
		});
		setStep('form');
		setCreatedHospital(null);
		setError('');
		onClose();
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => (next ? undefined : handleClose())}
		>
			<DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0 sm:max-w-2xl">
				<div className="border-b border-border px-6 py-5">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-3">
							<span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
								<BuildingOffice2Icon className="h-5 w-5" />
							</span>
							{content.title}
						</DialogTitle>
						<DialogDescription>{content.description}</DialogDescription>
					</DialogHeader>
				</div>

				<div className="p-6">
					{step === 'success' && createdHospital ? (
						<div className="flex flex-col items-center py-6 text-center">
							<CheckCircleIcon className="mb-4 h-14 w-14 text-secondary-foreground" />
							<h3 className="text-lg font-bold text-foreground">
								{content.successTitle}
							</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								<span className="font-medium text-foreground">
									{createdHospital.nombre}
								</span>{' '}
								{content.successDescription}
							</p>
							<Button type="button" onClick={handleClose} className="mt-6">
								{content.close}
							</Button>
						</div>
					) : (
						<div className="space-y-5">
							<FieldGroup>
								<FieldDescription className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
									<MapPinIcon className="h-3.5 w-3.5" />
									{content.primaryInfo}
								</FieldDescription>
								<Field>
									<FieldLabel>
										{content.fields.name}{' '}
										<span className="text-destructive">*</span>
									</FieldLabel>
									<Input
										type="text"
										value={form.nombre}
										onChange={(e) => set('nombre', e.target.value)}
										placeholder={content.placeholders.name}
									/>
								</Field>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<Field>
										<FieldLabel>
											{content.fields.department}{' '}
											<span className="text-destructive">*</span>
										</FieldLabel>
										<Input
											type="text"
											value={form.departamento}
											onChange={(e) => set('departamento', e.target.value)}
											placeholder={content.placeholders.department}
										/>
									</Field>
									<Field>
										<FieldLabel>
											{content.fields.city}{' '}
											<span className="text-destructive">*</span>
										</FieldLabel>
										<Input
											type="text"
											value={form.ciudad}
											onChange={(e) => set('ciudad', e.target.value)}
											placeholder={content.placeholders.city}
										/>
									</Field>
								</div>
								<Field>
									<FieldLabel>
										{content.fields.address}{' '}
										<span className="text-destructive">*</span>
									</FieldLabel>
									<Input
										type="text"
										value={form.direccion}
										onChange={(e) => set('direccion', e.target.value)}
										placeholder={content.placeholders.address}
									/>
								</Field>
								<Field>
									<FieldLabel>{content.fields.nit}</FieldLabel>
									<Input
										type="text"
										value={form.nit ?? ''}
										onChange={(e) => set('nit', e.target.value)}
										placeholder={content.placeholders.nit}
									/>
								</Field>
							</FieldGroup>

							<FieldGroup>
								<FieldDescription className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
									<PhoneIcon className="h-3.5 w-3.5" />
									{content.contactInfo}
								</FieldDescription>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<Field>
										<FieldLabel>{content.fields.phone}</FieldLabel>
										<Input
											type="tel"
											value={form.telefono ?? ''}
											onChange={(e) => set('telefono', e.target.value)}
											placeholder={content.placeholders.phone}
										/>
									</Field>
									<Field>
										<FieldLabel>{content.fields.institutionType}</FieldLabel>
										<Input
											type="text"
											value={form.tipoInstitucion ?? ''}
											onChange={(e) => set('tipoInstitucion', e.target.value)}
											placeholder={content.placeholders.institutionType}
										/>
									</Field>
								</div>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<Field>
										<FieldLabel>{content.fields.emergencyCapacity}</FieldLabel>
										<Input
											type="number"
											min={0}
											value={form.capacidadUrgencias ?? ''}
											onChange={(e) =>
												set(
													'capacidadUrgencias',
													e.target.value ? Number(e.target.value) : undefined,
												)
											}
											placeholder={content.placeholders.emergencyCapacity}
										/>
									</Field>
									<Field>
										<FieldLabel>{content.fields.consultingRooms}</FieldLabel>
										<Input
											type="number"
											min={0}
											value={form.numeroConsultorios ?? ''}
											onChange={(e) =>
												set(
													'numeroConsultorios',
													e.target.value ? Number(e.target.value) : undefined,
												)
											}
											placeholder={content.placeholders.consultingRooms}
										/>
									</Field>
								</div>
								<Field>
									<FieldLabel>{content.fields.contactEmail}</FieldLabel>
									<Input
										type="email"
										value={form.emailContacto ?? ''}
										onChange={(e) => set('emailContacto', e.target.value)}
										placeholder={content.placeholders.contactEmail}
									/>
								</Field>
							</FieldGroup>

							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							<div className="flex gap-3 pt-2">
								<Button
									type="button"
									variant="outline"
									onClick={handleClose}
									className="flex-1"
								>
									{content.actions.cancel}
								</Button>
								<Button
									type="button"
									onClick={handleSubmit}
									disabled={loading}
									className="flex-1"
								>
									{loading
										? content.actions.submitLoading
										: content.actions.submit}
								</Button>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
