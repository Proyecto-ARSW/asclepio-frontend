import { Loading03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { currentLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { cn } from '@/lib/utils';

function Spinner({
	className,
	strokeWidth = 2,
	...props
}: React.ComponentProps<'svg'>) {
	const locale = currentLocale();

	return (
		<HugeiconsIcon
			icon={Loading03Icon}
			strokeWidth={Number(strokeWidth)}
			role="status"
			aria-label={m.a11ySpinnerLoading({}, { locale })}
			className={cn('size-4 animate-spin', className)}
			{...props}
		/>
	);
}

export { Spinner };
