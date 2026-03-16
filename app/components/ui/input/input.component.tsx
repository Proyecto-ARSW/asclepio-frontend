import { Input as InputPrimitive } from '@base-ui/react/input';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const inputVariants = cva(
	'w-full min-w-0 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50',
	{
		variants: {
			variant: {
				default:
					'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-8 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors file:h-6 file:text-sm file:font-medium focus-visible:ring-3 aria-invalid:ring-3 md:text-sm file:text-foreground placeholder:text-muted-foreground file:inline-flex file:border-0 file:bg-transparent',
				underline:
					'border-0 border-b border-border/50 rounded-none bg-transparent px-0 py-2 text-sm transition-colors focus-visible:border-foreground focus-visible:ring-0 placeholder:text-muted-foreground/50',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

function Input({
	className,
	type,
	variant,
	...props
}: React.ComponentProps<'input'> & VariantProps<typeof inputVariants>) {
	return (
		<InputPrimitive
			type={type}
			data-slot="input"
			className={cn(inputVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Input };
