import { useCallback, useMemo, useState } from 'react';
import { gqlMutation } from '@/lib/graphql-client';

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

const DIRECTIONS = ['up', 'right', 'down', 'left'] as const;

export const EYE_HEALTH_TOTAL_STEPS = 45;

export const EYE_HEALTH_STEP = {
	BRIGHTNESS: 0,
	CALIBRATION: 1,
	LENSES: 2,
	COVER_LEFT: 3,
	DISTANCE: 4,
	LEFT_TEST_START: 5,
	LEFT_TEST_END: 14,
	COVER_RIGHT: 15,
	RIGHT_TEST_START: 16,
	RIGHT_TEST_END: 25,
	ISHIHARA_INTRO: 26,
	ISHIHARA_START: 27,
	ISHIHARA_END: 39,
	ASTIGMATISM_INTRO: 40,
	ASTIGMATISM_LEFT: 41,
	ASTIGMATISM_RIGHT: 42,
	PROCESSING: 43,
	RESULTS: 44,
} as const;

const SAVE_EYE_HEALTH_RESULT_CANDIDATES = [
	{
		mutation: `
			mutation SaveEyeHealthResult($input: SaveEyeHealthResultInput!) {
				saveEyeHealthResult(input: $input)
			}
		`,
		variables: (input: SaveEyeHealthResultPayload) => ({ input }),
	},
	{
		mutation: `
			mutation SaveEyeHealthResult($input: EyeHealthResultInput!) {
				saveEyeHealthResult(input: $input)
			}
		`,
		variables: (input: SaveEyeHealthResultPayload) => ({ input }),
	},
	{
		mutation: `
			mutation SaveEyeHealthResult($data: SaveEyeHealthResultInput!) {
				saveEyeHealthResult(data: $data)
			}
		`,
		variables: (input: SaveEyeHealthResultPayload) => ({ data: input }),
	},
] as const;

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

export interface SaveEyeHealthResultPayload {
	calibration: CalibrationResult;
	acuity: {
		leftEye: {
			targets: AcuityDirection[];
			answers: Array<AcuityDirection | null>;
			correctCount: number;
			total: number;
		};
		rightEye: {
			targets: AcuityDirection[];
			answers: Array<AcuityDirection | null>;
			correctCount: number;
			total: number;
		};
		correctCount: number;
		total: number;
	};
	colorBlindness: {
		plates: IshiharaResult[];
		correctCount: number;
		total: number;
	};
	astigmatism: {
		leftEyeSeesDifferentLines: boolean;
		rightEyeSeesDifferentLines: boolean;
		riskDetected: boolean;
	};
	classification: EyeHealthClassification;
	completedAt: string;
}

interface SaveEyeHealthResponse {
	saveEyeHealthResult: boolean | Record<string, unknown> | null;
}

interface EyeHealthSaveState {
	status: 'idle' | 'saving' | 'success' | 'error';
	errorMessage?: string;
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
	const [stepIndex, setStepIndex] = useState(EYE_HEALTH_STEP.BRIGHTNESS);
	const [calibrationScale, setCalibrationScale] = useState(100);
	const [leftTargets, setLeftTargets] = useState<AcuityDirection[]>(() =>
		createLandoltSequence(10),
	);
	const [rightTargets, setRightTargets] = useState<AcuityDirection[]>(() =>
		createLandoltSequence(10),
	);
	const [leftAnswers, setLeftAnswers] = useState<Array<AcuityDirection | null>>(
		() => Array.from({ length: 10 }, () => null),
	);
	const [rightAnswers, setRightAnswers] = useState<
		Array<AcuityDirection | null>
	>(() => Array.from({ length: 10 }, () => null));
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
	const [saveState, setSaveState] = useState<EyeHealthSaveState>({
		status: 'idle',
	});

	const isLeftLandoltStep =
		stepIndex >= EYE_HEALTH_STEP.LEFT_TEST_START &&
		stepIndex <= EYE_HEALTH_STEP.LEFT_TEST_END;
	const isRightLandoltStep =
		stepIndex >= EYE_HEALTH_STEP.RIGHT_TEST_START &&
		stepIndex <= EYE_HEALTH_STEP.RIGHT_TEST_END;
	const isIshiharaStep =
		stepIndex >= EYE_HEALTH_STEP.ISHIHARA_START &&
		stepIndex <= EYE_HEALTH_STEP.ISHIHARA_END;

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

	const acuityCorrectCount = leftCorrectCount + rightCorrectCount;

	const classification = useMemo<EyeHealthClassification>(() => {
		if (
			acuityCorrectCount >= 16 &&
			colorCorrectCount >= 11 &&
			!astigmatismRiskDetected
		) {
			return 'excellent';
		}
		if (acuityCorrectCount >= 12 && colorCorrectCount >= 8) {
			return 'good';
		}
		return 'consultation';
	}, [acuityCorrectCount, colorCorrectCount, astigmatismRiskDetected]);

	const canSaveResult =
		stepIndex === EYE_HEALTH_STEP.RESULTS &&
		leftAnswers.every((answer) => answer !== null) &&
		rightAnswers.every((answer) => answer !== null) &&
		colorAnsweredCount === ISHIHARA_FILES.length &&
		astigmatismLeftDifferent !== null &&
		astigmatismRightDifferent !== null;

	const astigmatism: AstigmatismResult | null =
		astigmatismLeftDifferent === null || astigmatismRightDifferent === null
			? null
			: {
					linesUniform: !astigmatismRiskDetected,
					notes: '',
				};

	const payload = useMemo<SaveEyeHealthResultPayload | null>(() => {
		if (!canSaveResult) return null;

		return {
			calibration: {
				scalePercent: calibrationScale,
				maxBrightness: true,
			},
			acuity: {
				leftEye: {
					targets: leftTargets,
					answers: leftAnswers,
					correctCount: leftCorrectCount,
					total: leftTargets.length,
				},
				rightEye: {
					targets: rightTargets,
					answers: rightAnswers,
					correctCount: rightCorrectCount,
					total: rightTargets.length,
				},
				correctCount: acuityCorrectCount,
				total: leftTargets.length + rightTargets.length,
			},
			colorBlindness: {
				plates: ishiharaResults,
				correctCount: colorCorrectCount,
				total: ISHIHARA_FILES.length,
			},
			astigmatism: {
				leftEyeSeesDifferentLines: astigmatismLeftDifferent ?? false,
				rightEyeSeesDifferentLines: astigmatismRightDifferent ?? false,
				riskDetected: astigmatismRiskDetected,
			},
			classification,
			completedAt: new Date().toISOString(),
		};
	}, [
		canSaveResult,
		calibrationScale,
		leftTargets,
		leftAnswers,
		leftCorrectCount,
		rightTargets,
		rightAnswers,
		rightCorrectCount,
		acuityCorrectCount,
		ishiharaResults,
		colorCorrectCount,
		astigmatismLeftDifferent,
		astigmatismRightDifferent,
		astigmatismRiskDetected,
		classification,
	]);

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
		setLeftTargets(createLandoltSequence(10));
		setRightTargets(createLandoltSequence(10));
		setLeftAnswers(Array.from({ length: 10 }, () => null));
		setRightAnswers(Array.from({ length: 10 }, () => null));
		setIshiharaAnswers({});
		setAstigmatismLeftDifferent(null);
		setAstigmatismRightDifferent(null);
		setValidationError(null);
		setSaveState({ status: 'idle' });
	}, []);

	const saveResult = useCallback(async () => {
		if (!payload || !canSaveResult) return;

		setSaveState({ status: 'saving' });
		let lastError: unknown = null;

		for (const candidate of SAVE_EYE_HEALTH_RESULT_CANDIDATES) {
			try {
				await gqlMutation<SaveEyeHealthResponse>(
					candidate.mutation,
					candidate.variables(payload),
				);
				setSaveState({ status: 'success' });
				return;
			} catch (error) {
				lastError = error;
			}
		}

		setSaveState({
			status: 'error',
			errorMessage:
				lastError instanceof Error
					? lastError.message
					: 'Unknown GraphQL error',
		});
	}, [payload, canSaveResult]);

	return {
		stepIndex,
		totalSteps: EYE_HEALTH_TOTAL_STEPS,
		progressValue: ((stepIndex + 1) / EYE_HEALTH_TOTAL_STEPS) * 100,
		canGoBack: stepIndex > EYE_HEALTH_STEP.BRIGHTNESS,
		step: EYE_HEALTH_STEP,
		calibrationScale,
		setCalibrationScale,
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
		canSaveResult,
		saveState,
		saveResult,
		classification,
		acuityCorrectCount,
		leftCorrectCount,
		rightCorrectCount,
		colorCorrectCount,
		colorAnsweredCount,
		ishiharaResults,
		astigmatism,
		payload,
	};
}
