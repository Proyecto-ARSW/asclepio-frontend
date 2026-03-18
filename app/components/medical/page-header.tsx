import { ArrowPathIcon } from '@heroicons/react/24/outline';

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

export function PageHeader({ title, subtitle, badge, action }: PageHeaderProps) {
	return (
		<div className="mb-6 flex items-start justify-between">
			<div>
				<div className="flex items-center gap-2">
					<h2 className="text-xl font-bold text-gray-900">{title}</h2>
					{badge && (
						<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
							{badge}
						</span>
					)}
				</div>
				{subtitle && (
					<p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
				)}
			</div>

			{action && (
				<button
					type="button"
					onClick={action.onClick}
					disabled={action.loading}
					className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
				>
					<ArrowPathIcon
						className={`h-4 w-4 ${action.loading ? 'animate-spin' : ''}`}
					/>
					{action.loading ? 'Cargando...' : action.label}
				</button>
			)}
		</div>
	);
}
