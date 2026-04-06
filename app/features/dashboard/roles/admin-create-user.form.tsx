import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert/alert.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import { Field, FieldLabel } from '@/components/ui/field/field.component';
import { Input } from '@/components/ui/input/input.component';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select/select.component';
import { Switch } from '@/components/ui/switch/switch.component';
import type { AppLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { apiPost } from '@/lib/api';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type CreatableRole = 'MEDICO' | 'ENFERMERO' | 'RECEPCIONISTA';

interface CreateUserPayload {
	nombre: string;
	apellido: string;
	email: string;
	password: string;
	rol: CreatableRole;
	hospitalId: number;
	medicoData?: {
		especialidadId: number;
		numeroRegistro: string;
		consultorio?: string;
	};
	enfermeroData?: {
		numeroRegistro: string;
		nivelFormacion: number;
		areaEspecializacion?: number;
		certificacionTriage: boolean;
	};
}

interface AdminCreateUserFormProps {
	locale: AppLocale;
	hospitalId: number;
	onSuccess: (message: string) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function AdminCreateUserForm({
	locale,
	hospitalId,
	onSuccess,
}: AdminCreateUserFormProps) {
	const [role, setRole] = useState<CreatableRole>('RECEPCIONISTA');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [open, setOpen] = useState(false);

	// Campos comunes
	const [nombre, setNombre] = useState('');
	const [apellido, setApellido] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	// Campos MEDICO
	const [doctorLicense, setDoctorLicense] = useState('');
	const [doctorSpecialtyId, setDoctorSpecialtyId] = useState('');
	const [doctorOffice, setDoctorOffice] = useState('');

	// Campos ENFERMERO
	const [nurseRegistration, setNurseRegistration] = useState('');
	const [nurseLevel, setNurseLevel] = useState('1');
	const [nurseAreaId, setNurseAreaId] = useState('');
	const [nurseTriage, setNurseTriage] = useState(false);

	function resetForm() {
		setNombre('');
		setApellido('');
		setEmail('');
		setPassword('');
		setDoctorLicense('');
		setDoctorSpecialtyId('');
		setDoctorOffice('');
		setNurseRegistration('');
		setNurseLevel('1');
		setNurseAreaId('');
		setNurseTriage(false);
		setError('');
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError('');

		// Validación mínima en cliente — el backend valida exhaustivamente
		if (
			!nombre.trim() ||
			!apellido.trim() ||
			!email.trim() ||
			!password.trim()
		) {
			setError(m.dashboardAdminCreateUserErrorRequiredFields({}, { locale }));
			return;
		}
		if (password.length < 6) {
			setError(m.dashboardAdminCreateUserErrorPasswordLength({}, { locale }));
			return;
		}

		const payload: CreateUserPayload = {
			nombre: nombre.trim(),
			apellido: apellido.trim(),
			email: email.trim(),
			password,
			rol: role,
			hospitalId,
		};

		if (role === 'MEDICO') {
			const specId = Number(doctorSpecialtyId);
			if (!doctorLicense.trim() || Number.isNaN(specId) || specId < 1) {
				setError(
					m.dashboardAdminCreateUserErrorDoctorRequirements({}, { locale }),
				);
				return;
			}
			payload.medicoData = {
				numeroRegistro: doctorLicense.trim(),
				especialidadId: specId,
				consultorio: doctorOffice.trim() || undefined,
			};
		}

		if (role === 'ENFERMERO') {
			const lvl = Number(nurseLevel);
			if (!nurseRegistration.trim() || Number.isNaN(lvl) || lvl < 1) {
				setError(
					m.dashboardAdminCreateUserErrorNurseRequirements({}, { locale }),
				);
				return;
			}
			const areaId = nurseAreaId ? Number(nurseAreaId) : undefined;
			payload.enfermeroData = {
				numeroRegistro: nurseRegistration.trim(),
				nivelFormacion: lvl,
				areaEspecializacion:
					areaId && !Number.isNaN(areaId) && areaId > 0 ? areaId : undefined,
				certificacionTriage: nurseTriage,
			};
		}

		setLoading(true);
		try {
			// POST /auth/register acepta el mismo payload con rol y datos específicos del rol.
			// No se usa GraphQL aquí porque el registro usa el controlador REST de auth.
			await apiPost('/auth/register', payload);
			onSuccess(
				m.dashboardAdminCreateUserSuccess(
					{ role: roleLabelMap[role] },
					{ locale },
				),
			);
			resetForm();
			setOpen(false);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: m.dashboardAdminCreateUserErrorFallback({}, { locale }),
			);
		} finally {
			setLoading(false);
		}
	}

	const roleLabelMap: Record<CreatableRole, string> = {
		MEDICO: m.authRoleDoctor({}, { locale }),
		ENFERMERO: m.authRoleNurse({}, { locale }),
		RECEPCIONISTA: m.authRoleReceptionist({}, { locale }),
	};

	return (
		<Card className="border-border/70">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between gap-2">
					<div>
						<CardTitle className="text-base">
							{m.dashboardAdminCreateUserTitle({}, { locale })}
						</CardTitle>
						<CardDescription>
							{m.dashboardAdminCreateUserDescription({}, { locale })}
						</CardDescription>
					</div>
					<Button
						type="button"
						variant={open ? 'secondary' : 'default'}
						size="sm"
						onClick={() => {
							setOpen((o) => !o);
							if (open) resetForm();
						}}
					>
						{open
							? m.dashboardCreateHospitalActionCancel({}, { locale })
							: m.dashboardAdminCreateUserToggleOpen({}, { locale })}
					</Button>
				</div>
			</CardHeader>

			{open && (
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Selector de rol — primero para que los campos específicos aparezcan según la selección */}
						<Field>
							<FieldLabel>{m.authRegisterLabelRol({}, { locale })}</FieldLabel>
							<Select
								value={role}
								onValueChange={(v) =>
									setRole((v as CreatableRole | null) ?? 'RECEPCIONISTA')
								}
							>
								<SelectTrigger>
									<SelectValue>{roleLabelMap[role]}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="MEDICO" label={roleLabelMap.MEDICO}>
										{roleLabelMap.MEDICO}
									</SelectItem>
									<SelectItem value="ENFERMERO" label={roleLabelMap.ENFERMERO}>
										{roleLabelMap.ENFERMERO}
									</SelectItem>
									<SelectItem
										value="RECEPCIONISTA"
										label={roleLabelMap.RECEPCIONISTA}
									>
										{roleLabelMap.RECEPCIONISTA}
									</SelectItem>
								</SelectContent>
							</Select>
						</Field>

						{/* Datos básicos */}
						<div className="grid gap-3 sm:grid-cols-2">
							<Field>
								<FieldLabel>
									{m.authRegisterLabelNombre({}, { locale })}
								</FieldLabel>
								<Input
									value={nombre}
									onChange={(e) => setNombre(e.target.value)}
									placeholder={m.authRegisterLabelNombre({}, { locale })}
									required
								/>
							</Field>
							<Field>
								<FieldLabel>
									{m.authRegisterLabelApellido({}, { locale })}
								</FieldLabel>
								<Input
									value={apellido}
									onChange={(e) => setApellido(e.target.value)}
									placeholder={m.authRegisterLabelApellido({}, { locale })}
									required
								/>
							</Field>
							<Field>
								<FieldLabel>
									{m.authRegisterLabelEmail({}, { locale })}
								</FieldLabel>
								<Input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder={m.authLoginEmailPlaceholder({}, { locale })}
									required
								/>
							</Field>
							<Field>
								<FieldLabel>
									{m.authRegisterLabelPassword({}, { locale })}
								</FieldLabel>
								<Input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder={m.authLoginPasswordPlaceholder({}, { locale })}
									minLength={6}
									required
								/>
							</Field>
						</div>

						{/* Campos específicos MEDICO */}
						{role === 'MEDICO' && (
							<div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-border/50 bg-muted/10 p-3">
								<p className="col-span-full text-xs font-medium text-muted-foreground">
									{m.dashboardAdminCreateUserDoctorDataTitle({}, { locale })}
								</p>
								<Field>
									<FieldLabel>
										{m.authRegisterLabelNumeroRegistroMedico({}, { locale })}
									</FieldLabel>
									<Input
										value={doctorLicense}
										onChange={(e) => setDoctorLicense(e.target.value)}
										placeholder={m.authRegisterPlaceholderNumeroRegistroMedico(
											{},
											{ locale },
										)}
										required
									/>
								</Field>
								<Field>
									<FieldLabel>
										{m.authRegisterLabelEspecialidadId({}, { locale })}
									</FieldLabel>
									<Input
										type="number"
										min={1}
										value={doctorSpecialtyId}
										onChange={(e) => setDoctorSpecialtyId(e.target.value)}
										placeholder={m.authRegisterPlaceholderEspecialidadId(
											{},
											{ locale },
										)}
										required
									/>
								</Field>
								<Field>
									<FieldLabel>
										{m.authRegisterLabelConsultorio({}, { locale })}
									</FieldLabel>
									<Input
										value={doctorOffice}
										onChange={(e) => setDoctorOffice(e.target.value)}
										placeholder="101-A"
									/>
								</Field>
							</div>
						)}

						{/* Campos específicos ENFERMERO */}
						{role === 'ENFERMERO' && (
							<div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-border/50 bg-muted/10 p-3">
								<p className="col-span-full text-xs font-medium text-muted-foreground">
									{m.dashboardAdminCreateUserNurseDataTitle({}, { locale })}
								</p>
								<Field>
									<FieldLabel>
										{m.authRegisterLabelNumeroRegistroEnfermero({}, { locale })}
									</FieldLabel>
									<Input
										value={nurseRegistration}
										onChange={(e) => setNurseRegistration(e.target.value)}
										placeholder={m.authRegisterPlaceholderNumeroRegistroEnfermero(
											{},
											{ locale },
										)}
										required
									/>
								</Field>
								<Field>
									<FieldLabel>
										{m.authRegisterLabelNivelFormacion({}, { locale })}
									</FieldLabel>
									<Select
										value={nurseLevel}
										onValueChange={(v) => setNurseLevel(v ?? '1')}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="1">
												{m.authRegisterTrainingLevel1({}, { locale })}
											</SelectItem>
											<SelectItem value="2">
												{m.authRegisterTrainingLevel2({}, { locale })}
											</SelectItem>
											<SelectItem value="3">
												{m.authRegisterTrainingLevel3({}, { locale })}
											</SelectItem>
											<SelectItem value="4">
												{m.authRegisterTrainingLevel4({}, { locale })}
											</SelectItem>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel>
										{m.authRegisterLabelAreaEspecializacion({}, { locale })}
									</FieldLabel>
									<Input
										type="number"
										min={1}
										value={nurseAreaId}
										onChange={(e) => setNurseAreaId(e.target.value)}
										placeholder={m.authRegisterPlaceholderAreaEspecializacion(
											{},
											{ locale },
										)}
									/>
								</Field>
								<Field>
									<div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2">
										<FieldLabel className="mb-0">
											{m.authRegisterLabelCertificacionTriage({}, { locale })}
										</FieldLabel>
										<Switch
											checked={nurseTriage}
											onCheckedChange={(c) => setNurseTriage(Boolean(c))}
										/>
									</div>
								</Field>
							</div>
						)}

						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						<Button type="submit" disabled={loading} className="gap-2">
							{loading
								? m.authRegisterNavSubmitLoading({}, { locale })
								: m.dashboardAdminCreateUserSubmit({}, { locale })}
						</Button>
					</form>
				</CardContent>
			)}
		</Card>
	);
}

// Daniel Useche
