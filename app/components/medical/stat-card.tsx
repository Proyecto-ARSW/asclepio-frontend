import { motion } from 'motion/react';
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
	// delay permite escalonar tarjetas hermanas: delay={index * 0.08}
	delay?: number;
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
		icon: 'bg-primary/20 text-primary',
		value: 'text-primary',
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
	delay = 0,
}: StatCardProps) {
	const colors = colorMap[color];

	return (
		// whileInView: se anima solo cuando entra en el viewport (once:true = no se repite)
		// whileHover: levita 4px — spring suave para feedback inmediato sin rebote exagerado
		<motion.div
			initial={{ opacity: 0, y: 18 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: '-40px' }}
			transition={{ duration: 0.45, ease: 'easeOut', delay }}
			whileHover={{ y: -4 }}
		>
			<Card className="h-full transition-shadow duration-300 hover:shadow-md">
				<CardHeader className="flex flex-row items-start justify-between pb-0">
					<CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
						{title}
					</CardTitle>
					{/* El icono hace un micro-scale al entrar la tarjeta con retraso adicional */}
					<motion.div
						className={`rounded-lg p-2.5 ${colors.icon}`}
						initial={{ scale: 0.7, opacity: 0 }}
						whileInView={{ scale: 1, opacity: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.3, delay: delay + 0.15, ease: 'backOut' }}
					>
						<Icon className="h-5 w-5" />
					</motion.div>
				</CardHeader>
				<CardContent>
					<p className={`text-2xl font-bold ${colors.value}`}>{value}</p>
					{subtitle && (
						<p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
					)}
				</CardContent>
			</Card>
		</motion.div>
	);
}

// Daniel Useche
