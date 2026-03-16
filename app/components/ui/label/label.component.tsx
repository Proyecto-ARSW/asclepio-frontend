import type * as React from 'react';
import { cn } from '@/lib/utils';

function Label({
	className,
	htmlFor,
	children,
	...props
}: React.ComponentProps<'label'>) {
	if (!htmlFor && !children) {
		console.warn(
			'Label component should have either an "htmlFor" prop or children (input element) for accessibility.',
		);
	}
	return (
		<label
			data-slot="label"
			className={cn(
				'gap-2 text-sm leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed',
				className,
			)}
			htmlFor={htmlFor}
			{...props}
		>
			{children}
		</label>
	);
}

function RequiredLabelIndicator({
	className,
	...props
}: React.ComponentProps<'span'>) {
	return (
		<span
			aria-hidden="true"
			className={cn('text-destructive text-sm leading-none', className)}
			{...props}
		>
			*
		</span>
	);
}

export { Label, RequiredLabelIndicator };
