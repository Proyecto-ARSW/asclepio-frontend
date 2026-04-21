import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Link, useLocation, useNavigate } from 'react-router';
import { buttonVariants } from '@/components/ui/button/button.component';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/card.component';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select/select.component';
import { LanguageSwitcher } from '@/features/i18n/language-switcher';
import { currentLocale, localePath, type AppLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import { cn } from '@/lib/utils';
import {
	getLegalDocumentBody,
	getLegalDocumentOptions,
	getLegalDocumentTitle,
	type LegalDocumentId,
} from './legal-content';

interface LegalDocumentPageShellProps {
	documentId: LegalDocumentId;
}

export function LegalDocumentPageShell({
	documentId,
}: Readonly<LegalDocumentPageShellProps>) {
	const navigate = useNavigate();
	const location = useLocation();
	const locale = currentLocale(location.pathname) as AppLocale;
	const options = getLegalDocumentOptions(locale);
	const body = getLegalDocumentBody(documentId, locale);
	const title = getLegalDocumentTitle(documentId, locale);

	return (
		<main
			aria-label={m.a11yLandmarkMain({}, { locale })}
			className="min-h-screen bg-background px-4 py-4 sm:px-6 lg:px-8"
		>
			<div className="mx-auto max-w-4xl space-y-4">
				<section className="sticky top-0 z-30 -mx-4 border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
					<div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<Link
							to={localePath('/', locale)}
							className="inline-flex items-center gap-2 self-start rounded-full border border-border/70 bg-card/90 px-3 py-1.5 shadow-sm backdrop-blur"
						>
							<img
								src="/favicon.png"
								alt={m.homeLandingBrand({}, { locale })}
								className="h-6 w-6 rounded-full border border-border/70 bg-card object-contain"
							/>
							<span className="text-sm font-semibold text-foreground">
								{m.homeLandingBrand({}, { locale })}
							</span>
						</Link>

						<div className="flex flex-wrap items-center gap-2 sm:justify-end">
							<LanguageSwitcher
								locale={locale}
								triggerClassName="h-8 shrink-0 rounded-full bg-card/90 px-2.5 text-xs font-semibold backdrop-blur"
							/>
							<Link
								to={localePath('/', locale)}
								className={cn(
									buttonVariants({ variant: 'outline', size: 'sm' }),
									'h-8 shrink-0 rounded-full px-3',
								)}
							>
								<ArrowLeftIcon className="h-4 w-4" />
								{m.legalBackHome({}, { locale })}
							</Link>
						</div>
					</div>
				</section>

				<Card className="rounded-3xl border-border/70">
					<CardHeader className="space-y-3 pb-4">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
							{m.legalSectionEyebrow({}, { locale })}
						</p>
						<CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
							{title}
						</CardTitle>
						<div className="max-w-md space-y-1">
							<p className="text-sm text-muted-foreground">
								{m.legalMenuLabel({}, { locale })}
							</p>
							<Select
								value={documentId}
								onValueChange={(value) => {
									const selected = options.find((item) => item.id === value);
									if (!selected) return;
									navigate(localePath(selected.path, locale));
								}}
							>
								<SelectTrigger className="h-10 w-full">
									<SelectValue>
										{getLegalDocumentTitle(documentId, locale)}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{options.map((option) => (
										<SelectItem key={option.id} value={option.id}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CardHeader>
					<CardContent>
						<article className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-5 text-sm leading-7 text-foreground sm:px-6 sm:text-base whitespace-pre-wrap">
							{body}
						</article>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
