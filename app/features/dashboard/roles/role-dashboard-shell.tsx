import type { ReactNode } from 'react';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card/card.component';

export function RoleDashboardShell({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle: string;
	children: ReactNode;
}) {
	return (
		<section className="space-y-4">
			<header className="space-y-1">
				<h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
					{title}
				</h1>
				<p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p>
			</header>
			<Card className="border-border/80 bg-card/90 shadow-sm">
				<CardHeader className="pb-2">
					<CardTitle className="text-base">{title}</CardTitle>
					<CardDescription>{subtitle}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">{children}</CardContent>
			</Card>
		</section>
	);
}
