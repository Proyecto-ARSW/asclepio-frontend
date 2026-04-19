import { useCallback, useMemo, useState } from 'react';

export const ISHIHARA_FILES = [
	'Ishihara_12.jpg',
	'Ishihara_16.jpg',
	'Ishihara_2.jpg',
	'Ishihara_29.jpg',
	'Ishihara_3.jpg',
	'Ishihara_42.jpg',
	'Ishihara_45.jpg',
	'Ishihara_5.jpg',
	'Ishihara_6.jpg',
	'Ishihara_7.jpg',
	'Ishihara_74.jpg',
	'Ishihara_8.jpg',
	'Ishihara_97.jpg',
] as const;

const DIRECTIONS = [
	'up',
	'upRight',
	'right',
	'downRight',
	'down',
	'downLeft',
	'left',
	'upLeft',
] as const;

export const EYE_HEALTH_TOTAL_STEPS = 57;

export const EYE_HEALTH_STEP = {
	BRIGHTNESS: 0,
	CALIBRATION: 1,
	LENSES: 2,
	COVER_LEFT: 3,
	DISTANCE: 4,
	LEFT_CONTRAST_START: 5,
	LEFT_CONTRAST_END: 9,
	LEFT_APERTURE_INTRO: 10,
	LEFT_TEST_START: 11,
	LEFT_TEST_END: 20,
	COVER_RIGHT: 21,
	RIGHT_CONTRAST_START: 22,
	RIGHT_CONTRAST_END: 26,
	RIGHT_APERTURE_INTRO: 27,
	RIGHT_TEST_START: 28,
	RIGHT_TEST_END: 37,
	ISHIHARA_INTRO: 38,
	ISHIHARA_START: 39,
	ISHIHARA_END: 51,
	ASTIGMATISM_INTRO: 52,
	ASTIGMATISM_LEFT: 53,
	ASTIGMATISM_RIGHT: 54,
	PROCESSING: 55,
	RESULTS: 56,
} as const;

export type AcuityDirection = (typeof DIRECTIONS)[number];
export type EyeHealthClassification = 'excellent' | 'good' | 'consultation';

export interface CalibrationResult {
	scalePercent: number;
	maxBrightness: boolean;
}

export interface AcuityTargets {
	leftEye: AcuityDirection;
	rightEye: AcuityDirection;
}

export interface AcuityAnswers {
	leftEye: AcuityDirection;
	rightEye: AcuityDirection;
}

export interface AstigmatismResult {
	linesUniform: boolean;
	notes: string;
}

export interface IshiharaResult {
	fileName: string;
	expectedAnswer: string;
	userAnswer: string;
	isCorrect: boolean;
}

function randomDirection(): AcuityDirection {
	const index = Math.floor(Math.random() * DIRECTIONS.length);
	return DIRECTIONS[index] ?? 'up';
}

function createLandoltSequence(size: number): AcuityDirection[] {
	return Array.from({ length: size }, () => randomDirection());
}

function expectedAnswerFromFile(fileName: string): string {
	const match = fileName.match(/_(\d+)\./i);
	return match?.[1] ?? '';
}

function hasOwnKey(record: Record<string, string>, key: string) {
	return Object.hasOwn(record, key);
}

export function useEyeHealthTest() {
	const [stepIndex, setStepIndex] = useState<number>(
		EYE_HEALTH_STEP.BRIGHTNESS,
	);
	const [calibrationScale, setCalibrationScale] = useState(100);
	const [leftTargets, setLeftTargets] = useState<AcuityDirection[]>(() =>
		createLandoltSequence(10),
	);
	const [rightTargets, setRightTargets] = useState<AcuityDirection[]>(() =>
		createLandoltSequence(10),
	);
	const [leftContrastTargets, setLeftContrastTargets] = useState<
		AcuityDirection[]
	>(() => createLandoltSequence(5));
	const [rightContrastTargets, setRightContrastTargets] = useState<
		AcuityDirection[]
	>(() => createLandoltSequence(5));
	const [leftAnswers, setLeftAnswers] = useState<Array<AcuityDirection | null>>(
		() => Array.from({ length: 10 }, () => null),
	);
	const [rightAnswers, setRightAnswers] = useState<
		Array<AcuityDirection | null>
	>(() => Array.from({ length: 10 }, () => null));
	const [leftContrastAnswers, setLeftContrastAnswers] = useState<
		Array<AcuityDirection | null>
	>(() => Array.from({ length: 5 }, () => null));
	const [rightContrastAnswers, setRightContrastAnswers] = useState<
		Array<AcuityDirection | null>
	>(() => Array.from({ length: 5 }, () => null));
	const [ishiharaAnswers, setIshiharaAnswers] = useState<
		Record<string, string>
	>({});
	const [astigmatismLeftDifferent, setAstigmatismLeftDifferent] = useState<
		boolean | null
	>(null);
	const [astigmatismRightDifferent, setAstigmatismRightDifferent] = useState<
		boolean | null
	>(null);
	const [validationError, setValidationError] = useState<string | null>(null);

	const isLeftContrastStep =
		stepIndex >= EYE_HEALTH_STEP.LEFT_CONTRAST_START &&
		stepIndex <= EYE_HEALTH_STEP.LEFT_CONTRAST_END;
	const isRightContrastStep =
		stepIndex >= EYE_HEALTH_STEP.RIGHT_CONTRAST_START &&
		stepIndex <= EYE_HEALTH_STEP.RIGHT_CONTRAST_END;
	const isLeftLandoltStep =
		stepIndex >= EYE_HEALTH_STEP.LEFT_TEST_START &&
		stepIndex <= EYE_HEALTH_STEP.LEFT_TEST_END;
	const isRightLandoltStep =
		stepIndex >= EYE_HEALTH_STEP.RIGHT_TEST_START &&
		stepIndex <= EYE_HEALTH_STEP.RIGHT_TEST_END;
	const isIshiharaStep =
		stepIndex >= EYE_HEALTH_STEP.ISHIHARA_START &&
		stepIndex <= EYE_HEALTH_STEP.ISHIHARA_END;

	const leftContrastIndex = isLeftContrastStep
		? stepIndex - EYE_HEALTH_STEP.LEFT_CONTRAST_START
		: -1;
	const rightContrastIndex = isRightContrastStep
		? stepIndex - EYE_HEALTH_STEP.RIGHT_CONTRAST_START
		: -1;
	const leftTestIndex = isLeftLandoltStep
		? stepIndex - EYE_HEALTH_STEP.LEFT_TEST_START
		: -1;
	const rightTestIndex = isRightLandoltStep
		? stepIndex - EYE_HEALTH_STEP.RIGHT_TEST_START
		: -1;
	const ishiharaIndex = isIshiharaStep
		? stepIndex - EYE_HEALTH_STEP.ISHIHARA_START
		: -1;
	const currentIshiharaFile =
		ishiharaIndex >= 0 ? ISHIHARA_FILES[ishiharaIndex] : undefined;

	const leftContrastCorrectCount = useMemo(
		() =>
			leftContrastTargets.filter(
				(target, index) => leftContrastAnswers[index] === target,
			).length,
		[leftContrastTargets, leftContrastAnswers],
	);
	const rightContrastCorrectCount = useMemo(
		() =>
			rightContrastTargets.filter(
				(target, index) => rightContrastAnswers[index] === target,
			).length,
		[rightContrastTargets, rightContrastAnswers],
	);

	const leftCorrectCount = useMemo(
		() =>
			leftTargets.filter((target, index) => leftAnswers[index] === target)
				.length,
		[leftTargets, leftAnswers],
	);
	const rightCorrectCount = useMemo(
		() =>
			rightTargets.filter((target, index) => rightAnswers[index] === target)
				.length,
		[rightTargets, rightAnswers],
	);

	const ishiharaResults = useMemo<IshiharaResult[]>(() => {
		return ISHIHARA_FILES.map((fileName) => {
			const expectedAnswer = expectedAnswerFromFile(fileName);
			const userAnswer = ishiharaAnswers[fileName] ?? '';
			return {
				fileName,
				expectedAnswer,
				userAnswer,
				isCorrect: userAnswer.length > 0 && userAnswer === expectedAnswer,
			};
		});
	}, [ishiharaAnswers]);

	const colorCorrectCount = useMemo(
		() => ishiharaResults.filter((result) => result.isCorrect).length,
		[ishiharaResults],
	);

	const colorAnsweredCount = useMemo(
		() =>
			ISHIHARA_FILES.filter((fileName) => hasOwnKey(ishiharaAnswers, fileName))
				.length,
		[ishiharaAnswers],
	);

	const astigmatismRiskDetected =
		astigmatismLeftDifferent === true || astigmatismRightDifferent === true;

	const contrastCorrectCount =
		leftContrastCorrectCount + rightContrastCorrectCount;
	const acuityCorrectCount = leftCorrectCount + rightCorrectCount;

	const classification = useMemo<EyeHealthClassification>(() => {
		if (
			acuityCorrectCount >= 16 &&
			colorCorrectCount >= 11 &&
			contrastCorrectCount >= 8 &&
			!astigmatismRiskDetected
		) {
			return 'excellent';
		}
		if (
			acuityCorrectCount >= 12 &&
			colorCorrectCount >= 8 &&
			contrastCorrectCount >= 5
		) {
			return 'good';
		}
		return 'consultation';
	}, [
		acuityCorrectCount,
		colorCorrectCount,
		contrastCorrectCount,
		astigmatismRiskDetected,
	]);

	const astigmatism: AstigmatismResult | null =
		astigmatismLeftDifferent === null || astigmatismRightDifferent === null
			? null
			: {
					linesUniform: !astigmatismRiskDetected,
					notes: '',
				};

	const goNext = useCallback(() => {
		setValidationError(null);
		setStepIndex((previous) =>
			Math.min(previous + 1, EYE_HEALTH_TOTAL_STEPS - 1),
		);
	}, []);

	const goBack = useCallback(() => {
		setValidationError(null);
		setStepIndex((previous) => Math.max(previous - 1, 0));
	}, []);

	const answerLandolt = useCallback(
		(direction: AcuityDirection) => {
			setValidationError(null);

			if (isLeftLandoltStep && leftTestIndex >= 0) {
				setLeftAnswers((previous) => {
					const next = [...previous];
					next[leftTestIndex] = direction;
					return next;
				});
				setStepIndex((previous) =>
					Math.min(previous + 1, EYE_HEALTH_TOTAL_STEPS - 1),
				);
				return;
			}

			if (isRightLandoltStep && rightTestIndex >= 0) {
				setRightAnswers((previous) => {
					const next = [...previous];
					next[rightTestIndex] = direction;
					return next;
				});
				setStepIndex((previous) =>
					Math.min(previous + 1, EYE_HEALTH_TOTAL_STEPS - 1),
				);
			}
		},
		[isLeftLandoltStep, leftTestIndex, isRightLandoltStep, rightTestIndex],
	);

	const answerContrast = useCallback(
		(direction: AcuityDirection) => {
			setValidationError(null);

			if (isLeftContrastStep && leftContrastIndex >= 0) {
				setLeftContrastAnswers((previous) => {
					const next = [...previous];
					next[leftContrastIndex] = direction;
					return next;
				});
				setStepIndex((previous) =>
					Math.min(previous + 1, EYE_HEALTH_TOTAL_STEPS - 1),
				);
				return;
			}

			if (isRightContrastStep && rightContrastIndex >= 0) {
				setRightContrastAnswers((previous) => {
					const next = [...previous];
					next[rightContrastIndex] = direction;
					return next;
				});
				setStepIndex((previous) =>
					Math.min(previous + 1, EYE_HEALTH_TOTAL_STEPS - 1),
				);
			}
		},
		[
			isLeftContrastStep,
			leftContrastIndex,
			isRightContrastStep,
			rightContrastIndex,
		],
	);

	const submitIshiharaAnswer = useCallback(
		(rawValue: string, invalidMessage: string) => {
			if (!currentIshiharaFile) {
				return { ok: false as const };
			}

			const value = rawValue.trim();
			if (!/^\d*$/.test(value)) {
				setValidationError(invalidMessage);
				return { ok: false as const };
			}

			setValidationError(null);
			setIshiharaAnswers((previous) => ({
				...previous,
				[currentIshiharaFile]: value,
			}));
			setStepIndex((previous) =>
				Math.min(previous + 1, EYE_HEALTH_TOTAL_STEPS - 1),
			);

			return { ok: true as const };
		},
		[currentIshiharaFile],
	);

	const answerAstigmatism = useCallback(
		(eye: 'left' | 'right', seesDifferentLines: boolean) => {
			setValidationError(null);
			if (eye === 'left') {
				setAstigmatismLeftDifferent(seesDifferentLines);
				setStepIndex(EYE_HEALTH_STEP.ASTIGMATISM_RIGHT);
				return;
			}

			setAstigmatismRightDifferent(seesDifferentLines);
			setStepIndex(EYE_HEALTH_STEP.PROCESSING);
		},
		[],
	);

	const advanceFromProcessing = useCallback(() => {
		setStepIndex(EYE_HEALTH_STEP.RESULTS);
	}, []);

	const restart = useCallback(() => {
		setStepIndex(EYE_HEALTH_STEP.BRIGHTNESS);
		setCalibrationScale(100);
		setLeftContrastTargets(createLandoltSequence(5));
		setRightContrastTargets(createLandoltSequence(5));
		setLeftTargets(createLandoltSequence(10));
		setRightTargets(createLandoltSequence(10));
		setLeftContrastAnswers(Array.from({ length: 5 }, () => null));
		setRightContrastAnswers(Array.from({ length: 5 }, () => null));
		setLeftAnswers(Array.from({ length: 10 }, () => null));
		setRightAnswers(Array.from({ length: 10 }, () => null));
		setIshiharaAnswers({});
		setAstigmatismLeftDifferent(null);
		setAstigmatismRightDifferent(null);
		setValidationError(null);
	}, []);

	return {
		stepIndex,
		totalSteps: EYE_HEALTH_TOTAL_STEPS,
		progressValue: ((stepIndex + 1) / EYE_HEALTH_TOTAL_STEPS) * 100,
		canGoBack: stepIndex > EYE_HEALTH_STEP.BRIGHTNESS,
		step: EYE_HEALTH_STEP,
		calibrationScale,
		setCalibrationScale,
		isLeftContrastStep,
		isRightContrastStep,
		leftContrastIndex,
		rightContrastIndex,
		leftContrastTargets,
		rightContrastTargets,
		leftContrastAnswers,
		rightContrastAnswers,
		answerContrast,
		isLeftLandoltStep,
		isRightLandoltStep,
		leftTestIndex,
		rightTestIndex,
		leftTargets,
		rightTargets,
		leftAnswers,
		rightAnswers,
		answerLandolt,
		isIshiharaStep,
		ishiharaIndex,
		currentIshiharaFile,
		ishiharaAnswers,
		submitIshiharaAnswer,
		validationError,
		clearValidationError: () => setValidationError(null),
		answerAstigmatism,
		astigmatismLeftDifferent,
		astigmatismRightDifferent,
		advanceFromProcessing,
		goNext,
		goBack,
		restart,
		classification,
		contrastCorrectCount,
		leftContrastCorrectCount,
		rightContrastCorrectCount,
		acuityCorrectCount,
		leftCorrectCount,
		rightCorrectCount,
		colorCorrectCount,
		colorAnsweredCount,
		ishiharaResults,
		astigmatism,
	};
}
