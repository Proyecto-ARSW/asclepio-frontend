import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { motion } from 'motion/react';
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
		// fade + slide desde arriba al montar la vista del dashboard
		<motion.div
			className="mb-6 flex items-start justify-between gap-3"
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, ease: 'easeOut' }}
		>
			<div>
				<div className="flex items-center gap-2">
					<h2 className="text-xl font-bold text-foreground">{title}</h2>
					{badge && (
						<motion.span
							initial={{ scale: 0.8, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ delay: 0.15, duration: 0.25, ease: 'backOut' }}
						>
							<Badge variant="secondary">{badge}</Badge>
						</motion.span>
					)}
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
		</motion.div>
	);
}

// Daniel Useche
