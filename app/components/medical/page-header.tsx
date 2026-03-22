import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge/badge.component';
import { Button } from '@/components/ui/button/button.component';

interface PageHeaderProps {
	title: string;
	subtitle?: string;
	badge?: string;
	action?: {
		label: string;
		loading?: boolean;
		onClick: () => void;
	};
}

export function PageHeader({
	title,
	subtitle,
	badge,
	action,
}: PageHeaderProps) {
	return (
		<div className="mb-6 flex items-start justify-between gap-3">
			<div>
				<div className="flex items-center gap-2">
					<h2 className="text-xl font-bold text-foreground">{title}</h2>
					{badge && <Badge variant="secondary">{badge}</Badge>}
				</div>
				{subtitle && (
					<p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
				)}
			</div>

			{action && (
				<Button
					type="button"
					onClick={action.onClick}
					disabled={action.loading}
					className="gap-2"
				>
					<ArrowPathIcon
						className={`h-4 w-4 ${action.loading ? 'animate-spin' : ''}`}
					/>
					{action.loading ? 'Cargando...' : action.label}
				</Button>
			)}
		</div>
	);
}
