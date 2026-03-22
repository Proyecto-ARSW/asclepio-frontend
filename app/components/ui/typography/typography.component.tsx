import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps {
	children: ReactNode;
	className?: string;
}

const h1Variants = cva(
	'scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance',
);
const h2Variants = cva(
	'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
);
const h3Variants = cva('scroll-m-20 text-2xl font-semibold tracking-tight');
const h4Variants = cva('scroll-m-20 text-xl font-semibold tracking-tight');
const pVariants = cva('leading-7 not-first:mt-6');
const blockquoteVariants = cva('mt-6 border-l-2 pl-6 italic');
const listVariants = cva('my-6 ml-6 list-disc [&>li]:mt-2');
const inlineCodeVariants = cva(
	'bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
);
const leadVariants = cva('text-muted-foreground text-xl');
const largeVariants = cva('text-lg font-semibold');
const smallVariants = cva('text-sm leading-none font-medium');
const mutedVariants = cva('text-muted-foreground text-sm');

export function TypographyH1({ children, className }: TypographyProps) {
	return <h1 className={cn(h1Variants(), className)}>{children}</h1>;
}

export function TypographyH2({ children, className }: TypographyProps) {
	return <h2 className={cn(h2Variants(), className)}>{children}</h2>;
}

export function TypographyH3({ children, className }: TypographyProps) {
	return <h3 className={cn(h3Variants(), className)}>{children}</h3>;
}

export function TypographyH4({ children, className }: TypographyProps) {
	return <h4 className={cn(h4Variants(), className)}>{children}</h4>;
}

export function TypographyP({ children, className }: TypographyProps) {
	return <p className={cn(pVariants(), className)}>{children}</p>;
}

export function TypographyBlockquote({ children, className }: TypographyProps) {
	return (
		<blockquote className={cn(blockquoteVariants(), className)}>
			{children}
		</blockquote>
	);
}

export function TypographyList({ children, className }: TypographyProps) {
	return <ul className={cn(listVariants(), className)}>{children}</ul>;
}

export function TypographyInlineCode({ children, className }: TypographyProps) {
	return (
		<code className={cn(inlineCodeVariants(), className)}>{children}</code>
	);
}

export function TypographyLead({ children, className }: TypographyProps) {
	return <p className={cn(leadVariants(), className)}>{children}</p>;
}

export function TypographyLarge({ children, className }: TypographyProps) {
	return <div className={cn(largeVariants(), className)}>{children}</div>;
}

export function TypographySmall({ children, className }: TypographyProps) {
	return <small className={cn(smallVariants(), className)}>{children}</small>;
}

export function TypographyMuted({ children, className }: TypographyProps) {
	return <p className={cn(mutedVariants(), className)}>{children}</p>;
}

export {
	blockquoteVariants,
	h1Variants,
	h2Variants,
	h3Variants,
	h4Variants,
	inlineCodeVariants,
	largeVariants,
	leadVariants,
	listVariants,
	mutedVariants,
	pVariants,
	smallVariants,
};
