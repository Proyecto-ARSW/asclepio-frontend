import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ExternalLink } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const linkVariants = cva(
	'inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				default: 'text-primary',
				muted: 'text-muted-foreground hover:text-foreground',
				destructive: 'text-destructive',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

export interface LinkProps
	extends useRender.ComponentProps<'a'>,
		VariantProps<typeof linkVariants> {
	external?: boolean;
}

function Link({
	className,
	variant,
	external,
	render,
	children,
	...props
}: LinkProps) {
	return useRender({
		defaultTagName: 'a',
		props: mergeProps<'a'>(
			{
				className: cn(linkVariants({ variant }), className),
				...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
			},
			{
				...props,
				children: (
					<>
						{children}
						{external && (
							<HugeiconsIcon icon={ExternalLink} className="h-3 w-3" />
						)}
					</>
				),
			},
		),
		render,
		state: {
			slot: 'link',
		},
	});
}

export { Link, linkVariants };
