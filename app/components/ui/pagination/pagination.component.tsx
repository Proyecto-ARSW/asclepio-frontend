import {
	ArrowLeft01Icon,
	ArrowRight01Icon,
	MoreHorizontalCircle01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type * as React from 'react';
import { Button } from '@/components/ui/button/button.component';
import { currentLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { cn } from '@/lib/utils';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
	const locale = currentLocale();

	return (
		<nav
			aria-label={m.a11yPaginationNav({}, { locale })}
			data-slot="pagination"
			className={cn('mx-auto flex w-full justify-center', className)}
			{...props}
		/>
	);
}

function PaginationContent({
	className,
	...props
}: React.ComponentProps<'ul'>) {
	return (
		<ul
			data-slot="pagination-content"
			className={cn('gap-0.5 flex items-center', className)}
			{...props}
		/>
	);
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
	return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
	isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
	React.ComponentProps<'a'>;

function PaginationLink({
	className,
	isActive,
	size = 'icon',
	...props
}: PaginationLinkProps) {
	return (
		<Button
			variant={isActive ? 'outline' : 'ghost'}
			size={size}
			className={cn(className)}
			nativeButton={false}
			render={
				<a
					aria-current={isActive ? 'page' : undefined}
					data-slot="pagination-link"
					data-active={isActive}
					{...props}
				/>
			}
		/>
	);
}

function PaginationPrevious({
	className,
	text = 'Previous',
	...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
	const locale = currentLocale();

	return (
		<PaginationLink
			aria-label={m.a11yPaginationPreviousPage({}, { locale })}
			size="default"
			className={cn('pl-1.5!', className)}
			{...props}
		>
			<HugeiconsIcon
				icon={ArrowLeft01Icon}
				strokeWidth={2}
				data-icon="inline-start"
			/>
			<span className="hidden sm:block">{text}</span>
		</PaginationLink>
	);
}

function PaginationNext({
	className,
	text = 'Next',
	...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
	const locale = currentLocale();

	return (
		<PaginationLink
			aria-label={m.a11yPaginationNextPage({}, { locale })}
			size="default"
			className={cn('pr-1.5!', className)}
			{...props}
		>
			<span className="hidden sm:block">{text}</span>
			<HugeiconsIcon
				icon={ArrowRight01Icon}
				strokeWidth={2}
				data-icon="inline-end"
			/>
		</PaginationLink>
	);
}

function PaginationEllipsis({
	className,
	...props
}: React.ComponentProps<'span'>) {
	const locale = currentLocale();

	return (
		<span
			aria-hidden
			data-slot="pagination-ellipsis"
			className={cn(
				"size-8 [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center",
				className,
			)}
			{...props}
		>
			<HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
			<span className="sr-only">
				{m.a11yPaginationMorePages({}, { locale })}
			</span>
		</span>
	);
}

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
};
