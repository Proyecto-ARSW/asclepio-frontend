import {
	ArrowDownIcon,
	ArrowDownLeftIcon,
	ArrowDownRightIcon,
	ArrowLeftIcon,
	ArrowRightIcon,
	ArrowUpIcon,
	ArrowUpLeftIcon,
	ArrowUpRightIcon,
	HandRaisedIcon,
	SunIcon,
} from '@heroicons/react/24/outline';
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
	'size-[2.9rem]',
	'size-[2.6rem]',
	'size-[2.3rem]',
	'size-[2.1rem]',
	'size-[1.9rem]',
	'size-[1.6rem]',
	'size-[1.1rem]',
	'size-[0.9rem]',
	'size-[0.6rem]',
	'size-[0.4rem]',
] as const;

const LANDOLT_BORDER_CLASSES = [
	'border-[4px]',
	'border-[4px]',
	'border-[3px]',
	'border-[3px]',
	'border-[2px]',
	'border-[2px]',
	'border-[1px]',
	'border-[1px]',
	'border-[1px]',
	'border-[1px]',
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
	const openingRotationClass =
		direction === 'up'
			? '-rotate-90'
			: direction === 'upRight'
				? '-rotate-45'
				: direction === 'right'
					? 'rotate-0'
					: direction === 'downRight'
						? 'rotate-45'
						: direction === 'down'
							? 'rotate-90'
							: direction === 'downLeft'
								? 'rotate-[135deg]'
								: direction === 'left'
									? 'rotate-180'
									: '-rotate-[135deg]';

	return (
		<div className="mx-auto flex w-full justify-center py-1">
			<div
				className={`relative ${sizeClass} ${borderClass} rounded-full border-foreground/85 bg-transparent`}
			>
				<div
					className={`absolute left-1/2 top-1/2 h-[26%] w-[62%] origin-left -translate-y-1/2 rounded-full bg-background ${openingRotationClass}`}
				/>
			</div>
		</div>
	);
}

const ASTIGMATISM_ANGLES = [
	-90, -67.5, -45, -22.5, 0, 22.5, 45, 67.5, 90,
] as const;

function AstigmatismFanChart() {
	const centerX = 120;
	const centerY = 120;
	const innerRadius = 28;
	const outerRadius = 102;
	const lineOffset = 2.6;

	return (
		<div className="mx-auto w-full max-w-xs rounded-2xl border border-border/70 bg-white p-3">
			<svg
				viewBox="0 0 240 140"
				className="mx-auto w-full"
				role="img"
				aria-label="Carta de lineas para prueba de astigmatismo"
			>
				{ASTIGMATISM_ANGLES.flatMap((angle) => {
					const radians = (angle * Math.PI) / 180;
					const cos = Math.cos(radians);
					const sin = Math.sin(radians);
					const normalX = -sin;
					const normalY = cos;

					const startX = centerX + cos * innerRadius;
					const startY = centerY + sin * innerRadius;
					const endX = centerX + cos * outerRadius;
					const endY = centerY + sin * outerRadius;

					return [-1, 0, 1].map((lineIndex) => {
						const shift = lineIndex * lineOffset;
						return (
							<line
								key={`${angle}-${lineIndex}`}
								x1={startX + normalX * shift}
								y1={startY + normalY * shift}
								x2={endX + normalX * shift}
								y2={endY + normalY * shift}
								stroke="#111111"
								strokeWidth="1.7"
								strokeLinecap="square"
							/>
						);
					});
				})}

				<path
					d={`M ${centerX - innerRadius} ${centerY} A ${innerRadius} ${innerRadius} 0 0 1 ${centerX + innerRadius} ${centerY}`}
					fill="none"
					stroke="#111111"
					strokeWidth="2"
				/>
			</svg>
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
		stepIndex: rawStepIndex,
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
		classification,
		acuityCorrectCount,
		leftCorrectCount,
		rightCorrectCount,
		colorCorrectCount,
	} = useEyeHealthTest();

	const stepIndex = rawStepIndex as number;

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

	const landoltOptions: Array<{
		direction: AcuityDirection;
		label: string;
		Icon: typeof ArrowUpIcon;
	}> = [
		{
			direction: 'up',
			label: content.fullScreen.landolt.optionUp,
			Icon: ArrowUpIcon,
		},
		{
			direction: 'upRight',
			label: content.fullScreen.landolt.optionUpRight,
			Icon: ArrowUpRightIcon,
		},
		{
			direction: 'right',
			label: content.fullScreen.landolt.optionRight,
			Icon: ArrowRightIcon,
		},
		{
			direction: 'downRight',
			label: content.fullScreen.landolt.optionDownRight,
			Icon: ArrowDownRightIcon,
		},
		{
			direction: 'down',
			label: content.fullScreen.landolt.optionDown,
			Icon: ArrowDownIcon,
		},
		{
			direction: 'downLeft',
			label: content.fullScreen.landolt.optionDownLeft,
			Icon: ArrowDownLeftIcon,
		},
		{
			direction: 'left',
			label: content.fullScreen.landolt.optionLeft,
			Icon: ArrowLeftIcon,
		},
		{
			direction: 'upLeft',
			label: content.fullScreen.landolt.optionUpLeft,
			Icon: ArrowUpLeftIcon,
		},
	];

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
										<p className="text-muted-foreground text-xs">
											{content.fullScreen.landolt.helper}
										</p>
									</div>

									<LandoltRing
										direction={currentLandolt.target}
										sizeClass={
											LANDOLT_SIZE_CLASSES[currentLandolt.index] ??
											'size-[1.2rem]'
										}
										borderClass={
											LANDOLT_BORDER_CLASSES[currentLandolt.index] ??
											'border-[1px]'
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

									<AstigmatismFanChart />

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
								<div className="grid grid-cols-4 gap-2">
									{landoltOptions.map((option) => (
										<Button
											key={option.direction}
											type="button"
											variant="outline"
											className="h-11 px-0"
											onClick={() => answerLandolt(option.direction)}
											aria-label={option.label}
										>
											<option.Icon className="size-4" />
											<span className="sr-only">{option.label}</span>
										</Button>
									))}
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
								<Link
									to={localePath('/', locale)}
									className="mt-2 inline-flex w-full"
								>
									<Button
										type="button"
										className="h-12 w-full rounded-xl text-sm font-semibold"
									>
										{content.fullScreen.results.cta}
									</Button>
								</Link>
								<Button
									type="button"
									variant="ghost"
									onClick={restart}
									className="mt-2 h-10 w-full"
								>
									{content.fullScreen.common.restart}
								</Button>
							</div>
						)}
					</motion.section>
				</AnimatePresence>
			</div>
		</main>
	);
}
