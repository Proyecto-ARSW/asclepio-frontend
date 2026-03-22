import {
	ArrowRightIcon,
	BeakerIcon,
	ChartBarSquareIcon,
	CheckBadgeIcon,
	HeartIcon,
	LifebuoyIcon,
	LinkIcon,
	MoonIcon,
	PlayCircleIcon,
	SparklesIcon,
	SunIcon,
	UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { Link, redirect, useLocation } from 'react-router';
import { Badge } from '@/components/ui/badge/badge.component';
import { buttonVariants } from '@/components/ui/button/button.component';
import { Card, CardContent } from '@/components/ui/card/card.component';
import { currentLocale, localePath } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';
import {
	applyUiPreferences,
	readUiPreferences,
	saveUiPreferences,
	type ThemeMode,
} from '@/features/preferences/ui-preferences';
import { cn } from '@/lib/utils';

export async function clientLoader() {
	if (typeof window === 'undefined') return null;
	const locale = currentLocale(window.location.pathname);
	const raw = localStorage.getItem('asclepio-auth');
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			if (parsed.state?.accessToken)
				return redirect(localePath('/dashboard', locale));
			if (parsed.state?.preToken)
				return redirect(localePath('/select-hospital', locale));
		} catch {}
	}
	return null;
}

export function meta() {
	const locale = currentLocale();
	return [{ title: m.homeLandingMetaTitle({}, { locale }) }];
}

export default function HomePage() {
	const location = useLocation();
	const locale = currentLocale(location.pathname);
	const [isDarkMode, setIsDarkMode] = useState(false);
	const nextLocale = locale === 'es' ? 'en' : 'es';
	const localeTogglePath = `${localePath(location.pathname, nextLocale)}${location.search}${location.hash}`;
	const navItems = [
		{ id: 'home', label: m.homeLandingNavHome({}, { locale }) },
		{ id: 'about', label: m.homeLandingNavAbout({}, { locale }) },
		{ id: 'services', label: m.homeLandingNavServices({}, { locale }) },
		{ id: 'blog', label: m.homeLandingNavBlog({}, { locale }) },
	];
	const services = [
		{
			title: m.homeLandingServicePrimaryTitle({}, { locale }),
			description: m.homeLandingServicePrimaryDescription({}, { locale }),
			icon: HeartIcon,
		},
		{
			title: m.homeLandingServicePediatricsTitle({}, { locale }),
			description: m.homeLandingServicePediatricsDescription({}, { locale }),
			icon: SparklesIcon,
		},
		{
			title: m.homeLandingServiceCardiologyTitle({}, { locale }),
			description: m.homeLandingServiceCardiologyDescription({}, { locale }),
			icon: LifebuoyIcon,
		},
	];
	const stats = [
		{ value: '30M+', label: m.homeLandingStatUsers({}, { locale }) },
		{ value: '30%', label: m.homeLandingStatSavings({}, { locale }) },
		{ value: '$100M', label: m.homeLandingStatCapital({}, { locale }) },
		{ value: '60+', label: m.homeLandingStatTeam({}, { locale }) },
	];

	const integrations = [
		{ icon: LinkIcon, label: m.homeLandingIntegrationFhir({}, { locale }) },
		{
			icon: ChartBarSquareIcon,
			label: m.homeLandingIntegrationAnalytics({}, { locale }),
		},
		{ icon: UserGroupIcon, label: m.homeLandingIntegrationEhr({}, { locale }) },
		{
			icon: CheckBadgeIcon,
			label: m.homeLandingIntegrationClaims({}, { locale }),
		},
	];

	const channels = [
		m.homeLandingChannelVoice({}, { locale }),
		m.homeLandingChannelWhatsapp({}, { locale }),
		m.homeLandingChannelTelegram({}, { locale }),
	];

	const roles = [
		m.authRolePatient({}, { locale }),
		m.authRoleDoctor({}, { locale }),
		m.authRoleAdmin({}, { locale }),
		m.authRoleReceptionist({}, { locale }),
		m.authRoleNurse({}, { locale }),
	];

	const scrollToSection = (id: string) => {
		if (typeof document === 'undefined') return;
		document.getElementById(id)?.scrollIntoView({
			behavior: 'smooth',
			block: 'start',
		});
	};

	useEffect(() => {
		if (typeof document === 'undefined') return;
		setIsDarkMode(document.documentElement.classList.contains('dark'));
	}, []);

	function handleThemeToggle() {
		if (typeof document === 'undefined') return;
		const currentlyDark = document.documentElement.classList.contains('dark');
		const nextTheme: ThemeMode = currentlyDark ? 'light' : 'dark';
		const currentPrefs = readUiPreferences();
		const nextPrefs = { ...currentPrefs, theme: nextTheme };
		applyUiPreferences(nextPrefs);
		saveUiPreferences(nextPrefs);
		setIsDarkMode(!currentlyDark);
	}

	return (
		<main className="relative overflow-x-clip bg-background text-foreground selection:bg-primary/20">
			<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_oklch,var(--color-primary)_20%,transparent),transparent_34%),radial-gradient(circle_at_80%_18%,color-mix(in_oklch,var(--color-secondary)_35%,white),transparent_30%),linear-gradient(180deg,color-mix(in_oklch,var(--color-background)_96%,white)_0%,color-mix(in_oklch,var(--color-secondary)_20%,white)_52%,var(--color-background)_100%)]" />

			<section
				id="home"
				className="sticky top-0 z-40 border-b border-border/50 bg-background/80 px-4 py-4 backdrop-blur-xl motion-safe:animate-step-in sm:px-6 lg:px-8"
			>
				<div className="mx-auto max-w-7xl rounded-[2rem] border border-border/60 bg-card/80 px-4 py-3 shadow-sm sm:px-6">
					<nav className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-2">
							<img
								src="/favicon.png"
								alt={m.homeLandingBrand({}, { locale })}
								className="h-10 w-10 rounded-full border border-border/70 bg-card object-contain"
							/>
							<span className="text-sm font-semibold tracking-tight">
								{m.homeLandingBrand({}, { locale })}
							</span>
						</div>

						<ul className="hidden items-center gap-2 text-sm md:flex">
							{navItems.map((item) => (
								<li key={item.id}>
									<button
										type="button"
										onClick={() => scrollToSection(item.id)}
										className="rounded-full px-3 py-2 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
									>
										{item.label}
									</button>
								</li>
							))}
						</ul>

						<div className="flex items-center gap-2 sm:gap-3">
							<button
								type="button"
								onClick={handleThemeToggle}
								aria-label={m.homeLandingThemeToggle({}, { locale })}
								className={cn(
									buttonVariants({ variant: 'outline', size: 'sm' }),
									'h-8 w-10 shrink-0 rounded-full px-0',
								)}
							>
								{isDarkMode ? (
									<SunIcon className="h-4 w-4" />
								) : (
									<MoonIcon className="h-4 w-4" />
								)}
							</button>
							<Link
								to={localeTogglePath}
								className={cn(
									buttonVariants({ variant: 'outline', size: 'sm' }),
									'h-8 w-16 shrink-0 rounded-full px-0 font-semibold',
								)}
							>
								EN/ES
							</Link>
							<Link
								to={localePath('/register', locale)}
								className={cn(
									buttonVariants({ variant: 'ghost', size: 'sm' }),
									'h-8 w-30 shrink-0 rounded-full px-0',
								)}
							>
								{m.homeLandingGetStarted({}, { locale })}
							</Link>
							<Link
								to={localePath('/login', locale)}
								className={cn(
									buttonVariants({ size: 'sm' }),
									'h-8 w-30 shrink-0 rounded-full px-0',
								)}
							>
								{m.homeLandingContactUs({}, { locale })}
								<ArrowRightIcon className="h-3.5 w-3.5" />
							</Link>
						</div>
					</nav>
					<div className="mt-3 flex gap-2 overflow-x-auto md:hidden">
						{navItems.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => scrollToSection(item.id)}
								className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
							>
								{item.label}
							</button>
						))}
					</div>
				</div>
			</section>

			<section
				id="about"
				className="scroll-mt-28 px-4 pb-10 pt-8 motion-safe:animate-step-in-left sm:px-6 lg:px-8"
			>
				<div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-xl lg:grid-cols-[1.08fr_0.92fr] lg:p-8">
					<div className="space-y-6">
						<Badge
							variant="secondary"
							className="rounded-full px-3 py-1 text-xs"
						>
							<span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
							{m.homeLandingTrustedBadge({}, { locale })}
						</Badge>
						<h1 className="max-w-xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
							{m.homeLandingHeroTitle({}, { locale })}
						</h1>
						<p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
							{m.homeLandingHeroSubtitle({}, { locale })}
						</p>

						<div className="space-y-3">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
								{m.homeLandingChannelsTitle({}, { locale })}
							</p>
							<div className="flex flex-wrap gap-2">
								{channels.map((channel) => (
									<Badge
										key={channel}
										variant="outline"
										className="rounded-full"
									>
										{channel}
									</Badge>
								))}
							</div>
						</div>

						<div className="space-y-3">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
								{m.homeLandingRolesTitle({}, { locale })}
							</p>
							<div className="flex flex-wrap gap-2">
								{roles.map((role) => (
									<Badge
										key={role}
										variant="secondary"
										className="rounded-full"
									>
										{role}
									</Badge>
								))}
							</div>
						</div>

						<Link
							to={localePath('/register', locale)}
							className={cn(
								buttonVariants({ size: 'lg' }),
								'inline-flex rounded-full px-5 transition-all duration-300 hover:-translate-y-0.5',
							)}
						>
							{m.homeLandingHeroCta({}, { locale })}
							<ArrowRightIcon className="h-4 w-4" />
						</Link>
					</div>

					<div className="relative min-h-100 rounded-[2rem] border border-border/50 bg-linear-to-br from-secondary via-background to-accent p-4 shadow-sm sm:min-h-105 sm:p-6">
						<div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--color-primary)_35%,white)_0%,transparent_72%)]" />
						<img
							src="/images/doctor-image.webp"
							alt={m.homeLandingDoctorImageAlt({}, { locale })}
							loading="eager"
							decoding="async"
							fetchPriority="high"
							className="relative z-10 mt-20 mx-auto h-110 w-80 rounded-[1.75rem] object-cover object-top shadow-md sm:mt-8"
						/>

						<div className="absolute left-4 top-4 rounded-2xl border border-border bg-card/90 p-3 shadow-sm backdrop-blur md:left-6 md:top-6">
							<div className="mb-2 flex items-center gap-2">
								<BeakerIcon className="h-4 w-4 text-primary" />
								<p className="text-xs font-semibold text-foreground">
									{m.homeLandingTestCardTitle({}, { locale })}
								</p>
							</div>
							<div className="h-10 w-32 rounded-xl bg-linear-to-r from-secondary via-background to-accent p-2">
								<div className="h-full w-full rounded-md bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-primary)_24%,transparent)_20%,transparent_20%)] bg-size-[10px_10px]" />
							</div>
						</div>

						<div className="absolute bottom-4 right-4 flex items-center gap-3 rounded-full border border-border bg-card/90 px-4 py-2 shadow-sm backdrop-blur md:bottom-6 md:right-6">
							<PlayCircleIcon className="h-6 w-6 text-primary" />
							<div>
								<p className="text-[10px] uppercase tracking-wide text-muted-foreground">
									{m.homeLandingIncomingCall({}, { locale })}
								</p>
								<p className="text-xs font-semibold text-foreground">
									{m.homeLandingIncomingDoctor({}, { locale })}
								</p>
							</div>
							<span className="h-2.5 w-2.5 rounded-full bg-primary" />
						</div>
					</div>
				</div>
			</section>

			<section
				id="blog"
				className="scroll-mt-28 px-4 pb-12 motion-safe:animate-step-in sm:px-6 lg:px-8"
			>
				<Card className="mx-auto max-w-7xl rounded-[2rem] border-border/50 bg-card px-6 py-10 text-center shadow-sm">
					<p className="text-2xl font-semibold tracking-tight text-foreground">
						{m.homeLandingSocialProofTitle({}, { locale })}
					</p>
					<div className="mt-8 grid grid-cols-3 gap-5 text-muted-foreground grayscale sm:grid-cols-6">
						{['Invert', 'hues', 'Orbit', 'hues', 'Pulse', 'Labs'].map(
							(logo) => (
								<div key={logo} className="text-sm font-semibold tracking-wide">
									{logo}
								</div>
							),
						)}
					</div>
				</Card>
			</section>

			<section
				id="services"
				className="scroll-mt-28 px-4 pb-14 motion-safe:animate-step-in-right sm:px-6 lg:px-8"
			>
				<div className="mx-auto max-w-7xl rounded-[2rem] border border-border/60 bg-card/85 px-6 py-12 shadow-sm backdrop-blur">
					<div className="mx-auto max-w-2xl text-center">
						<p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
							{m.homeLandingServicesEyebrow({}, { locale })}
						</p>
						<h2 className="mt-3 text-4xl font-bold tracking-tight text-foreground">
							{m.homeLandingServicesTitle({}, { locale })}
						</h2>
						<p className="mt-3 text-sm text-muted-foreground">
							{m.homeLandingServicesDescription({}, { locale })}
						</p>
					</div>

					<div className="mt-10 grid gap-5 md:grid-cols-3">
						{services.map((service) => (
							<Card
								key={service.title}
								className="rounded-3xl border-border/60 bg-background/95 p-6 transition-all duration-500 motion-reduce:transition-none hover:-translate-y-1 hover:shadow-md"
							>
								<CardContent className="px-0">
									<div className="grid h-12 w-12 place-items-center rounded-full border border-border bg-card">
										<service.icon className="h-5 w-5 text-primary" />
									</div>
									<h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
										{service.title}
									</h3>
									<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
										{service.description}
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			<section className="px-4 pb-14 motion-safe:animate-step-in sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl rounded-[2rem] border border-border/60 bg-card px-6 py-12 shadow-sm">
					<h2 className="mx-auto max-w-xl text-center text-4xl font-bold tracking-tight text-foreground">
						{m.homeLandingIntegrationsTitle({}, { locale })}
					</h2>

					<div className="relative mt-12 grid place-items-center">
						<div className="absolute h-60 w-60 rounded-full border border-border" />
						<div className="absolute h-84 w-84 max-w-full rounded-full border border-border/40" />
						<div className="grid h-20 w-20 place-items-center rounded-full border border-border bg-background shadow-sm">
							<span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
								M
							</span>
						</div>
						<div className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
							{integrations.map((item) => (
								<div
									key={item.label}
									className="relative flex flex-col items-center gap-2 rounded-2xl border border-border bg-background/80 p-4"
								>
									<div className="absolute -top-6 left-1/2 h-6 w-px -translate-x-1/2 bg-border" />
									<div className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card">
										<item.icon className="h-5 w-5 text-primary" />
									</div>
									<p className="text-xs font-semibold text-muted-foreground">
										{item.label}
									</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			<section className="px-4 pb-14 motion-safe:animate-step-in sm:px-6 lg:px-8">
				<div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-linear-to-r from-primary via-secondary to-primary px-6 py-16 text-center text-primary-foreground shadow-md">
					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.45)_1.5px,transparent_2px)] bg-size-[14px_14px] opacity-45" />
					<h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
						{m.homeLandingCtaTitle({}, { locale })}
					</h2>
					<Link
						to={localePath('/register', locale)}
						className={cn(
							buttonVariants({ variant: 'secondary', size: 'lg' }),
							'mt-6 inline-flex rounded-full border border-white/30 bg-white/90 px-5 text-primary transition-all duration-500 motion-reduce:transition-none hover:-translate-y-0.5 hover:bg-white',
						)}
					>
						{m.homeLandingCtaButton({}, { locale })}
						<ArrowRightIcon className="h-4 w-4" />
					</Link>
				</div>
			</section>

			<section className="px-4 pb-20 motion-safe:animate-step-in sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl space-y-8 rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
					<div className="mx-auto grid max-w-4xl grid-cols-2 justify-items-center gap-6 text-center sm:grid-cols-4">
						{stats.map((stat) => (
							<div key={stat.label} className="flex flex-col items-center">
								<p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
									{stat.value}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{stat.label}
								</p>
							</div>
						))}
					</div>

					<div className="grid items-center gap-6 rounded-3xl border border-border/60 bg-background p-5 md:grid-cols-2">
						<div>
							<p className="text-sm font-semibold text-muted-foreground">
								{m.homeLandingTestimonialName({}, { locale })}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{m.homeLandingTestimonialRole({}, { locale })}
							</p>
							<blockquote className="mt-4 max-w-lg text-lg font-medium leading-relaxed tracking-tight text-foreground">
								{m.homeLandingTestimonialQuote({}, { locale })}
							</blockquote>
						</div>
						<img
							src="/images/doctor-image-2.webp"
							alt={m.homeLandingTestimonialImageAlt({}, { locale })}
							loading="lazy"
							decoding="async"
							className="h-56 w-full rounded-3xl object-cover md:h-64"
						/>
					</div>
				</div>
			</section>
		</main>
	);
}
