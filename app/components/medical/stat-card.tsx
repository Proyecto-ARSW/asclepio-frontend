import type { ComponentType, SVGProps } from 'react';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';

interface StatCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: ComponentType<SVGProps<SVGSVGElement>>;
	color?: 'blue' | 'green' | 'violet' | 'amber' | 'rose';
}

const colorMap = {
	blue: {
		icon: 'bg-primary/15 text-primary',
		value: 'text-primary',
	},
	green: {
		icon: 'bg-secondary text-secondary-foreground',
		value: 'text-secondary-foreground',
	},
	violet: {
		icon: 'bg-tertiary/20 text-tertiary',
		value: 'text-tertiary',
	},
	amber: {
		icon: 'bg-accent text-accent-foreground',
		value: 'text-accent-foreground',
	},
	rose: {
		icon: 'bg-destructive/10 text-destructive',
		value: 'text-destructive',
	},
};

export function StatCard({
	title,
	value,
	subtitle,
	icon: Icon,
	color = 'blue',
}: StatCardProps) {
	const colors = colorMap[color];

	return (
		<Card className="h-full">
			<CardHeader className="flex flex-row items-start justify-between pb-0">
				<CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
					{title}
				</CardTitle>
				<div className={`rounded-lg p-2.5 ${colors.icon}`}>
					<Icon className="h-5 w-5" />
				</div>
			</CardHeader>
			<CardContent>
				<p className={`text-2xl font-bold ${colors.value}`}>{value}</p>
				{subtitle && (
					<p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
				)}
			</CardContent>
		</Card>
	);
}
