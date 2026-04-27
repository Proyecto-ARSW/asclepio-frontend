/**
 * ClinicalRecordCard — tarjeta de historial médico del doctor.
 *
 * Muestra el nombre del paciente, la fecha del registro y los campos
 * clínicos (Diagnóstico, Tratamiento, Observaciones) con badges de color
 * para que de un vistazo sea claro QUÉ tipo de información contiene
 * cada entrada. Si viene de una búsqueda semántica, muestra el score
 * de similitud en un badge verde.
 *
 * Patrón de animación: igual que StatCard — entrada con fadeUp y
 * whileHover levita 4px para mantener coherencia con el resto del dashboard.
 */
import {
	BeakerIcon,
	ClipboardDocumentListIcon,
	EyeIcon,
	UserCircleIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge/badge.component';
import {
	Card,
	CardContent,
	CardHeader,
} from '@/components/ui/card/card.component';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ClinicalRecordEntry {
	id: string;
	pacienteId: string;
	diagnostico?: string | null;
	tratamiento?: string | null;
	observaciones?: string | null;
	creadoEn: string;
}

interface ClinicalRecordCardProps {
	entry: ClinicalRecordEntry;
	patientName: string | undefined;
	locale: string;
	/** Score de similitud coseno 0-1 de asclepio-search. Solo presente en resultados de búsqueda. */
	similarityScore?: number;
	/** Retraso de animación para escalonar tarjetas hermanas: delay={index * 0.06} */
	delay?: number;
}

// ─── Configuración de tipos de campo ─────────────────────────────────────────
// Cada campo clínico tiene un color semántico distinto para que el médico
// identifique el tipo de información sin leer el label.

const FIELD_CONFIG = {
	diagnostico: {
		// Azul primario → diagnóstico es la pieza clínica principal
		badgeClass: 'bg-primary/15 text-primary border-primary/20',
		labelEs: 'Diagnóstico',
		labelEn: 'Diagnosis',
		icon: ClipboardDocumentListIcon,
	},
	tratamiento: {
		// Violeta → tratamiento/intervención
		badgeClass:
			'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20',
		labelEs: 'Tratamiento',
		labelEn: 'Treatment',
		icon: BeakerIcon,
	},
	observaciones: {
		// Amber → observaciones son notas complementarias
		badgeClass:
			'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20',
		labelEs: 'Observaciones',
		labelEn: 'Observations',
		icon: EyeIcon,
	},
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string | undefined | null): string {
	if (!name) return '';
	return name
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0]!.toUpperCase())
		.join('');
}

function formatDate(iso: string, locale: string): string {
	try {
		return new Date(iso).toLocaleDateString(locale, {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		});
	} catch {
		return iso;
	}
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function ClinicalRecordCard({
	entry,
	patientName,
	locale,
	similarityScore,
	delay = 0,
}: ClinicalRecordCardProps) {
	const isEs = locale === 'es';

	// Solo renderizar badges y contenido para los campos que tienen valor
	const activeFields = (
		['diagnostico', 'tratamiento', 'observaciones'] as const
	).filter((f) => !!entry[f]);

	return (
		// whileInView garantiza la animación incluso si la tarjeta empieza fuera del viewport.
		// once:true evita repetir la animación al hacer scroll de regreso.
		<motion.div
			initial={{ opacity: 0, y: 14 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: '-30px' }}
			transition={{ duration: 0.4, ease: 'easeOut', delay }}
			whileHover={{ y: -3 }}
		>
			<Card className="border-border/70 transition-shadow duration-300 hover:shadow-md">
				<CardHeader className="pb-2 pt-3">
					{/* Fila superior: paciente a la izquierda, fecha a la derecha */}
					<div className="flex items-center justify-between gap-3">
						<div className="flex min-w-0 items-center gap-2">
							{/* Avatar con iniciales — identifica al paciente sin foto */}
							<div
								aria-hidden
								className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
							>
								{initials(patientName) || <UserCircleIcon className="h-4 w-4" />}
							</div>
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold text-foreground">
									{patientName || '—'}
								</p>
								<p className="text-xs text-muted-foreground">
									{isEs ? 'Paciente' : 'Patient'}
								</p>
							</div>
						</div>

						{/* Fecha de creación del registro */}
						<div className="flex shrink-0 flex-col items-end gap-1">
							<Badge variant="outline" className="text-xs">
								{formatDate(entry.creadoEn, locale)}
							</Badge>
							{/* Badge de similitud solo visible en resultados de búsqueda semántica */}
							{similarityScore !== undefined && (
								<Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs">
									{Math.round(similarityScore * 100)}% match
								</Badge>
							)}
						</div>
					</div>

					{/* Badges de los tipos de campos presentes — permite ver de un vistazo QUÉ contiene */}
					{activeFields.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1.5">
							{activeFields.map((field) => {
								const cfg = FIELD_CONFIG[field];
								const Icon = cfg.icon;
								return (
									<span
										key={field}
										className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.badgeClass}`}
									>
										<Icon className="h-3 w-3" aria-hidden />
										{isEs ? cfg.labelEs : cfg.labelEn}
									</span>
								);
							})}
						</div>
					)}
				</CardHeader>

				<CardContent className="space-y-2.5 pt-0 pb-3">
					{/* Cada campo clínico con su label y separación visual clara */}
					{activeFields.map((field) => {
						const cfg = FIELD_CONFIG[field];
						return (
							<div key={field} className="space-y-0.5">
								{/* Label del campo — explica qué tipo de información es */}
								<p
									className={`text-xs font-semibold uppercase tracking-wide ${
										field === 'diagnostico'
											? 'text-primary/80'
											: field === 'tratamiento'
												? 'text-violet-600 dark:text-violet-400'
												: 'text-amber-600 dark:text-amber-400'
									}`}
								>
									{isEs ? cfg.labelEs : cfg.labelEn}
								</p>
								<p className="text-sm text-foreground/90 leading-snug">
									{entry[field]}
								</p>
							</div>
						);
					})}
				</CardContent>
			</Card>
		</motion.div>
	);
}

// Daniel Useche
