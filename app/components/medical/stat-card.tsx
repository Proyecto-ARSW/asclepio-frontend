import type { ComponentType, SVGProps } from 'react';

interface StatCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: ComponentType<SVGProps<SVGSVGElement>>;
	color?: 'blue' | 'green' | 'violet' | 'amber' | 'rose';
}

const colorMap = {
	blue: {
		bg: 'bg-blue-50',
		icon: 'bg-blue-100 text-blue-600',
		value: 'text-blue-700',
	},
	green: {
		bg: 'bg-emerald-50',
		icon: 'bg-emerald-100 text-emerald-600',
		value: 'text-emerald-700',
	},
	violet: {
		bg: 'bg-violet-50',
		icon: 'bg-violet-100 text-violet-600',
		value: 'text-violet-700',
	},
	amber: {
		bg: 'bg-amber-50',
		icon: 'bg-amber-100 text-amber-600',
		value: 'text-amber-700',
	},
	rose: {
		bg: 'bg-rose-50',
		icon: 'bg-rose-100 text-rose-600',
		value: 'text-rose-700',
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
		<div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm`}>
			<div className="flex items-start justify-between">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
						{title}
					</p>
					<p className={`mt-1 text-2xl font-bold ${colors.value}`}>{value}</p>
					{subtitle && (
						<p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
					)}
				</div>
				<div className={`rounded-lg p-2.5 ${colors.icon}`}>
					<Icon className="h-5 w-5" />
				</div>
			</div>
		</div>
	);
}
