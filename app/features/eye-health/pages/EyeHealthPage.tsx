import { HandRaisedIcon, SunIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Button } from '@/components/ui/button/button.component';
import { Slider } from '@/components/ui/slider/slider.component';
import {
	formatEyeHealthText,
	getEyeHealthContent,
} from '@/features/eye-health/content/eye-health-content';
import {
	type AcuityDirection,
	useEyeHealthTest,
} from '@/features/eye-health/hooks/useEyeHealthTest';
import { currentLocale, localePath } from '@/features/i18n/locale-path';

const LANDOLT_SIZE_CLASSES = [
	'size-[11rem]',
	'size-[10rem]',
	'size-[9rem]',
	'size-[8rem]',
	'size-[7rem]',
	'size-[6rem]',
	'size-[5rem]',
	'size-[4rem]',
	'size-[3.5rem]',
	'size-[3rem]',
] as const;

const LANDOLT_BORDER_CLASSES = [
	'border-14',
	'border-13',
	'border-12',
	'border-11',
	'border-10',
	'border-9',
	'border-8',
	'border-7',
	'border-6',
	'border-5',
] as const;

function getCalibrationWidthClass(scalePercent: number): string {
	switch (scalePercent) {
		case 80:
			return 'w-[56%]';
		case 85:
			return 'w-[60%]';
		case 90:
			return 'w-[64%]';
		case 95:
			return 'w-[68%]';
		case 100:
			return 'w-[72%]';
		case 105:
			return 'w-[76%]';
		case 110:
			return 'w-[80%]';
		case 115:
			return 'w-[84%]';
		case 120:
			return 'w-[88%]';
		case 125:
			return 'w-[92%]';
		case 130:
			return 'w-[96%]';
		default:
			return 'w-full';
	}
}

function LandoltRing({
	direction,
	sizeClass,
	borderClass,
}: {
	direction: AcuityDirection;
	sizeClass: string;
	borderClass: string;
}) {
	const openingClass =
		direction === 'up'
			? 'top-[-1px] left-1/2 h-[34%] w-[18%] -translate-x-1/2 rounded-b-md'
			: direction === 'right'
				? 'right-[-1px] top-1/2 h-[18%] w-[34%] -translate-y-1/2 rounded-l-md'
				: direction === 'down'
					? 'bottom-[-1px] left-1/2 h-[34%] w-[18%] -translate-x-1/2 rounded-t-md'
					: 'left-[-1px] top-1/2 h-[18%] w-[34%] -translate-y-1/2 rounded-r-md';

	return (
		<div className="mx-auto flex w-full justify-center py-3">
			<div
				className={`relative ${sizeClass} ${borderClass} rounded-full border-foreground/85 bg-transparent`}
			>
				<div className={`absolute bg-background ${openingClass}`} />
			</div>
		</div>
	);
}

export function EyeHealthPage() {
	const location = useLocation();
	const locale = currentLocale(location.pathname);
	const content = getEyeHealthContent(locale);
	const prefersReducedMotion = useReducedMotion();
	const ishiharaInputRef = useRef<HTMLInputElement>(null);
	const [ishiharaInput, setIshiharaInput] = useState('');

	const {
		stepIndex,
		totalSteps,
		progressValue,
		canGoBack,
		step,
		calibrationScale,
		setCalibrationScale,
		isLeftLandoltStep,
		isRightLandoltStep,
		leftTestIndex,
		rightTestIndex,
		leftTargets,
		rightTargets,
		answerLandolt,
		isIshiharaStep,
		ishiharaIndex,
		currentIshiharaFile,
		ishiharaAnswers,
		submitIshiharaAnswer,
		validationError,
		clearValidationError,
		answerAstigmatism,
		advanceFromProcessing,
		goNext,
		goBack,
		restart,
		canSaveResult,
		saveState,
		saveResult,
		classification,
		acuityCorrectCount,
		leftCorrectCount,
		rightCorrectCount,
		colorCorrectCount,
	} = useEyeHealthTest();

	useEffect(() => {
		if (stepIndex !== step.PROCESSING) return;
		const timeout = window.setTimeout(() => {
			advanceFromProcessing();
		}, 1400);
		return () => {
			window.clearTimeout(timeout);
		};
	}, [stepIndex, step.PROCESSING, advanceFromProcessing]);

	useEffect(() => {
		if (!isIshiharaStep || !currentIshiharaFile) return;
		setIshiharaInput(ishiharaAnswers[currentIshiharaFile] ?? '');
		const raf = window.requestAnimationFrame(() => {
			ishiharaInputRef.current?.focus();
		});
		return () => {
			window.cancelAnimationFrame(raf);
		};
	}, [isIshiharaStep, currentIshiharaFile, ishiharaAnswers]);

	const stepCounter = formatEyeHealthText(
		content.fullScreen.common.stepCounter,
		{
			current: stepIndex + 1,
			total: totalSteps,
		},
	);

	const currentLandolt = useMemo(() => {
		if (isLeftLandoltStep && leftTestIndex >= 0) {
			return {
				eye: 'left' as const,
				index: leftTestIndex,
				target: leftTargets[leftTestIndex] ?? 'up',
			};
		}
		if (isRightLandoltStep && rightTestIndex >= 0) {
			return {
				eye: 'right' as const,
				index: rightTestIndex,
				target: rightTargets[rightTestIndex] ?? 'up',
			};
		}
		return null;
	}, [
		isLeftLandoltStep,
		leftTestIndex,
		leftTargets,
		isRightLandoltStep,
		rightTestIndex,
		rightTargets,
	]);

	const transition = prefersReducedMotion
		? { duration: 0 }
		: { duration: 0.26, ease: 'easeInOut' as const };

	const renderSingleAction = (label: string, onClick: () => void) => (
		<div className="sticky bottom-0 mt-auto border-t border-border/70 bg-background/94 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-4 backdrop-blur">
			<Button
				type="button"
				onClick={onClick}
				className="h-12 w-full rounded-xl text-sm font-semibold"
			>
				{label}
			</Button>
		</div>
	);

	return (
		<main className="relative h-screen overflow-hidden bg-background text-foreground">
			<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_12%,color-mix(in_oklch,var(--color-primary)_20%,transparent),transparent_36%),radial-gradient(circle_at_86%_14%,color-mix(in_oklch,var(--color-secondary)_34%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_oklch,var(--color-background)_96%,white)_0%,var(--color-background)_100%)]" />
			<div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pb-3 pt-3 sm:px-8 sm:pb-5 sm:pt-5">
				<header className="mb-2 flex items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
							{content.nav.eyeHealth}
						</p>
						<p className="text-xs font-medium">{stepCounter}</p>
					</div>
					<div className="flex items-center gap-2">
						{canGoBack && (
							<Button type="button" variant="ghost" size="sm" onClick={goBack}>
								{content.fullScreen.common.back}
							</Button>
						)}
						<Button type="button" variant="outline" size="sm" onClick={restart}>
							{content.fullScreen.common.restart}
						</Button>
					</div>
				</header>
				<div className="mb-4 h-1.5 rounded-full bg-muted">
					<div
						className="h-full rounded-full bg-primary transition-all"
						style={{ width: `${progressValue}%` }}
					/>
				</div>
				<AnimatePresence mode="wait">
					<motion.section
						key={stepIndex}
						initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
						transition={transition}
						className="flex min-h-0 flex-1 flex-col"
					>
						<div className="flex min-h-0 flex-1 flex-col justify-center gap-8 pb-3">
							{stepIndex === step.BRIGHTNESS && (
								<>
									<div className="mx-auto rounded-full border border-primary/40 bg-primary/10 p-5">
										<SunIcon className="size-16 text-primary" />
									</div>
									<div className="space-y-4 text-center">
										<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
											{content.fullScreen.brightness.title}
										</h1>
										<p className="text-muted-foreground mx-auto max-w-xl text-balance text-base leading-relaxed sm:text-lg">
											{content.fullScreen.brightness.description}
										</p>
									</div>
								</>
							)}
							{stepIndex === step.CALIBRATION && (
								<>
									<div className="space-y-4 text-center">
										<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
											{content.fullScreen.calibration.title}
										</h1>
										<p className="text-muted-foreground mx-auto max-w-xl text-balance text-base leading-relaxed sm:text-lg">
											{content.fullScreen.calibration.description}
										</p>
									</div>
									<div className="mx-auto w-full max-w-xl space-y-5 rounded-2xl border border-border/70 bg-card/70 p-5">
										<p className="text-sm font-medium">
											{formatEyeHealthText(
												content.fullScreen.calibration.scaleLabel,
												{
													value: calibrationScale,
												},
											)}
										</p>
										<Slider
											value={[calibrationScale]}
											min={80}
											max={130}
											step={5}
											onValueChange={(value) => {
												const next = Array.isArray(value)
													? (value[0] ?? 100)
													: value;
												setCalibrationScale(next);
											}}
											aria-label={content.fullScreen.calibration.scaleLabel}
										/>
										<p className="text-muted-foreground text-sm leading-relaxed">
											{content.fullScreen.calibration.cardInstruction}
										</p>
										<div className="rounded-xl border border-dashed border-border/80 bg-background/80 p-4">
											<div
												className={`mx-auto aspect-[1.586/1] rounded-md border-2 border-primary/80 bg-primary/10 transition-all ${getCalibrationWidthClass(
													calibrationScale,
												)}`}
											/>
										</div>
									</div>
								</>
							)}
							{stepIndex === step.LENSES && (
								<div className="space-y-5 text-center">
									<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
										{content.fullScreen.lenses.title}
									</h1>
								</div>
							)}
							{stepIndex === step.COVER_LEFT && (
								<>
									<div className="mx-auto rounded-full border border-border/70 bg-card/75 p-5">
										<HandRaisedIcon className="size-16 text-foreground" />
									</div>
									<div className="space-y-4 text-center">
										<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
											{content.fullScreen.coverLeft.title}
										</h1>
									</div>
								</>
							)}
							{stepIndex === step.DISTANCE && (
								<div className="space-y-4 text-center">
									<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
										{content.fullScreen.distance.title}
									</h1>
								</div>
							)}
							{currentLandolt && (
								<>
									<div className="space-y-3 text-center">
										<p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
											{currentLandolt.eye === 'left'
												? content.fullScreen.landolt.eyeLeft
												: content.fullScreen.landolt.eyeRight}
										</p>
										<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
											{content.fullScreen.landolt.title}
										</h1>
										<p className="text-muted-foreground text-sm">
											{formatEyeHealthText(content.fullScreen.landolt.counter, {
												current: currentLandolt.index + 1,
												total: 10,
											})}
										</p>
									</div>
									<LandoltRing
										direction={currentLandolt.target}
										sizeClass={
											LANDOLT_SIZE_CLASSES[currentLandolt.index] ??
											'size-[4rem]'
										}
										borderClass={
											LANDOLT_BORDER_CLASSES[currentLandolt.index] ?? 'border-5'
										}
									/>
								</>
							)}
							{stepIndex === step.COVER_RIGHT && (
								<>
									<div className="mx-auto rounded-full border border-border/70 bg-card/75 p-5">
										<HandRaisedIcon className="size-16 text-foreground" />
									</div>
									<div className="space-y-4 text-center">
										<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
											{content.fullScreen.coverRight.title}
										</h1>
									</div>
								</>
							)}
							{stepIndex === step.ISHIHARA_INTRO && (
								<div className="space-y-4 text-center">
									<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
										{content.fullScreen.ishiharaIntro.title}
									</h1>
									<p className="text-muted-foreground mx-auto max-w-xl text-balance text-base leading-relaxed sm:text-lg">
										{content.fullScreen.ishiharaIntro.description}
									</p>
								</div>
							)}
							{isIshiharaStep && currentIshiharaFile && (
								<div className="space-y-5">
									<div className="space-y-3 text-center">
										<h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
											{content.fullScreen.ishihara.title}
										</h1>
										<p className="text-muted-foreground text-sm">
											{formatEyeHealthText(
												content.fullScreen.ishihara.counter,
												{
													current: (ishiharaIndex >= 0 ? ishiharaIndex : 0) + 1,
													total: 13,
												},
											)}
										</p>
									</div>
									<div className="mx-auto w-full max-w-sm rounded-2xl border border-border/70 bg-card/70 p-3">
										<img
											src={`/images/ishihara/${currentIshiharaFile}`}
											alt={formatEyeHealthText(
												content.fullScreen.ishihara.imageAlt,
												{
													index: (ishiharaIndex >= 0 ? ishiharaIndex : 0) + 1,
												},
											)}
											className="mx-auto aspect-square w-full rounded-lg object-contain"
										/>
									</div>
									<form
										onSubmit={(event) => {
											event.preventDefault();
											submitIshiharaAnswer(
												ishiharaInput,
												content.fullScreen.ishihara.invalidChars,
											);
										}}
										className="space-y-2"
									>
										<input
											ref={ishiharaInputRef}
											inputMode="numeric"
											autoComplete="off"
											className="h-16 w-full rounded-xl border border-border bg-background px-4 text-center text-2xl font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
											placeholder={content.fullScreen.ishihara.inputPlaceholder}
											value={ishiharaInput}
											onChange={(event) => {
												setIshiharaInput(event.target.value);
												clearValidationError();
											}}
										/>
										<p className="text-muted-foreground text-center text-xs">
											{content.fullScreen.ishihara.emptyMeansNoSee}
										</p>
										{validationError && (
											<p className="text-destructive text-center text-sm">
												{validationError}
											</p>
										)}
									</form>
								</div>
							)}
							{stepIndex === step.ASTIGMATISM_INTRO && (
								<div className="space-y-4 text-center">
									<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
										{content.fullScreen.astigmatismIntro.title}
									</h1>
								</div>
							)}
							{(stepIndex === step.ASTIGMATISM_LEFT ||
								stepIndex === step.ASTIGMATISM_RIGHT) && (
								<div className="space-y-6">
									<div className="space-y-3 text-center">
										<h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
											{stepIndex === step.ASTIGMATISM_LEFT
												? formatEyeHealthText(
														content.fullScreen.astigmatism.title,
														{
															eye: content.fullScreen.astigmatism.eyeLeft,
														},
													)
												: formatEyeHealthText(
														content.fullScreen.astigmatism.title,
														{
															eye: content.fullScreen.astigmatism.eyeRight,
														},
													)}
										</h1>
									</div>
									<div className="mx-auto max-w-sm rounded-2xl border border-border/70 bg-card/70 p-4">
										<div className="mx-auto aspect-square w-full max-w-64 rounded-full border border-border/80 bg-[repeating-conic-gradient(color-mix(in_oklch,var(--color-foreground)_68%,transparent)_0deg_2deg,transparent_2deg_12deg)] p-7">
											<div className="h-full w-full rounded-full border border-border/80 bg-background/75" />
										</div>
									</div>
									<p className="text-center text-base font-medium">
										{content.fullScreen.astigmatism.question}
									</p>
								</div>
							)}
							{stepIndex === step.PROCESSING && (
								<div className="space-y-5 text-center">
									<div className="mx-auto size-14 animate-spin rounded-full border-2 border-border border-t-primary" />
									<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
										{content.fullScreen.processing.title}
									</h1>
									<p className="text-muted-foreground text-base leading-relaxed">
										{content.fullScreen.processing.description}
									</p>
								</div>
							)}
							{stepIndex === step.RESULTS && (
								<div className="space-y-5">
									<div className="space-y-2 text-center">
										<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
											{content.fullScreen.results.title}
										</h1>
										<p className="text-muted-foreground text-base leading-relaxed">
											{content.fullScreen.results.subtitle}
										</p>
									</div>
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
										<div className="rounded-xl border border-border/70 bg-card/70 p-4">
											<p className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
												{content.fullScreen.results.acuityLabel}
											</p>
											<p className="mt-2 text-xl font-semibold">
												{formatEyeHealthText(
													content.fullScreen.results.acuityValue,
													{
														correct: acuityCorrectCount,
														total: 20,
													},
												)}
											</p>
											<p className="text-muted-foreground mt-2 text-xs">
												{formatEyeHealthText(
													content.fullScreen.results.acuityPerEye,
													{
														left: leftCorrectCount,
														right: rightCorrectCount,
													},
												)}
											</p>
										</div>
										<div className="rounded-xl border border-border/70 bg-card/70 p-4">
											<p className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
												{content.fullScreen.results.colorLabel}
											</p>
											<p className="mt-2 text-xl font-semibold">
												{formatEyeHealthText(
													content.fullScreen.results.colorValue,
													{
														correct: colorCorrectCount,
														total: 13,
													},
												)}
											</p>
										</div>
										<div className="rounded-xl border border-border/70 bg-card/70 p-4">
											<p className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
												{content.fullScreen.results.classificationLabel}
											</p>
											<p className="mt-2 text-xl font-semibold">
												{classification === 'excellent'
													? content.fullScreen.results.levelExcellent
													: classification === 'good'
														? content.fullScreen.results.levelGood
														: content.fullScreen.results.levelConsult}
											</p>
										</div>
									</div>
									{saveState.status === 'success' && (
										<p className="text-center text-sm font-medium text-primary">
											{content.fullScreen.results.saveSuccess}
										</p>
									)}
									{saveState.status === 'error' && (
										<p className="text-destructive text-center text-sm">
											{content.fullScreen.results.saveError}
										</p>
									)}
								</div>
							)}
						</div>
						{stepIndex === step.BRIGHTNESS &&
							renderSingleAction(content.fullScreen.brightness.cta, goNext)}
						{stepIndex === step.CALIBRATION &&
							renderSingleAction(content.fullScreen.calibration.cta, goNext)}
						{stepIndex === step.LENSES &&
							renderSingleAction(content.fullScreen.lenses.cta, goNext)}
						{stepIndex === step.COVER_LEFT &&
							renderSingleAction(content.fullScreen.coverLeft.cta, goNext)}
						{stepIndex === step.DISTANCE &&
							renderSingleAction(content.fullScreen.distance.cta, goNext)}
						{currentLandolt && (
							<div className="sticky bottom-0 mt-auto border-t border-border/70 bg-background/94 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-4 backdrop-blur">
								<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
									<Button
										type="button"
										variant="outline"
										className="h-11"
										onClick={() => answerLandolt('up')}
									>
										{content.fullScreen.landolt.optionNorth}
									</Button>
									<Button
										type="button"
										variant="outline"
										className="h-11"
										onClick={() => answerLandolt('down')}
									>
										{content.fullScreen.landolt.optionSouth}
									</Button>
									<Button
										type="button"
										variant="outline"
										className="h-11"
										onClick={() => answerLandolt('right')}
									>
										{content.fullScreen.landolt.optionEast}
									</Button>
									<Button
										type="button"
										variant="outline"
										className="h-11"
										onClick={() => answerLandolt('left')}
									>
										{content.fullScreen.landolt.optionWest}
									</Button>
								</div>
							</div>
						)}
						{stepIndex === step.COVER_RIGHT &&
							renderSingleAction(content.fullScreen.coverRight.cta, goNext)}
						{stepIndex === step.ISHIHARA_INTRO &&
							renderSingleAction(content.fullScreen.ishiharaIntro.cta, goNext)}
						{isIshiharaStep && currentIshiharaFile && (
							<div className="sticky bottom-0 mt-auto border-t border-border/70 bg-background/94 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-4 backdrop-blur">
								<Button
									type="button"
									onClick={() => {
										submitIshiharaAnswer(
											ishiharaInput,
											content.fullScreen.ishihara.invalidChars,
										);
									}}
									className="h-12 w-full rounded-xl text-sm font-semibold"
								>
									{content.fullScreen.ishihara.cta}
								</Button>
							</div>
						)}
						{stepIndex === step.ASTIGMATISM_INTRO &&
							renderSingleAction(
								content.fullScreen.astigmatismIntro.cta,
								goNext,
							)}
						{stepIndex === step.ASTIGMATISM_LEFT && (
							<div className="sticky bottom-0 mt-auto border-t border-border/70 bg-background/94 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-4 backdrop-blur">
								<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
									<Button
										type="button"
										variant="outline"
										className="h-11"
										onClick={() => answerAstigmatism('left', false)}
									>
										{content.fullScreen.astigmatism.optionEqual}
									</Button>
									<Button
										type="button"
										className="h-11"
										onClick={() => answerAstigmatism('left', true)}
									>
										{content.fullScreen.astigmatism.optionDifferent}
									</Button>
								</div>
							</div>
						)}
						{stepIndex === step.ASTIGMATISM_RIGHT && (
							<div className="sticky bottom-0 mt-auto border-t border-border/70 bg-background/94 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-4 backdrop-blur">
								<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
									<Button
										type="button"
										variant="outline"
										className="h-11"
										onClick={() => answerAstigmatism('right', false)}
									>
										{content.fullScreen.astigmatism.optionEqual}
									</Button>
									<Button
										type="button"
										className="h-11"
										onClick={() => answerAstigmatism('right', true)}
									>
										{content.fullScreen.astigmatism.optionDifferent}
									</Button>
								</div>
							</div>
						)}
						{stepIndex === step.RESULTS && (
							<div className="sticky bottom-0 mt-auto border-t border-border/70 bg-background/94 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-4 backdrop-blur">
								<Button
									type="button"
									onClick={() => {
										void saveResult();
									}}
									disabled={!canSaveResult || saveState.status === 'saving'}
									className="h-12 w-full rounded-xl text-sm font-semibold"
								>
									{saveState.status === 'saving'
										? content.fullScreen.results.saving
										: content.fullScreen.results.cta}
								</Button>
								{saveState.status === 'error' && (
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											void saveResult();
										}}
										className="mt-2 h-10 w-full"
									>
										{content.fullScreen.results.retry}
									</Button>
								)}
								<Link
									to={localePath('/', locale)}
									className="mt-2 inline-flex w-full"
								>
									<Button type="button" variant="ghost" className="h-10 w-full">
										{content.fullScreen.common.finish}
									</Button>
								</Link>
							</div>
						)}
					</motion.section>
				</AnimatePresence>
			</div>
		</main>
	);
}
