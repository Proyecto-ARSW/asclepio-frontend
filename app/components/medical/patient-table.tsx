import {
	ArrowPathIcon,
	EnvelopeIcon,
	IdentificationIcon,
	ShieldCheckIcon,
	UserCircleIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';
import { Skeleton } from '@/components/ui/skeleton/skeleton.component';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table/table.component';

export interface PatientRow {
	id: string;
	nombre: string;
	apellido: string;
	email: string;
	tipoDocumento?: string;
	numeroDocumento?: string;
	eps?: string;
	tipoSangre?: string;
	creadoEn: string;
}

interface PatientTableProps {
	patients: PatientRow[];
	loading?: boolean;
	onRefresh?: () => void;
	labels?: {
		title?: string;
		refresh?: string;
		emptyTitle?: string;
		emptyDescription?: string;
		headers?: {
			patient?: string;
			document?: string;
			eps?: string;
			blood?: string;
			registry?: string;
		};
	};
}

function EmptyState({
	emptyTitle,
	emptyDescription,
}: {
	emptyTitle: string;
	emptyDescription: string;
}) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<UserCircleIcon className="mb-3 h-12 w-12 text-muted-foreground/40" />
			<p className="text-sm font-medium text-muted-foreground">{emptyTitle}</p>
			<p className="mt-1 text-xs text-muted-foreground/80">
				{emptyDescription}
			</p>
		</div>
	);
}

function LoadingState() {
	return (
		<div className="divide-y divide-border">
			{Array.from({ length: 5 }, (_, index) => `skeleton-${index}`).map(
				(rowKey) => (
					<div key={rowKey} className="flex items-center gap-4 px-4 py-4">
						<Skeleton className="h-8 w-8 rounded-full" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-3 w-32" />
							<Skeleton className="h-2.5 w-48" />
						</div>
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-3 w-16" />
					</div>
				),
			)}
		</div>
	);
}

function bloodTypeColor(tipo?: string) {
	if (!tipo) return 'outline';
	return 'destructive';
}

export function PatientTable({
	patients,
	loading,
	onRefresh,
	labels,
}: PatientTableProps) {
	const text = {
		title: labels?.title ?? 'Pacientes',
		refresh: labels?.refresh ?? 'Actualizar',
		emptyTitle: labels?.emptyTitle ?? 'Sin pacientes registrados',
		emptyDescription:
			labels?.emptyDescription ??
			'Los pacientes apareceran aqui una vez registrados en el sistema.',
		headers: {
			patient: labels?.headers?.patient ?? 'Paciente',
			document: labels?.headers?.document ?? 'Documento',
			eps: labels?.headers?.eps ?? 'EPS',
			blood: labels?.headers?.blood ?? 'Sangre',
			registry: labels?.headers?.registry ?? 'Registro',
		},
	};

	return (
		<Card className="overflow-hidden">
			<CardHeader className="border-b border-border pb-3">
				<div className="flex items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2 text-sm">
						<UserCircleIcon className="h-4 w-4 text-primary" />
						{text.title}
						<Badge variant="secondary">{patients.length}</Badge>
					</CardTitle>
					{onRefresh && (
						<Button
							type="button"
							onClick={onRefresh}
							disabled={loading}
							variant="outline"
							size="sm"
							className="gap-1.5"
						>
							<ArrowPathIcon
								className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
							/>
							{text.refresh}
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="p-0">
				{loading ? (
					<LoadingState />
				) : patients.length === 0 ? (
					<EmptyState
						emptyTitle={text.emptyTitle}
						emptyDescription={text.emptyDescription}
					/>
				) : (
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/40 hover:bg-muted/40">
								<TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{text.headers.patient}
								</TableHead>
								<TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{text.headers.document}
								</TableHead>
								<TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{text.headers.eps}
								</TableHead>
								<TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{text.headers.blood}
								</TableHead>
								<TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{text.headers.registry}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{patients.map((p) => (
								<TableRow key={p.id}>
									<TableCell className="px-4 py-3">
										<div className="flex items-center gap-3">
											<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
												<span className="text-xs font-semibold text-primary">
													{p.nombre[0]}
													{p.apellido[0]}
												</span>
											</div>
											<div>
												<p className="font-medium text-foreground">
													{p.nombre} {p.apellido}
												</p>
												<div className="flex items-center gap-1 text-xs text-muted-foreground">
													<EnvelopeIcon className="h-3 w-3" />
													{p.email}
												</div>
											</div>
										</div>
									</TableCell>
									<TableCell className="px-4 py-3">
										{p.tipoDocumento && p.numeroDocumento ? (
											<div className="flex items-center gap-1.5 text-muted-foreground">
												<IdentificationIcon className="h-3.5 w-3.5 text-muted-foreground/80" />
												<span className="text-xs">
													{p.tipoDocumento}: {p.numeroDocumento}
												</span>
											</div>
										) : (
											<span className="text-xs text-muted-foreground/60">
												—
											</span>
										)}
									</TableCell>
									<TableCell className="px-4 py-3">
										{p.eps ? (
											<div className="flex items-center gap-1.5 text-muted-foreground">
												<ShieldCheckIcon className="h-3.5 w-3.5 text-muted-foreground/80" />
												<span className="text-xs">{p.eps}</span>
											</div>
										) : (
											<span className="text-xs text-muted-foreground/60">
												—
											</span>
										)}
									</TableCell>
									<TableCell className="px-4 py-3">
										{p.tipoSangre ? (
											<Badge
												variant={
													bloodTypeColor(p.tipoSangre) as
														| 'outline'
														| 'destructive'
												}
											>
												{p.tipoSangre}
											</Badge>
										) : (
											<span className="text-xs text-muted-foreground/60">
												—
											</span>
										)}
									</TableCell>
									<TableCell className="px-4 py-3 text-xs text-muted-foreground">
										{new Date(p.creadoEn).toLocaleDateString('es-CO')}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
