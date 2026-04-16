import { ChevronDownIcon, LanguageIcon } from '@heroicons/react/24/outline';
import { useLocation } from 'react-router';
import { buttonVariants } from '@/components/ui/button/button.component';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/dropdown-menu.component';
import { type AppLocale, localePath } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { cn } from '@/lib/utils';

const LOCALE_OPTIONS: AppLocale[] = ['es', 'en', 'pt', 'fr', 'de'];

function getLocaleLabel(option: AppLocale, locale: AppLocale): string {
	switch (option) {
		case 'es':
			return m.dashboardSettingsLanguageEs({}, { locale });
		case 'en':
			return m.dashboardSettingsLanguageEn({}, { locale });
		case 'pt':
			return m.dashboardSettingsLanguagePt({}, { locale });
		case 'fr':
			return m.dashboardSettingsLanguageFr({}, { locale });
		default:
			return m.dashboardSettingsLanguageDe({}, { locale });
	}
}

interface LanguageSwitcherProps {
	locale: AppLocale;
	triggerClassName?: string;
	contentAlign?: 'start' | 'center' | 'end';
}

// Se usa <a> en lugar de <Link> porque cambiar de idioma requiere una
// recarga completa de la página para que el servidor inicialice el locale
// correcto. React Router <Link> intenta una navegación client-side que
// dispara fetchAndApplyManifestPatches para rutas con prefijo de idioma
// que no existen en el manifiesto, produciendo "Failed to fetch".
export function LanguageSwitcher({
	locale,
	triggerClassName,
	contentAlign = 'end',
}: LanguageSwitcherProps) {
	const location = useLocation();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					buttonVariants({ variant: 'outline', size: 'sm' }),
					'h-8 gap-1.5 rounded-full px-2.5 text-xs font-semibold',
					triggerClassName,
				)}
				aria-label={m.dashboardSettingsLanguageTitle({}, { locale })}
			>
				<LanguageIcon className="h-4 w-4" aria-hidden="true" />
				<span>{locale.toUpperCase()}</span>
				<ChevronDownIcon
					className="h-3.5 w-3.5 text-muted-foreground"
					aria-hidden="true"
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align={contentAlign}
				className="w-44 rounded-xl border border-border/80 bg-card/95 p-1.5 backdrop-blur"
			>
				{LOCALE_OPTIONS.map((option) => {
					const targetPath = `${localePath(location.pathname, option)}${location.search}${location.hash}`;
					const active = option === locale;

					return (
						<a
							key={option}
							href={targetPath}
							aria-current={active ? 'true' : undefined}
							className={cn(
								'flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
								active && 'bg-muted font-semibold text-foreground',
							)}
						>
							<span>{getLocaleLabel(option, locale)}</span>
							<span
								className={cn(
									'text-[10px] font-semibold text-muted-foreground',
									active && 'text-primary',
								)}
							>
								{option.toUpperCase()}
							</span>
						</a>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
// Daniel Useche
