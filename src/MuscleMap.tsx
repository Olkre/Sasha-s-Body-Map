import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type PointerEvent } from "react";
import { useSmoothCorners } from "@lisse/react";
import {
  BREATHING_DURATION_DEFAULT,
  BREATHING_DURATION_MIN,
  BREATHING_EASINGS,
  BREATHING_EASING_DEFAULT,
  BREATHING_FRAME_COUNT,
  BREATHING_MAX_SCALE_DEFAULT,
  BREATHING_SPREAD_DEFAULT,
  BREATHING_SPREAD_MAX,
  BREATHING_SPREAD_MIN,
  BREATHING_TRANSPARENCY_DEFAULT,
  getBreathingDelay,
  getBreathingConfig,
  getBreathingEasing,
  getBreathingSpreadStrength,
  type BreathingEasing,
} from "./breathingState";
import {
  ASSIGNED_MUSCLE_IDS,
  ASSIGNMENT_OPACITY_BY_MUSCLE,
  createPathShockwaveSchedule,
  getRevealPathState,
  REVEAL_DURATION,
  REVEAL_DURATION_MAX,
  REVEAL_DURATION_MIN,
  REVEAL_EASING_DEFAULT,
  REVEAL_FRAME_COUNT,
  REVEAL_SPREAD_DEFAULT,
  REVEAL_SPREAD_MAX,
  REVEAL_SPREAD_MIN,
  SHOCKWAVE_BY_MUSCLE,
  SHOCKWAVE_DURATION,
  SHOCKWAVE_TRAVEL_DURATION,
  getRevealDuration,
  getRevealEasing,
  getRevealTravelDelay,
  type PathShockwave,
  type RevealEasing,
  type ShockwaveTiming,
} from "./revealState";
import {
  estimateLandingMuscles,
  searchLandingExercises,
  type LandingMuscleEstimate,
  type LandingExerciseSuggestion,
} from "./convex";
import {
  getAutocompleteSuggestions,
  getAutocompleteSuggestion,
  shouldClearBodyMapForInputChange,
} from "./exerciseInputState";

export const MUSCLE_NAMES = {
  0: "Head",
  1: "Lower chest",
  2: "Upper chest",
  3: "Triceps",
  4: "Front delts",
  5: "Side delts",
  6: "Biceps",
  7: "Lats",
  8: "Rear delts",
  9: "Forearms",
  10: "Abs",
  11: "Obliques",
  12: "Hamstrings",
  13: "Quadriceps",
  14: "Glutes",
  15: "Traps",
  16: "Calves",
  17: "Lower back",
} as const;

const BODYMAP_HEAD_TOP_INSET = 14;
const BODYMAP_VIEWBOX_HEIGHT = 600 + BODYMAP_HEAD_TOP_INSET;
const BODYMAP_VIEWBOX = `-79 -${BODYMAP_HEAD_TOP_INSET} 691 ${BODYMAP_VIEWBOX_HEIGHT}`;
const ASSET_BASE_URL = import.meta.env.BASE_URL;
const STATE_MACHINE_SETTINGS_KEY = "muscle-map-state-machine-settings";
const LANDING_ESTIMATE_CACHE_KEY = "muscle-map-estimate-cache-v2";
const ACCENT_COLOR_DEFAULT = "#78d99d";
const REVEAL_HANDOFF_DURATION = 180;
const REVEAL_HANDOFF_TRAVEL = 120;
const TEXT_SWAP_DURATION = 150;
const DEMO_EXERCISES = [
  "Barbell squat",
  "Bench press",
  "Push-up",
  "Dip",
  "Pull-up",
  "Overhead shoulder press",
  "Triceps extensions",
  "Biceps curls",
  "Leg curls",
  "Calf raises",
  "Romanian deadlift",
  "Dumbbell shoulder press",
  "Walking lunges",
];
const TYPEWRITER_TYPE_DELAY = 72;
const TYPEWRITER_DELETE_DELAY = 42;
const TYPEWRITER_HOLD_DURATION = 2200;
const TYPEWRITER_EMPTY_PAUSE = 320;
const ACTIVATED_MUSCLES = Object.keys(MUSCLE_NAMES)
  .map(Number)
  .filter((muscleId) => muscleId !== 0)
  .map((muscleId) => ({
  id: muscleId,
  name: MUSCLE_NAMES[muscleId as keyof typeof MUSCLE_NAMES],
  activation: ASSIGNED_MUSCLE_IDS.has(muscleId)
    ? Math.round((ASSIGNMENT_OPACITY_BY_MUSCLE[muscleId] ?? 1) * 100)
    : 0,
  }));
const getInitialActivationByMuscle = () => Object.fromEntries(
  ACTIVATED_MUSCLES.map(({ id, activation }) => [id, activation / 100]),
);
const getClearedActivationByMuscle = () => Object.fromEntries(
  ACTIVATED_MUSCLES.map(({ id }) => [id, 0]),
) as Record<number, number>;
const sortMuscleIdsByActivation = (
  muscleIds: readonly number[],
  activationByMuscle: Record<number, number>,
) => [...muscleIds].sort((leftId, rightId) => (
  (activationByMuscle[rightId] ?? 0) - (activationByMuscle[leftId] ?? 0)
));
const normalizedMuscleName = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const muscleIdByName = new Map(
  Object.entries(MUSCLE_NAMES).map(([id, name]) => [normalizedMuscleName(name), Number(id)]),
);
type ControlTab = "breathing" | "reveal";
type ActivationDataSource = "generated" | "cache" | "exercise-list";
type StateMachineCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type StateMachineSettings = {
  controlTab: ControlTab;
  showTouchExerciseChips: boolean;
  animatePathsIndependently: boolean;
  /** Legacy toggle fields are read only to migrate saved settings to 0 = off. */
  spreadPaths?: boolean;
  spreadStrength: number;
  revealEasing: RevealEasing;
  revealDuration: number;
  spreadBreathingPaths?: boolean;
  breathingSpreadStrength: number;
  breathingEasing: BreathingEasing;
  breathingMaxScale: number;
  breathingTransparency: number;
  breathingDuration: number;
  stateMachineCorner: StateMachineCorner;
  isStateMachineHidden: boolean;
  isStateMachineCollapsed: boolean;
  accentColor: string;
};

const getAccentColor = (color: unknown) =>
  typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)
    ? color.toLowerCase()
    : ACCENT_COLOR_DEFAULT;

const getEstimateCacheKey = (name: string) => name.trim().toLocaleLowerCase();

const readCachedEstimate = (name: string): LandingMuscleEstimate | null => {
  try {
    const stored = window.localStorage.getItem(LANDING_ESTIMATE_CACHE_KEY);
    if (!stored) return null;
    const cache = JSON.parse(stored) as Record<string, LandingMuscleEstimate>;
    const estimate = cache[getEstimateCacheKey(name)];
    return estimate && Array.isArray(estimate.activations) ? estimate : null;
  } catch {
    return null;
  }
};

const writeCachedEstimate = (name: string, estimate: LandingMuscleEstimate) => {
  try {
    const stored = window.localStorage.getItem(LANDING_ESTIMATE_CACHE_KEY);
    const cache = stored ? JSON.parse(stored) as Record<string, LandingMuscleEstimate> : {};
    cache[getEstimateCacheKey(name)] = estimate;
    window.localStorage.setItem(LANDING_ESTIMATE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Estimate caching is optional when storage is unavailable or full.
  }
};

const getRangeProgress = (value: number, min: number, max: number) =>
  `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`;

const readStateMachineSettings = (): Partial<StateMachineSettings> => {
  try {
    const stored = window.localStorage.getItem(STATE_MACHINE_SETTINGS_KEY);
    return stored ? JSON.parse(stored) as Partial<StateMachineSettings> : {};
  } catch {
    return {};
  }
};

function TextSwap({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState(text);
  const [previousText, setPreviousText] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const swapTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (text === displayText) return;

    setPreviousText(displayText);
    setDisplayText(text);
    setIsSwapping(true);
    window.requestAnimationFrame(() => setIsSwapping(false));
    swapTimerRef.current = window.setTimeout(() => setPreviousText(null), TEXT_SWAP_DURATION);

    return () => {
      if (swapTimerRef.current !== undefined) {
        window.clearTimeout(swapTimerRef.current);
      }
    };
  }, [displayText, text]);

  return (
    <span className={`t-text-swap${isSwapping ? " is-swapping" : ""}`} aria-live="polite" aria-label={text}>
      {previousText && <span className="t-text-swap__previous" aria-hidden="true">{previousText}</span>}
      <span className="t-text-swap__current" aria-hidden="true">{displayText}</span>
    </span>
  );
}

function SquircleRangeInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);
  useSmoothCorners(ref, { radius: 8, smoothing: 0.8 });

  return <input {...props} ref={ref} />;
}

function SquircleButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  useSmoothCorners(ref, { radius: 18, smoothing: 0.8 });

  return <button {...props} ref={ref} />;
}

const createPathPropsBuilder = (
  revealTime = 0,
  revealDuration = REVEAL_DURATION,
  isScrubbingReveal = false,
  animatePathsIndependently = false,
  spreadStrength = REVEAL_SPREAD_DEFAULT,
  revealEasing: RevealEasing = REVEAL_EASING_DEFAULT,
  breathingSpreadStrength = BREATHING_SPREAD_DEFAULT,
  pathShockwaves: Record<string, PathShockwave> = {},
  breathingDuration = BREATHING_DURATION_DEFAULT,
  activationByMuscle: Record<number, number> = ASSIGNMENT_OPACITY_BY_MUSCLE,
  hoveredActivationMuscleId: number | null = null,
  accentColor = ACCENT_COLOR_DEFAULT,
) => {
  const musclePathIndex: Record<number, number> = {};
  const revealDurationScale = revealDuration / REVEAL_DURATION;
  const normalizedRevealTime = revealTime / revealDurationScale;

  return (muscleId: number) => {
    const index = musclePathIndex[muscleId] ?? 0;
    musclePathIndex[muscleId] = index + 1;

    const name = MUSCLE_NAMES[muscleId as keyof typeof MUSCLE_NAMES] ?? "Unknown";
    const pathKey = `m${muscleId}-p${index}`;
    const muscleShockwave = SHOCKWAVE_BY_MUSCLE[muscleId] ?? { delay: 0, impact: 0 };
    const pathShockwave = pathShockwaves[pathKey];
    const baseShockwave: ShockwaveTiming = animatePathsIndependently
      ? pathShockwave ?? muscleShockwave
      : muscleShockwave;
    const shockwave: ShockwaveTiming = {
      ...baseShockwave,
      delay: getRevealTravelDelay(baseShockwave.delay, revealEasing),
    };
    const breathingTiming = pathShockwave ?? muscleShockwave;
    const breathingDelay = `${getBreathingDelay(
      breathingTiming.delay,
      breathingDuration,
      SHOCKWAVE_TRAVEL_DURATION,
      breathingSpreadStrength > 0,
    )}ms`;
    const breathingSpreadX = breathingSpreadStrength > 0 && pathShockwave
      ? pathShockwave.spreadX * breathingSpreadStrength
      : 0;
    const breathingSpreadY = breathingSpreadStrength > 0 && pathShockwave
      ? pathShockwave.spreadY * breathingSpreadStrength
      : 0;
    const revealSpreadX = spreadStrength > 0 && pathShockwave
      ? pathShockwave.spreadX * spreadStrength * shockwave.impact
      : 0;
    const revealSpreadY = spreadStrength > 0 && pathShockwave
      ? pathShockwave.spreadY * spreadStrength * shockwave.impact
      : 0;
    // A muscle absent from the API payload is inactive. In particular, the
    // SVG's head path (ID 0) is not part of the exercise muscle taxonomy.
    const assignmentOpacity = activationByMuscle[muscleId] ?? 0;
    const revealState = getRevealPathState(
      muscleId,
      normalizedRevealTime,
      shockwave,
      spreadStrength > 0 && pathShockwave
        ? { x: pathShockwave.spreadX, y: pathShockwave.spreadY }
        : undefined,
      spreadStrength,
      assignmentOpacity,
      accentColor,
    );
    const assignmentColor = `color-mix(in srgb, ${accentColor} calc(${assignmentOpacity * 100}%), #e6e6e6)`;
    const scrubbedStyle = isScrubbingReveal
      ? {
          transform: revealState.transform,
          opacity: revealState.opacity,
          fill: revealState.fill,
        }
      : {};
    const settledAssignmentStyle = isScrubbingReveal
      && revealTime >= revealDuration
      && assignmentOpacity > 0
      ? { opacity: 1, fill: assignmentColor }
      : {};
    return {
      fill: "#e6e6e6",
      stroke: "none",
        strokeWidth: 0,
        style: {
          ...scrubbedStyle,
          ...settledAssignmentStyle,
        transition: "fill 180ms ease",
        transformBox: "fill-box",
        transformOrigin: "center",
        "--breathing-delay": breathingDelay,
        "--breathing-spread-x": `${breathingSpreadX}px`,
        "--breathing-spread-y": `${breathingSpreadY}px`,
        "--reveal-spread-x": `${revealSpreadX}px`,
        "--reveal-spread-y": `${revealSpreadY}px`,
        "--shock-delay": `${shockwave.delay * revealDurationScale}ms`,
        "--shock-impact": shockwave.impact,
        "--assignment-opacity": assignmentOpacity,
        "--assignment-visual-opacity": 1,
        "--assignment-color": assignmentColor,
        "--accent-color": accentColor,
        ...(isScrubbingReveal ? { animation: "none" } : {}),
      } as CSSProperties & Record<"--breathing-delay" | "--breathing-spread-x" | "--breathing-spread-y" | "--reveal-spread-x" | "--reveal-spread-y" | "--shock-delay" | "--shock-impact" | "--assignment-opacity" | "--assignment-visual-opacity" | "--assignment-color" | "--accent-color", string | number>,
      "data-muscle-id": muscleId,
      "data-muscle-name": name,
      "data-path-key": pathKey,
      "data-is-active": assignmentOpacity > 0,
      "data-activation-hovered": hoveredActivationMuscleId === null || hoveredActivationMuscleId === muscleId,
    };
  };
};

export default function MuscleMap() {
  const muscleMapRef = useRef<HTMLDivElement>(null);
  const exerciseInputRef = useRef<HTMLTextAreaElement>(null);
  const revealHandoffAnimationsRef = useRef<Animation[]>([]);
  const revealHandoffStartTimerRef = useRef<number | undefined>(undefined);
  const revealHandoffCleanupTimerRef = useRef<number | undefined>(undefined);
  const clearingRevealTimerRef = useRef<number | undefined>(undefined);
  const estimateAbortControllerRef = useRef<AbortController | null>(null);
  const touchChipPressRef = useRef(false);
  const initialSettings = useRef(readStateMachineSettings());
  const [muscleName, setMuscleName] = useState("");
  const [typewriterText, setTypewriterText] = useState("");
  const typewriterExerciseRef = useRef("");
  const [isTypewriterActive, setIsTypewriterActive] = useState(false);
  const [exerciseSuggestion, setExerciseSuggestion] = useState<LandingExerciseSuggestion | null>(null);
  const [exerciseSuggestions, setExerciseSuggestions] = useState<LandingExerciseSuggestion[]>([]);
  const [muscleTooltip, setMuscleTooltip] = useState<{
    name: string;
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);
  const [estimateStatus, setEstimateStatus] = useState<"idle" | "estimating" | "complete">("idle");
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [revealTime, setRevealTime] = useState(0);
  const [revealDuration, setRevealDuration] = useState(
    getRevealDuration(initialSettings.current.revealDuration ?? REVEAL_DURATION),
  );
  const [isScrubbingReveal, setIsScrubbingReveal] = useState(false);
  const [isPlayingReveal, setIsPlayingReveal] = useState(false);
  const [isClearingReveal, setIsClearingReveal] = useState(false);
  const [activationByMuscle, setActivationByMuscle] = useState<Record<number, number>>(
    getInitialActivationByMuscle,
  );
  const [activationMuscleOrder, setActivationMuscleOrder] = useState(() =>
    sortMuscleIdsByActivation(ACTIVATED_MUSCLES.map(({ id }) => id), getInitialActivationByMuscle()),
  );
  const [activationDataSource, setActivationDataSource] = useState<ActivationDataSource | null>(null);
  const [rawLlmResponse, setRawLlmResponse] = useState<string | null>(null);
  const [llmReasoning, setLlmReasoning] = useState<string | null>(null);
  const [isRawLlmResponseOpen, setIsRawLlmResponseOpen] = useState(false);
  const hasActiveActivations = ACTIVATED_MUSCLES.some(
    ({ id }) => (activationByMuscle[id] ?? 0) > 0,
  );
  const [hoveredActivationMuscleId, setHoveredActivationMuscleId] = useState<number | null>(null);
  const [hoveredMapMuscleId, setHoveredMapMuscleId] = useState<number | null>(null);
  const [animatePathsIndependently, setAnimatePathsIndependently] = useState(
    initialSettings.current.animatePathsIndependently ?? true,
  );
  const [spreadStrength, setSpreadStrength] = useState(
    initialSettings.current.spreadPaths === false
      ? REVEAL_SPREAD_MIN
      : Math.max(
          REVEAL_SPREAD_MIN,
          Math.min(REVEAL_SPREAD_MAX, initialSettings.current.spreadStrength ?? REVEAL_SPREAD_DEFAULT),
        ),
  );
  const [revealEasing, setRevealEasing] = useState(
    getRevealEasing(initialSettings.current.revealEasing),
  );
  const [hasInitializedPathToggle, setHasInitializedPathToggle] = useState(false);
  const [pathShockwaves, setPathShockwaves] = useState<Record<string, PathShockwave>>({});
  const [isBreathingPreview, setIsBreathingPreview] = useState(false);
  const [isBreathingPaused, setIsBreathingPaused] = useState(false);
  const [breathingSpreadStrength, setBreathingSpreadStrength] = useState(
    initialSettings.current.spreadBreathingPaths === false
      ? BREATHING_SPREAD_MIN
      : getBreathingSpreadStrength(
          initialSettings.current.breathingSpreadStrength ?? BREATHING_SPREAD_DEFAULT,
        ),
  );
  const [breathingMaxScale, setBreathingMaxScale] = useState(
    initialSettings.current.breathingMaxScale ?? BREATHING_MAX_SCALE_DEFAULT,
  );
  const [breathingTransparency, setBreathingTransparency] = useState(
    initialSettings.current.breathingTransparency ?? BREATHING_TRANSPARENCY_DEFAULT,
  );
  const [breathingDuration, setBreathingDuration] = useState(
    initialSettings.current.breathingDuration ?? BREATHING_DURATION_DEFAULT,
  );
  const [breathingEasing, setBreathingEasing] = useState(
    getBreathingEasing(initialSettings.current.breathingEasing),
  );
  const [breathingFrame, setBreathingFrameState] = useState(0);
  const [isScrubbingBreathing, setIsScrubbingBreathing] = useState(false);
  const [controlTab, setControlTab] = useState<ControlTab>(initialSettings.current.controlTab ?? "reveal");
  const [showTouchExerciseChips, setShowTouchExerciseChips] = useState(
    initialSettings.current.showTouchExerciseChips ?? true,
  );
  const controlTabsRef = useRef<HTMLDivElement>(null);
  const controlTabsPillRef = useRef<HTMLSpanElement>(null);
  const hasMeasuredControlTabs = useRef(false);
  const stateMachineDragRef = useRef({ offsetX: 0, offsetY: 0 });
  const stateMachinePointerStartRef = useRef({ x: 0, y: 0 });
  const stateMachineDidDragRef = useRef(false);
  const [stateMachineCorner, setStateMachineCorner] = useState<StateMachineCorner>(
    initialSettings.current.stateMachineCorner ?? "top-right",
  );
  const [isStateMachineHidden, setIsStateMachineHidden] = useState(
    initialSettings.current.isStateMachineHidden ?? false,
  );
  const [isStateMachineCollapsed, setIsStateMachineCollapsed] = useState(
    initialSettings.current.isStateMachineCollapsed ?? true,
  );
  const [accentColor, setAccentColor] = useState(
    getAccentColor(initialSettings.current.accentColor),
  );
  const [isExerciseInputOverflowing, setIsExerciseInputOverflowing] = useState(false);

  const [stateMachineDragStyle, setStateMachineDragStyle] = useState<CSSProperties | undefined>();
  const [isDraggingStateMachine, setIsDraggingStateMachine] = useState(false);
  const [settingsCopyLabel, setSettingsCopyLabel] = useState("Copy settings");
  const [cacheClearLabel, setCacheClearLabel] = useState("Clear");
  const resizeExerciseInput = (input = exerciseInputRef.current) => {
    if (!input) return;
    input.style.height = "auto";
    const maxInputHeight = 56;
    const isOverflowing = input.scrollHeight > maxInputHeight;
    if (isOverflowing) {
      input.style.paddingBlock = "0";
      input.style.height = "40px";
    } else {
      input.style.paddingBlock = "";
      input.style.height = `${input.scrollHeight}px`;
    }
    input.style.overflowY = "hidden";
    input.scrollTop = isOverflowing ? input.scrollHeight : 0;
    setIsExerciseInputOverflowing(isOverflowing);
  };
  const breathingConfig = getBreathingConfig(
    breathingMaxScale,
    breathingTransparency,
    breathingDuration,
  );
  const isBreathingActive = estimateStatus === "estimating" || isBreathingPreview || isScrubbingBreathing;
  const currentSettings: StateMachineSettings = {
    controlTab,
    showTouchExerciseChips,
    animatePathsIndependently,
    spreadStrength,
    revealEasing,
    revealDuration,
    breathingSpreadStrength,
    breathingEasing,
    breathingMaxScale,
    breathingTransparency,
    breathingDuration,
    stateMachineCorner,
    isStateMachineHidden,
    isStateMachineCollapsed,
    accentColor,
  };
  const setActivationMap = (nextActivations: Record<number, number>) => {
    setActivationByMuscle(nextActivations);
    setActivationMuscleOrder((currentOrder) =>
      sortMuscleIdsByActivation(currentOrder, nextActivations),
    );
  };
  const musclesForActivationSliders = activationMuscleOrder.map((id) =>
    ACTIVATED_MUSCLES.find((muscle) => muscle.id === id),
  ).filter((muscle): muscle is (typeof ACTIVATED_MUSCLES)[number] => muscle !== undefined);
  const pathProps = createPathPropsBuilder(
    revealTime,
    revealDuration,
    isScrubbingReveal,
    animatePathsIndependently,
    spreadStrength,
    revealEasing,
    breathingSpreadStrength,
    pathShockwaves,
    breathingConfig.duration,
    activationByMuscle,
    hoveredActivationMuscleId,
    accentColor,
  );

  const suggestionSuffix = exerciseSuggestion &&
    exerciseSuggestion.name.toLocaleLowerCase().startsWith(muscleName.trim().toLocaleLowerCase()) &&
    exerciseSuggestion.name.length > muscleName.trim().length
    ? exerciseSuggestion.name.slice(muscleName.trim().length)
    : "";
  const isInvalidExerciseError = estimateError?.includes("real exercise") ?? false;

  useEffect(() => {
    if (muscleName || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTypewriterText("");
      setIsTypewriterActive(false);
      return;
    }

    setIsTypewriterActive(true);
    let exerciseIndex = Math.floor(Math.random() * DEMO_EXERCISES.length);
    let characterIndex = 0;
    let phase: "typing" | "holding" | "deleting" | "pausing" = "typing";
    let timer: number | undefined;

    const schedule = (delay: number) => {
      timer = window.setTimeout(step, delay);
    };

    const step = () => {
      const exercise = DEMO_EXERCISES[exerciseIndex];
      typewriterExerciseRef.current = exercise;

      if (phase === "typing") {
        characterIndex += 1;
        setTypewriterText(exercise.slice(0, characterIndex));
        if (characterIndex === exercise.length) {
          phase = "holding";
          schedule(TYPEWRITER_HOLD_DURATION);
        } else {
          schedule(TYPEWRITER_TYPE_DELAY);
        }
        return;
      }

      if (phase === "holding") {
        phase = "deleting";
        schedule(TYPEWRITER_DELETE_DELAY);
        return;
      }

      if (phase === "deleting") {
        characterIndex -= 1;
        setTypewriterText(exercise.slice(0, characterIndex));
        if (characterIndex === 0) {
          let nextExerciseIndex = Math.floor(Math.random() * DEMO_EXERCISES.length);
          while (nextExerciseIndex === exerciseIndex && DEMO_EXERCISES.length > 1) {
            nextExerciseIndex = Math.floor(Math.random() * DEMO_EXERCISES.length);
          }
          exerciseIndex = nextExerciseIndex;
          phase = "pausing";
          schedule(TYPEWRITER_EMPTY_PAUSE);
        } else {
          schedule(TYPEWRITER_DELETE_DELAY);
        }
        return;
      }

      phase = "typing";
      schedule(TYPEWRITER_TYPE_DELAY);
    };

    schedule(TYPEWRITER_TYPE_DELAY);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [muscleName]);

  const acceptTypewriterSuggestion = () => {
    if (muscleName || !typewriterText) return;
    exerciseInputRef.current?.focus();
    const acceptedName = typewriterExerciseRef.current || typewriterText;
    setMuscleName(acceptedName);
    setEstimateError(null);
    void estimateAndReveal(acceptedName);
  };

  useEffect(() => {
    if (!isTypewriterActive || muscleName || !typewriterText) return;

    const handleGlobalTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || event.shiftKey || event.defaultPrevented) return;
      event.preventDefault();
      acceptTypewriterSuggestion();
    };

    document.addEventListener("keydown", handleGlobalTab);
    return () => document.removeEventListener("keydown", handleGlobalTab);
  }, [isTypewriterActive, muscleName, typewriterText]);

  const clearBodyMapBeforeInputChange = () => {
    if (shouldClearBodyMapForInputChange(estimateStatus, hasActiveActivations) && !isClearingReveal) {
      cancelRevealHandoff();
      setIsPlayingReveal(false);
      setIsScrubbingReveal(false);
      setRevealTime(0);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setActivationMap(getClearedActivationByMuscle());
      } else {
        // Drop and re-add the class on consecutive frames so the normal
        // top-to-bottom ripple starts from a fresh animation timeline.
        setIsClearingReveal(false);
        window.requestAnimationFrame(() => setIsClearingReveal(true));
        clearingRevealTimerRef.current = window.setTimeout(() => {
          setActivationMap(getClearedActivationByMuscle());
          setIsClearingReveal(false);
          clearingRevealTimerRef.current = undefined;
        }, revealDuration);
      }
    }
  };

  const clearExerciseInput = () => {
    clearBodyMapBeforeInputChange();
    setMuscleName("");
    setEstimateStatus("idle");
    setEstimateError(null);
  };

  function cancelRevealHandoff() {
    revealHandoffAnimationsRef.current.forEach((animation) => animation.cancel());
    revealHandoffAnimationsRef.current = [];
    if (revealHandoffStartTimerRef.current !== undefined) {
      window.clearTimeout(revealHandoffStartTimerRef.current);
      revealHandoffStartTimerRef.current = undefined;
    }
    if (revealHandoffCleanupTimerRef.current !== undefined) {
      window.clearTimeout(revealHandoffCleanupTimerRef.current);
      revealHandoffCleanupTimerRef.current = undefined;
    }
  }

  function startRevealPlayback() {
    revealHandoffStartTimerRef.current = undefined;
    setEstimateStatus("complete");
    setIsScrubbingReveal(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealTime(revealDuration);
      setIsPlayingReveal(false);
      return;
    }
    setIsPlayingReveal(true);
  }

  function triggerReveal() {
    cancelRevealHandoff();
    if (clearingRevealTimerRef.current !== undefined) {
      window.clearTimeout(clearingRevealTimerRef.current);
      clearingRevealTimerRef.current = undefined;
    }
    setIsClearingReveal(false);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paths = muscleMapRef.current?.querySelectorAll<SVGGraphicsElement>("[data-path-key]");
    const snapshots = isBreathingActive && !reduceMotion && paths
      ? Array.from(paths, (path) => {
          const computed = window.getComputedStyle(path);
          const pathKey = path.dataset.pathKey ?? "";
          const muscleId = Number(path.dataset.muscleId);
          const muscleTiming = SHOCKWAVE_BY_MUSCLE[muscleId] ?? { delay: 0, impact: 0 };
          const timing = animatePathsIndependently
            ? pathShockwaves[pathKey] ?? muscleTiming
            : muscleTiming;
          const travelDelay = getRevealTravelDelay(timing.delay, revealEasing);
          return {
            path,
            transform: computed.transform === "none" ? "scale(1)" : computed.transform,
            opacity: Number(computed.opacity),
            delay: (travelDelay / SHOCKWAVE_TRAVEL_DURATION) * REVEAL_HANDOFF_TRAVEL,
          };
        })
      : [];

    setControlTab("reveal");
    setIsBreathingPreview(false);
    setIsBreathingPaused(false);
    setIsScrubbingBreathing(false);
    setIsPlayingReveal(false);
    setIsScrubbingReveal(true);
    setRevealTime(0);
    setEstimateStatus("idle");

    if (snapshots.length === 0) {
      window.requestAnimationFrame(startRevealPlayback);
      return;
    }

    window.requestAnimationFrame(() => {
      revealHandoffAnimationsRef.current = snapshots.map(({ path, transform, opacity, delay }) => {
        const animation = path.animate(
          [
            { transform, opacity },
            { transform: "scale(1)", opacity: 1 },
          ],
          {
            duration: REVEAL_HANDOFF_DURATION,
            delay,
            easing: "cubic-bezier(0.23, 1, 0.32, 1)",
            fill: "both",
          },
        );
        animation.onfinish = () => animation.cancel();
        return animation;
      });

      revealHandoffStartTimerRef.current = window.setTimeout(
        startRevealPlayback,
        REVEAL_HANDOFF_DURATION,
      );
      revealHandoffCleanupTimerRef.current = window.setTimeout(
        cancelRevealHandoff,
        REVEAL_HANDOFF_DURATION + REVEAL_HANDOFF_TRAVEL + 20,
      );
    });
  }

  useLayoutEffect(() => {
    const paths = muscleMapRef.current?.querySelectorAll<SVGGraphicsElement>("[data-path-key]");
    if (!paths) return;

    const measurements = Array.from(paths, (path) => {
      const bounds = path.getBBox();
      return {
        pathKey: path.dataset.pathKey ?? "",
        muscleId: Number(path.dataset.muscleId),
        centerX: bounds.x + bounds.width / 2,
        centerY: bounds.y + bounds.height / 2,
      };
    });

    setPathShockwaves(createPathShockwaveSchedule(measurements));
  }, []);

  useLayoutEffect(() => {
    const tabs = controlTabsRef.current;
    const pill = controlTabsPillRef.current;
    const activeTab = tabs?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!tabs || !pill || !activeTab) return;

    const positionPill = (animate: boolean) => {
      if (!animate) pill.style.transition = "none";
      pill.style.transform = `translateX(${activeTab.offsetLeft}px)`;
      if (!animate) {
        pill.offsetHeight;
        requestAnimationFrame(() => { pill.style.transition = ""; });
      }
    };

    positionPill(hasMeasuredControlTabs.current);
    hasMeasuredControlTabs.current = true;
    const handleResize = () => positionPill(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [controlTab]);

  useLayoutEffect(() => {
    resizeExerciseInput();
  }, [muscleName]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STATE_MACHINE_SETTINGS_KEY, JSON.stringify(currentSettings));
    } catch {
      // Local storage can be unavailable in private or restricted browsing contexts.
    }
  }, [accentColor, animatePathsIndependently, breathingDuration, breathingEasing, breathingMaxScale, breathingSpreadStrength, breathingTransparency, controlTab, isStateMachineCollapsed, isStateMachineHidden, revealDuration, revealEasing, showTouchExerciseChips, spreadStrength, stateMachineCorner]);

  useEffect(() => {
    if (!isPlayingReveal) return;

    const completionTimer = window.setTimeout(() => {
      setRevealTime(revealDuration);
      setIsPlayingReveal(false);
    }, revealDuration);

    return () => window.clearTimeout(completionTimer);
  }, [isPlayingReveal, revealDuration]);

  useEffect(() => () => cancelRevealHandoff(), []);

  useEffect(() => () => {
    if (clearingRevealTimerRef.current !== undefined) {
      window.clearTimeout(clearingRevealTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const search = muscleName.trim();
    setExerciseSuggestion(null);
    setExerciseSuggestions([]);
    if (!search) {
      return;
    }

    let isCurrent = true;
    const timer = window.setTimeout(() => {
      void searchLandingExercises(search).then((suggestions) => {
        if (!isCurrent) return;
        const prefixSuggestions = getAutocompleteSuggestions(search, suggestions);
        setExerciseSuggestions(prefixSuggestions);
        setExerciseSuggestion(getAutocompleteSuggestion(search, prefixSuggestions));
      });
    }, 140);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [muscleName]);

  const activationMapFor = (activations: ReadonlyArray<{ muscleName: string; activationPercent: number }>) => {
    const nextActivations = Object.fromEntries(
      ACTIVATED_MUSCLES.map(({ id }) => [id, 0]),
    ) as Record<number, number>;
    for (const activation of activations) {
      const muscleId = muscleIdByName.get(normalizedMuscleName(activation.muscleName));
      if (muscleId === undefined || !(muscleId in nextActivations)) continue;
      nextActivations[muscleId] = Math.min(100, Math.max(0, activation.activationPercent)) / 100;
    }
    return nextActivations;
  };

  const acceptSuggestion = (suggestion = exerciseSuggestion) => {
    if (!suggestion) return;
    if (!suggestionSuffix && suggestion === exerciseSuggestion) return;
    cancelRevealHandoff();
    setEstimateError(null);
    setMuscleName(suggestion.name);
    setActivationDataSource("exercise-list");
    setRawLlmResponse(null);
    setLlmReasoning(null);
    setIsRawLlmResponseOpen(false);
    setActivationMap(activationMapFor(suggestion.activations));
    setIsBreathingPreview(false);
    setIsBreathingPaused(false);
    setIsScrubbingBreathing(false);
    setIsPlayingReveal(false);
    setIsScrubbingReveal(false);
    setRevealTime(0);
    triggerReveal();
  };

  const cancelEstimate = () => {
    estimateAbortControllerRef.current?.abort();
    estimateAbortControllerRef.current = null;
    setEstimateStatus("idle");
    setEstimateError(null);
    setIsBreathingPreview(false);
    setIsBreathingPaused(false);
    setIsScrubbingBreathing(false);
  };

  const estimateAndReveal = async (name: string) => {
    if (estimateStatus === "estimating") return;
    if (!name) {
      setEstimateError("Enter an exercise name first.");
      return;
    }

    cancelRevealHandoff();
    if (clearingRevealTimerRef.current !== undefined) {
      window.clearTimeout(clearingRevealTimerRef.current);
      clearingRevealTimerRef.current = undefined;
    }
    setIsClearingReveal(false);
    setEstimateError(null);
    setActivationDataSource(null);
    setRawLlmResponse(null);
    setLlmReasoning(null);
    setIsRawLlmResponseOpen(false);
    setControlTab("breathing");
    setIsBreathingPreview(false);
    setIsBreathingPaused(false);
    setIsScrubbingBreathing(false);
    setEstimateStatus("estimating");
    setIsPlayingReveal(false);
    setIsScrubbingReveal(false);
    setRevealTime(0);
    const cachedEstimate = readCachedEstimate(name);
    if (cachedEstimate) {
      setActivationDataSource("cache");
      setActivationMap(activationMapFor(cachedEstimate.activations.map(({ muscleGroupId, activationPercent }) => ({
        muscleName: MUSCLE_NAMES[Number(muscleGroupId) as keyof typeof MUSCLE_NAMES] ?? "",
        activationPercent,
      }))));
      triggerReveal();
      return;
    }
    const abortController = new AbortController();
    estimateAbortControllerRef.current = abortController;
    try {
      const estimate = await estimateLandingMuscles(name, abortController.signal);
      if (abortController.signal.aborted || estimateAbortControllerRef.current !== abortController) return;
      const nextActivations = Object.fromEntries(
        ACTIVATED_MUSCLES.map(({ id }) => [id, 0]),
      ) as Record<number, number>;
      for (const activation of estimate.activations) {
        const muscleId = Number(activation.muscleGroupId);
        if (!Number.isInteger(muscleId) || !(muscleId in nextActivations)) continue;
        nextActivations[muscleId] = Math.min(100, Math.max(0, activation.activationPercent)) / 100;
      }
      writeCachedEstimate(name, estimate);
      const dataSource = estimate.source === "cache"
        ? "cache"
        : estimate.source === "exercise"
          ? "exercise-list"
          : "generated";
      setActivationDataSource(dataSource);
      setRawLlmResponse(dataSource === "generated" ? estimate.rawResponse ?? null : null);
      setLlmReasoning(dataSource === "generated" ? estimate.reasoning ?? null : null);
      setActivationMap(nextActivations);
      triggerReveal();
    } catch (error) {
      if (abortController.signal.aborted || estimateAbortControllerRef.current !== abortController) return;
      setEstimateStatus("idle");
      setEstimateError(error instanceof Error ? error.message : "Couldn’t estimate this exercise. Please try again.");
    } finally {
      if (estimateAbortControllerRef.current === abortController) {
        estimateAbortControllerRef.current = null;
      }
    }
  };

  const handleEstimate = async () => {
    const enteredExercise = muscleName.trim();
    const exercise = enteredExercise || DEMO_EXERCISES[Math.floor(Math.random() * DEMO_EXERCISES.length)];
    if (!exercise) return;
    if (!enteredExercise) setMuscleName(exercise);
    await estimateAndReveal(exercise);
  };

  const handleExerciseChipClick = (exercise: string) => {
    setMuscleName(exercise);
    setEstimateError(null);
    void estimateAndReveal(exercise);
  };

  const previewInvalidExerciseError = () => {
    cancelRevealHandoff();
    setIsPlayingReveal(false);
    setIsScrubbingReveal(false);
    setIsBreathingPreview(false);
    setIsBreathingPaused(false);
    setIsScrubbingBreathing(false);
    setEstimateStatus("idle");
    setMuscleName("something stupid");
    setEstimateError("We couldn't recognize that as a real exercise.");
    window.requestAnimationFrame(() => exerciseInputRef.current?.focus());
  };

  const setRevealFrame = (frame: number) => {
    cancelRevealHandoff();
    const nextFrame = Math.max(0, Math.min(REVEAL_FRAME_COUNT, frame));
    setControlTab("reveal");
    setIsBreathingPreview(false);
    setIsBreathingPaused(false);
    setIsScrubbingBreathing(false);
    setRevealTime((revealDuration / REVEAL_FRAME_COUNT) * nextFrame);
    setIsPlayingReveal(false);
    setIsScrubbingReveal(true);
    setEstimateStatus("complete");
  };

  const revealFrame = Math.round((revealTime / revealDuration) * REVEAL_FRAME_COUNT);
  const isRevealActive = estimateStatus === "complete";

  const setRevealAnimationDuration = (duration: number) => {
    const nextDuration = getRevealDuration(duration);
    setRevealTime((currentTime) => Math.min(
      nextDuration,
      (currentTime / revealDuration) * nextDuration,
    ));
    setRevealDuration(nextDuration);
  };

  const copySettings = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(currentSettings, null, 2));
      setSettingsCopyLabel("Copied!");
      window.setTimeout(() => setSettingsCopyLabel("Copy settings"), 1400);
    } catch {
      setSettingsCopyLabel("Copy failed");
      window.setTimeout(() => setSettingsCopyLabel("Copy settings"), 1400);
    }
  };

  const clearEstimateCache = () => {
    try {
      window.localStorage.removeItem(LANDING_ESTIMATE_CACHE_KEY);
      setCacheClearLabel("Cache cleared");
      window.setTimeout(() => setCacheClearLabel("Clear"), 1400);
    } catch {
      setCacheClearLabel("Cache unavailable");
      window.setTimeout(() => setCacheClearLabel("Clear"), 1400);
    }
  };

  const resetSettings = () => {
    window.localStorage.removeItem(STATE_MACHINE_SETTINGS_KEY);
    setControlTab("reveal");
    setShowTouchExerciseChips(true);
    setAnimatePathsIndependently(true);
    setSpreadStrength(REVEAL_SPREAD_DEFAULT);
    setRevealEasing("linear");
    setRevealDuration(REVEAL_DURATION);
    setBreathingSpreadStrength(BREATHING_SPREAD_DEFAULT);
    setBreathingEasing("linear");
    setBreathingMaxScale(BREATHING_MAX_SCALE_DEFAULT);
    setBreathingTransparency(BREATHING_TRANSPARENCY_DEFAULT);
    setBreathingDuration(BREATHING_DURATION_DEFAULT);
    setStateMachineCorner("top-right");
    setIsStateMachineHidden(false);
    setIsStateMachineCollapsed(true);
    setAccentColor(ACCENT_COLOR_DEFAULT);
    setStateMachineDragStyle(undefined);
  };

  const handleStateMachinePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const panel = event.currentTarget.parentElement;
    if (!panel) return;
    const bounds = panel.getBoundingClientRect();
    stateMachineDragRef.current = {
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    };
    stateMachinePointerStartRef.current = { x: event.clientX, y: event.clientY };
    stateMachineDidDragRef.current = false;
    setStateMachineDragStyle({ left: bounds.left, top: bounds.top, right: "auto", bottom: "auto" });
    setIsDraggingStateMachine(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleStateMachinePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingStateMachine) return;
    const start = stateMachinePointerStartRef.current;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) {
      stateMachineDidDragRef.current = true;
    }
    const { offsetX, offsetY } = stateMachineDragRef.current;
    setStateMachineDragStyle({
      left: Math.max(8, Math.min(window.innerWidth - 8, event.clientX - offsetX)),
      top: Math.max(8, Math.min(window.innerHeight - 8, event.clientY - offsetY)),
      right: "auto",
      bottom: "auto",
    });
  };

  const handleStateMachinePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingStateMachine) return;
    const nextHorizontal = event.clientX < window.innerWidth / 2 ? "left" : "right";
    const nextVertical = event.clientY < window.innerHeight / 2 ? "top" : "bottom";
    setStateMachineCorner(`${nextVertical}-${nextHorizontal}` as StateMachineCorner);
    setStateMachineDragStyle(undefined);
    setIsDraggingStateMachine(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleStateMachineHeaderClick = () => {
    if (stateMachineDidDragRef.current) return;
    setIsStateMachineCollapsed((collapsed) => !collapsed);
  };

  const startBreathingPreview = () => {
    cancelRevealHandoff();
    setControlTab("breathing");
    setEstimateStatus("idle");
    setIsPlayingReveal(false);
    setIsScrubbingReveal(false);
    setRevealTime(0);
    setIsScrubbingBreathing(false);
    setBreathingFrameState(0);
    setIsBreathingPaused(false);
    setIsBreathingPreview(true);
  };

  const toggleBreathingPreview = () => {
    setControlTab("breathing");
    if (isScrubbingBreathing) {
      setIsScrubbingBreathing(false);
      setIsBreathingPaused(false);
      setIsBreathingPreview(true);
      return;
    }
    if (isBreathingActive) {
      setIsBreathingPaused((paused) => !paused);
      return;
    }

    startBreathingPreview();
  };

  const stopBreathingPreview = () => {
    setIsBreathingPreview(false);
    setIsBreathingPaused(false);
    setIsScrubbingBreathing(false);
    setBreathingFrameState(0);
    if (estimateStatus === "estimating") setEstimateStatus("idle");
  };

  const setBreathingFrame = (frame: number) => {
    const nextFrame = Math.max(0, Math.min(BREATHING_FRAME_COUNT, frame));
    setControlTab("breathing");
    setEstimateStatus("idle");
    setIsPlayingReveal(false);
    setIsScrubbingReveal(false);
    setRevealTime(0);
    setIsBreathingPreview(true);
    setIsBreathingPaused(false);
    setIsScrubbingBreathing(true);
    setBreathingFrameState(nextFrame);
  };

  const resetAnimations = () => {
    cancelRevealHandoff();
    setIsPlayingReveal(false);
    setIsScrubbingReveal(false);
    setIsBreathingPreview(false);
    setIsBreathingPaused(false);
    setIsScrubbingBreathing(false);
    setBreathingFrameState(0);
    setRevealTime(0);
    setEstimateStatus("idle");
  };

  const paths = (
    <>
      {/* Lower Chest */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M104.778 145.844C105.804 145.618 106.741 146.491 106.521 147.518C104.273 157.994 97.6286 161.575 78.5664 162.587C66.1505 163.246 62.7747 162.301 57.6396 156.73C55.9668 154.916 54.5359 153.172 53.3281 151.462C51.9262 149.477 53.6958 147.062 56.0967 147.439C63.2812 148.565 72.8263 149.787 79.5342 149.605C87.4612 149.391 98.2387 147.283 104.778 145.844Z"
        {...pathProps(1)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M113.458 147.518C113.238 146.491 114.175 145.618 115.2 145.844C121.74 147.283 132.517 149.391 140.444 149.605C147.152 149.787 156.697 148.565 163.882 147.439C166.283 147.062 168.052 149.477 166.65 151.462C165.443 153.172 164.012 154.916 162.339 156.73C157.204 162.301 153.828 163.246 141.412 162.587C122.35 161.575 115.706 157.994 113.458 147.518Z"
        {...pathProps(1)}
      />

      {/* Upper Chest */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M75.749 103.055C82.8848 103.049 97.7274 105.524 99.5293 107.02C104.507 111.152 108.072 128.058 107.342 141.024C107.263 142.427 106.161 143.538 104.764 143.693C98.2214 144.421 87.4537 145.501 79.5342 145.689C70.3621 145.906 57.3058 145.111 51.499 144.713C50.3331 144.633 49.3116 143.882 48.9824 142.761C48.4809 141.052 48.1665 139.308 48.0205 137.49C47.6028 132.283 47.919 130.655 50.4043 125.227C54.4059 116.482 60.4703 108.827 65.8682 105.704C69.3376 103.698 71.7248 103.058 75.749 103.055Z"
        {...pathProps(2)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M144.229 103.055C148.254 103.058 150.641 103.698 154.11 105.704C159.508 108.827 165.573 116.482 169.574 125.227C172.06 130.655 172.376 132.283 171.958 137.49C171.812 139.308 171.498 141.052 170.996 142.761C170.667 143.882 169.645 144.633 168.479 144.713C162.674 145.111 149.616 145.906 140.444 145.689C132.525 145.501 121.757 144.421 115.215 143.693C113.817 143.537 112.716 142.427 112.637 141.024C111.906 128.058 115.471 111.152 120.449 107.02C122.251 105.524 137.094 103.049 144.229 103.055Z"
        {...pathProps(2)}
      />

      {/* Triceps */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M357.79 189.029C362.884 188.498 353.311 206.824 345.99 211.621C342.668 213.798 340.599 211.943 340.599 206.786C340.599 202.379 343.218 199.177 352.099 192.732C354.849 190.737 357.41 189.069 357.79 189.029Z"
        {...pathProps(3)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M495.631 189.958C497.745 189.958 511.645 201.298 512.191 203.469C514.156 211.299 510.16 214.145 504.356 209.05C500.544 205.702 494.599 195.356 494.599 192.068C494.599 190.909 495.063 189.958 495.631 189.958Z"
        {...pathProps(3)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M498.237 140.149C499.372 138.385 500.473 137.913 502.911 138.149C507.885 138.632 511.875 145.374 513.547 156.124C513.895 158.361 514.148 160.016 514.282 161.367C517.425 172.362 522.623 193.519 520.03 196.635C517.367 199.831 508.71 194.97 504.714 192.14L504.789 191.883C501.048 188.725 495.687 182.753 494.233 179.65C492.853 176.702 492.547 174.107 492.877 168.15C493.426 158.269 496.325 143.122 498.237 140.149Z"
        {...pathProps(3)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M349.964 136.958C350.715 136.958 352.484 137.867 353.894 138.977C355.909 140.562 356.601 142.222 357.122 146.727C357.486 149.878 358.417 155.299 359.191 158.771C359.966 162.242 360.599 167.891 360.599 171.323C360.599 176.5 360.107 178.326 357.726 182.012C354.03 187.73 348.312 193.199 345.63 193.76C341.296 196.322 335.439 198.837 333.332 196.31C330.806 193.277 335.667 173.133 338.826 161.926C338.917 160.691 339.132 159.226 339.438 157.256C340.096 153.03 341.871 147.382 343.652 143.855C344.238 142.694 344.766 141.584 345.197 140.622C346.353 139.471 348.923 137.127 349.964 136.958Z"
        {...pathProps(3)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M333.846 149.208C334.954 147.821 338.597 147.49 338.599 148.778C338.598 151.386 334.365 168.299 332.546 172.958C331.365 175.983 329.593 181.608 328.609 185.458L326.819 192.458L326.081 185.605C324.656 172.356 328.042 156.482 333.846 149.208Z"
        {...pathProps(3)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M203.536 157.624C207.861 146.248 215.086 174.603 210.865 186.393C209.894 189.106 208.53 191.508 207.835 191.73C205.748 192.396 203.319 185.113 203.919 179.987C204.211 177.496 204.003 172.077 203.458 167.946C202.772 162.747 202.796 159.57 203.536 157.624Z"
        {...pathProps(3)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.2031 157.208C15.6379 151.849 16.6881 155.094 16.4531 170.333C16.2671 182.422 14.7661 191.068 12.7373 191.745C12.0953 191.959 10.8146 190.407 9.8916 188.296C6.81596 181.262 8.13233 163.563 12.2031 157.208Z"
        {...pathProps(3)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M515.236 147.735C516.81 145.194 521.256 150.857 524.708 159.801C527.224 166.321 528.64 187.274 526.788 190.584C525.822 192.311 525.656 192.237 524.669 189.644C524.081 188.096 523.599 185.517 523.599 183.916C523.598 182.314 522.47 178.004 521.091 174.34C518.306 166.942 514.383 149.116 515.236 147.735Z"
        {...pathProps(3)}
      />

      {/* Side Delts */}

      {/* Side Delts */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M353.792 97.0601C355.258 96.4639 356.393 97.8814 355.756 99.3305C350.586 111.104 349.845 119.229 352.059 131.337C352.192 132.066 351.92 132.81 351.351 133.285C350.99 133.586 350.667 133.863 350.38 134.118C349.917 134.521 346.252 136.783 344.358 137.937C344.275 137.987 344.19 138.031 344.101 138.069C343.146 138.479 341.965 139.037 340.721 139.679C336.693 141.755 335.096 142.131 333.793 141.315C331.456 139.849 331.138 132.758 333.04 124.557C335.846 112.458 341.627 103.703 349.973 98.9171C351.196 98.2151 352.543 97.5681 353.792 97.0601Z"
        {...pathProps(5)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M500.131 95.904C498.665 95.3077 497.53 96.7252 498.167 98.1743C503.338 109.948 504.078 118.073 501.864 130.181C501.731 130.91 502.003 131.654 502.572 132.129C502.933 132.429 503.256 132.707 503.543 132.962C504.006 133.364 507.671 135.627 509.565 136.78C509.648 136.831 509.733 136.875 509.822 136.913C510.777 137.323 511.958 137.881 513.202 138.523C517.23 140.599 518.827 140.975 520.13 140.158C522.467 138.693 522.785 131.601 520.883 123.401C518.077 111.302 512.296 102.547 503.95 97.7609C502.727 97.0589 501.38 96.4119 500.131 95.904Z"
        {...pathProps(5)}
      />

      {/* Rear Delts */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M358.755 98.2491C359.154 97.2321 360.304 96.7373 361.277 97.2334C367.354 100.331 377.601 108.202 377.594 110.396C377.587 111.841 371.882 117.922 367.599 121.052C363.627 123.952 360.388 126.335 357.781 128.289C356.624 129.156 354.952 128.558 354.687 127.137C352.962 117.904 354.048 110.239 358.755 98.2491Z"
        {...pathProps(8)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M495.169 97.0929C494.769 96.0759 493.619 95.5811 492.646 96.0773C486.569 99.1748 476.322 107.046 476.329 109.239C476.336 110.685 482.041 116.766 486.324 119.896C490.296 122.796 493.535 125.179 496.142 127.133C497.299 128 498.971 127.402 499.236 125.981C500.962 116.748 499.875 109.082 495.169 97.0929Z"
        {...pathProps(8)}
      />

      {/* Front Delts */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M38.4686 99.4941C38.6327 98.7548 39.2019 98.1702 39.9436 98.0171C46.1591 96.7338 55.0662 96.6034 57.665 97.9933C60.5037 99.5132 60.0571 101.669 55.7266 107.365C53.5966 110.165 49.4753 117.128 46.5684 122.837C42.3334 131.151 39.672 134.864 33.1904 141.506C32.5696 142.142 31.5146 141.651 31.6014 140.766C32.7619 128.945 35.4557 113.068 38.4686 99.4941Z"
        {...pathProps(4)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M183.267 99.4942C183.103 98.7548 182.533 98.1702 181.792 98.0171C175.576 96.7339 166.669 96.6034 164.07 97.9933C161.232 99.5132 161.678 101.669 166.009 107.365C168.139 110.165 172.26 117.128 175.167 122.837C179.402 131.151 182.063 134.864 188.545 141.506C189.166 142.142 190.221 141.651 190.134 140.766C188.973 128.945 186.28 113.068 183.267 99.4942Z"
        {...pathProps(4)}
      />

      {/* Side Delts */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M31.9976 101.012C33.4612 100.192 35.0265 101.612 34.5707 103.227C32.2533 111.434 30.4471 120.703 30.3574 129.353C30.3075 134.169 29.8832 140.001 29.8662 143.903C29.8638 144.464 29.6369 145.004 29.2239 145.384C23.9907 150.198 20.8171 151.639 18.1865 150.63C15.9479 149.77 14.2913 140.054 14.7832 130.671C15.1622 123.46 15.7623 121.088 18.665 115.337C21.8494 109.029 26.4339 104.127 31.9976 101.012Z"
        {...pathProps(5)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M189.738 101.012C188.274 100.193 186.709 101.612 187.165 103.227C189.482 111.434 191.288 120.703 191.378 129.353C191.428 134.169 191.852 140.001 191.869 143.903C191.871 144.464 192.098 145.004 192.511 145.384C197.745 150.198 200.918 151.639 203.549 150.63C205.787 149.77 207.444 140.054 206.952 130.671C206.573 123.46 205.973 121.088 203.07 115.337C199.886 109.029 195.301 104.127 189.738 101.012Z"
        {...pathProps(5)}
      />

      {/* Biceps */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M38.3232 144.002C40.9519 143.966 41.8765 144.559 43.3232 147.208C44.8031 149.915 45.0733 152.713 44.9434 163.958C44.7653 179.307 43.0994 188.043 38.6807 196.795C35.4987 203.099 29.6901 208.958 26.6211 208.958C22.6941 208.958 20.3875 203.176 18.6455 188.954C17.8056 182.102 17.9008 178.995 19.1367 172.954C22.4727 156.637 26.0085 148.847 31.3603 146.021C33.4163 144.936 36.5504 144.027 38.3232 144.002Z"
        {...pathProps(6)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M179.828 143.627C181.991 142.757 182.517 142.884 187.714 145.517C191.93 147.653 193.162 148.947 195.181 153.357C196.511 156.262 198.243 161.523 199.03 165.049C201.499 176.11 202.409 180.009 202.317 183.883C202.262 186.231 201.837 188.572 201.169 192.493C198.701 206.972 195.854 210.693 189.688 207.504C185.902 205.546 182.156 199.202 178.235 188.108C175.377 180.017 175.176 178.521 175.139 164.958C175.106 153.048 175.408 149.894 176.828 147.298C177.779 145.561 179.129 143.909 179.828 143.627Z"
        {...pathProps(6)}
      />

      {/* Lats */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M391.099 157.672C397.602 155.264 399.067 155.556 401.894 159.828C406.792 167.232 418.595 191.945 418.599 194.805C418.599 196.578 416.9 200.125 414.159 204.068C411.718 207.583 407.297 215.408 404.336 221.458C401.375 227.507 398.228 233.051 397.343 233.775C395.572 235.222 395.426 235.06 390.39 225.958C389.021 223.483 385.961 218.083 383.59 213.958C375.041 199.085 362.599 168.038 362.599 161.579C362.599 157.584 364.656 156.758 370.044 158.594C375.507 160.456 384.664 160.055 391.099 157.672Z"
        {...pathProps(7)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M455.362 155.971C456.319 155.978 459.953 156.878 463.438 157.971C470.972 160.333 476.541 160.482 483.135 158.497C488.588 156.856 490.597 157.657 490.599 161.473C490.599 167.704 477.999 199.136 469.559 213.958C467.21 218.083 463.74 224.295 461.848 227.763C459.477 232.106 457.892 233.973 456.753 233.763C455.779 233.581 452.752 228.791 449.389 222.103C446.249 215.858 441.854 208.329 439.622 205.373C436.692 201.492 434.961 199.311 434.524 196.898C433.9 193.436 435.944 189.49 440.943 179.356C445.051 171.029 449.584 162.357 451.018 160.086C452.453 157.812 454.405 155.964 455.362 155.971Z"
        {...pathProps(7)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M360.759 133.197C362.35 131.607 363.067 132.162 373.056 142.703C383.081 153.283 383.437 154.958 375.651 154.958C368.503 154.958 363.104 152.541 361.176 148.48C359.338 144.606 359.073 134.884 360.759 133.197Z"
        {...pathProps(7)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M481.093 141.565C489.131 133.156 490.778 131.862 492.074 132.938C494.12 134.636 494.092 144.116 492.029 148.465C490.067 152.6 486.229 154.247 478.289 154.365C473.572 154.436 472.098 154.112 471.896 152.958C471.755 152.132 475.892 147.004 481.093 141.565Z"
        {...pathProps(7)}
      />

      {/* Rear Delts */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M374.13 118.731C381.519 114.678 383.957 115.007 387.173 120.494C392.862 130.202 396.452 148.173 393.236 150.845C392.303 151.619 390.609 151.926 389.211 151.575C383.488 150.139 368.38 134.917 366.925 129.121C365.993 125.406 368.466 121.84 374.13 118.731Z"
        {...pathProps(8)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M468.356 116.935C471.145 114.742 473.295 115.291 480.857 120.132C489.282 125.524 488.396 129.721 476.248 141.966C467.673 150.609 464.32 152.607 460.96 151.077C459.008 150.187 458.603 149.26 458.623 145.73C458.675 136.735 464.286 120.138 468.356 116.935Z"
        {...pathProps(8)}
      />

      {/* Forearms */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M200.475 294.405C203.709 292.578 211.523 293.024 214.884 295.226C217.126 296.695 217.325 297.584 217.93 308.82C218.643 322.095 217.668 326.158 212.21 332.644C209.334 336.062 198.22 340.517 195.334 339.41C192.682 338.392 192.37 335.726 194.586 333.007C197.869 328.98 200.754 322.134 200.412 319.18C199.91 314.842 197.027 315.199 194.631 319.896C192.499 324.073 189.999 325.164 188.931 322.38C188.597 321.51 189.082 317.356 190.007 313.147C191.863 304.699 196.291 296.772 200.475 294.405Z"
        {...pathProps(9)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.28124 293.893C11.3812 293.467 14.4373 293.317 16.0723 293.559C19.5931 294.079 25.0724 299.054 27.5244 303.958C30.0402 308.989 32.2374 321.718 30.833 323.124C29.127 324.83 26.7614 323.368 24.8955 319.454C23.8427 317.247 22.6063 316.012 21.6475 316.209C19.2625 316.701 19.8815 325.573 22.5303 328.87C27.4546 334.997 27.9953 336.108 26.8916 337.81C25.4504 340.033 21.3862 339.724 14.0986 336.836C8.44215 334.594 7.9118 334.089 4.83203 328.019L1.56445 321.578L2.20312 309.519C2.6151 301.743 3.30745 296.962 4.15234 296.063C4.87391 295.295 7.18176 294.317 9.28124 293.893Z"
        {...pathProps(9)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M514.914 294.545C517.062 293.573 527.04 294.55 530.099 296.028L533.099 297.482L533.378 310.695C533.64 323.136 533.509 324.204 531.129 328.898C528.309 334.464 527.322 335.166 518.433 337.934C509.057 340.85 506.686 337.465 512.788 329.873C515.32 326.722 515.989 324.938 516.038 321.21C516.114 315.395 513.604 314.116 511.602 318.949C509.962 322.909 507.261 324.46 505.566 322.418C502.594 318.835 509.993 296.771 514.914 294.545Z"
        {...pathProps(9)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M333.343 294.044C338.34 293.962 338.721 294.144 341.455 297.917C345.468 303.458 348.598 313.153 348.599 320.042C348.599 322.626 348.257 323.047 346.382 322.777C345.123 322.595 343.504 321.163 342.632 319.458C340.043 314.393 337.971 313.633 337.023 317.404C336.26 320.443 337.942 325.709 341.214 330.531C346.112 337.749 342.466 340.735 332.71 337.495C327.28 335.691 324.781 333.363 321.712 327.248C319.901 323.639 319.599 321.263 319.599 310.62C319.599 297.224 319.82 296.616 325.285 294.976C326.833 294.511 330.459 294.091 333.343 294.044Z"
        {...pathProps(9)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M345.705 218.117C352.516 210.064 354.002 210.266 354.396 219.304C354.769 227.877 352.539 239.921 349.056 248.137C345.219 257.186 337.915 276.678 336.394 281.929C334.794 287.452 330.649 290.436 328.109 287.897C326.739 286.527 326.723 285.463 327.967 278.405C328.738 274.033 329.921 266.633 330.596 261.958C334.439 235.339 336.707 228.757 345.705 218.117Z"
        {...pathProps(9)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M501.045 211.958C502.553 211.958 512.563 223.913 514.861 228.458C517.272 233.229 520.28 243.934 521.042 250.458C521.428 253.758 522.876 263.152 524.26 271.333C526.44 284.216 526.585 286.4 525.35 287.636C524.2 288.785 523.418 288.833 521.329 287.881C518.56 286.619 518.493 286.48 513.595 271.958C511.833 266.733 508.483 257.958 506.15 252.458C503.819 246.958 501.418 240.433 500.818 237.958C499.405 232.129 498.138 214.511 499.029 213.07C499.409 212.459 500.314 211.958 501.045 211.958Z"
        {...pathProps(9)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0.147456 234.881C0.914466 233.639 2.33149 233.716 3.15039 235.041C3.51858 235.638 4.54488 240.7 5.43066 246.291C8.09062 263.07 7.04361 285.458 3.59863 285.458C2.40993 285.458 2.05023 283.797 1.86425 277.458C1.73522 273.058 1.16653 261.885 0.601557 252.631C0.0375919 243.376 -0.166537 235.389 0.147456 234.881Z"
        {...pathProps(9)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M216.63 239.9C219.159 235.175 219.684 240.596 218.886 263.186C218.222 281.967 217.864 285.458 216.599 285.458C212.158 285.454 212.184 248.208 216.63 239.9Z"
        {...pathProps(9)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.65331 198.958C10.9636 198.959 14.4752 204.419 17.8408 211.688C20.5787 217.6 21.0268 219.787 21.3818 228.958C21.7418 238.265 21.3923 241.164 18.3096 254.458C16.3967 262.707 14.5408 271.482 14.1855 273.958C13.2635 280.387 11.6327 284.958 10.2617 284.958C9.40392 284.957 9.0213 279.902 8.86132 266.498C8.72431 254.959 8.09549 245.493 7.18652 241.248C6.38755 237.514 5.23024 230.143 4.61425 224.87C3.65332 216.633 3.73445 214.309 5.19335 208.37C6.1273 204.568 7.33017 200.896 7.86718 200.208C8.40417 199.521 9.20839 198.958 9.65331 198.958Z"
        {...pathProps(9)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M205.427 205.708C209.64 197.793 211.983 196.924 213.516 202.708C216.272 213.112 216.613 216.226 215.652 222.272C212.715 240.753 211.288 253.06 211.512 257.958C211.879 266 210.514 284.947 209.567 284.958C208.62 284.958 207.325 280.881 205.599 272.458C204.922 269.158 203.231 261.733 201.84 255.958C200.264 249.414 199.132 241.265 198.834 234.331C198.292 221.687 199.336 217.152 205.427 205.708Z"
        {...pathProps(9)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M29.2363 216.708C31.7261 212.803 33.3666 212.126 35.3994 214.158C37.1149 215.878 36.9309 233.422 35.1162 241.147C34.3001 244.618 31.8774 251.508 29.7314 256.458C27.5866 261.408 24.4032 269.508 22.6582 274.458C20.9136 279.407 19.0766 283.87 18.5752 284.375C16.6793 286.285 16.4319 281.74 18.0508 274.706C22.3657 255.961 23.6357 248.93 25.1807 235.22C26.5385 223.181 27.2874 219.766 29.2363 216.708Z"
        {...pathProps(9)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M184.636 214.413C188.286 210.017 193.09 216.799 194.032 227.677C195.187 241.028 197.614 255.265 201.791 273.192C203.862 282.08 203.679 286.438 201.332 284.091C200.672 283.429 198.499 278.067 196.503 272.174C194.508 266.28 190.959 256.733 188.617 250.958C184.603 241.062 184.329 239.753 183.858 228.206C183.486 219.111 183.687 215.557 184.636 214.413Z"
        {...pathProps(9)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M526.079 210.997C526.98 209.255 528.252 207.999 528.908 208.206C529.563 208.414 531.206 211.704 532.558 215.52C535.375 223.467 535.7 232.836 534.254 264.458C533.324 284.798 533.186 285.69 531.205 284.046C528.49 281.79 521.589 243.124 521.61 230.28C521.621 223.303 523.168 216.625 526.079 210.997Z"
        {...pathProps(9)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M324.592 207.958C326.033 207.958 329.085 214.691 330.581 221.17C332.044 227.507 331.558 238.037 329.066 253.958C324.554 282.787 319.638 293.983 319.625 275.458C319.622 271.608 319.091 259.907 318.445 249.458C317.383 232.295 317.439 229.701 319.021 222.62C319.985 218.309 321.416 213.247 322.2 211.37C322.984 209.494 324.061 207.959 324.592 207.958Z"
        {...pathProps(9)}
      />

      {/* Abs */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M85.9912 235.379C86.5513 233.92 87.63 233.753 93.4082 234.238C100.863 234.863 105.087 236.378 106.252 238.843C106.954 240.329 107.432 246.218 109.164 274.738C109.87 286.363 108.673 289.958 104.093 289.958C100.277 289.958 97.8686 284.23 87.9551 251.58C86.0862 245.42 85.1373 237.603 85.9912 235.379Z"
        {...pathProps(10)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M127.727 234.061C133.735 233.928 135.053 235.475 134.304 241.797C133.602 247.731 124.238 278.715 121.273 284.913C119.417 288.794 118.666 289.458 116.137 289.458C113.971 289.458 112.774 288.743 111.682 286.796C110.377 284.472 110.342 281.299 111.405 261.813C112.752 237.118 112.923 236.566 119.728 234.959C121.58 234.521 125.181 234.118 127.727 234.061Z"
        {...pathProps(10)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M118.603 209.7C125.166 208.908 126.103 209.005 130.268 210.896C134.866 212.983 136.601 215.381 136.595 219.643C136.589 224.571 133.34 228.534 128.259 229.813C122.011 231.386 117.457 231.246 114.822 229.401C112.847 228.018 112.599 226.971 112.599 220.024C112.599 211.345 113.174 210.355 118.603 209.7Z"
        {...pathProps(10)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M89.4863 210.505C93.8993 208.601 103.157 209.25 105.807 211.647C108.558 214.137 108.365 226.19 105.527 229.029C103.684 230.872 102.717 231.027 96.7773 230.426C89.2614 229.665 85.9517 228.018 84.5537 224.341C82.2512 218.283 84.2135 212.779 89.4863 210.505Z"
        {...pathProps(10)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M95.2519 188.396C101.244 185.46 105.168 185.286 106.564 187.893C107.133 188.957 107.599 192.712 107.599 196.236C107.599 203.462 106.623 204.895 100.314 206.921C95.4379 208.487 87.3276 207.421 85.0596 204.915C81.1141 200.555 85.7423 193.054 95.2519 188.396Z"
        {...pathProps(10)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M117.362 185.958C120.658 185.958 129.959 190.681 133.077 193.936C135.846 196.825 137.264 202.575 135.761 204.814C134.254 207.055 125.722 208.199 120.599 206.844C113.458 204.956 112.599 203.738 112.599 195.503C112.599 191.28 113.09 187.869 113.799 187.158C114.459 186.498 116.062 185.958 117.362 185.958Z"
        {...pathProps(10)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M114.254 166.787C116.281 164.547 117.744 164.515 124.615 166.555C127.919 167.537 131.288 169.447 133.35 171.509C136.417 174.577 136.681 175.313 136.403 180.06C135.958 187.656 134.492 188.132 125.386 183.632C121.296 181.611 117.569 179.958 117.103 179.958C113.013 179.956 110.953 170.434 114.254 166.787Z"
        {...pathProps(10)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M93.0986 167.268C100.942 164.405 104.083 164.383 106.042 167.181C108.988 171.387 107.108 179.958 103.238 179.958C102.661 179.958 98.6928 181.599 94.4209 183.604C85.3261 187.871 83.5976 187.389 83.6006 180.586C83.6027 173.449 86.2212 169.78 93.0986 167.268Z"
        {...pathProps(10)}
      />

      {/* Obliques */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M62.583 216.958C64.622 216.958 74.7456 223.252 76.1484 225.393C77.7916 227.901 82.598 248.373 82.5986 252.862C82.5985 256.775 79.5032 258.69 75.8603 257.03C70.8143 254.731 60.4109 246.594 59.5186 244.248C57.9168 240.034 58.7455 227.159 61.1943 218.208C61.3826 217.521 62.0071 216.958 62.583 216.958Z"
        {...pathProps(11)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M152.959 218.719C157.105 215.35 158.872 216.747 160.218 224.458C161.818 233.617 161.838 241.898 160.27 244.725C158.917 247.156 146.714 256.468 143.571 257.467C142.528 257.798 140.758 257.579 139.637 256.979C136.994 255.564 136.99 251.669 139.619 239.867C142.321 227.74 143.911 224.245 147.667 222.186C149.4 221.236 151.781 219.675 152.959 218.719Z"
        {...pathProps(11)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M61.5137 197.958C62.9666 197.958 74.5375 204.897 76.7148 207.073C80.4507 210.809 78.4407 219.958 73.8848 219.958C69.2916 219.958 58.2918 203.809 59.9463 199.496C60.2713 198.65 60.9758 197.958 61.5137 197.958Z"
        {...pathProps(11)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M149.916 202.329C160.073 195.546 162.196 196.941 157.935 207.592C155.942 212.571 154.339 214.859 151.303 217.059C149.101 218.654 146.723 219.958 146.02 219.958C143.817 219.958 141.599 216.934 141.599 213.935C141.599 209.199 143.406 206.676 149.916 202.329Z"
        {...pathProps(11)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M147.987 185.939C151.327 184.59 155.243 184.825 156.598 186.457C158.487 188.733 156.208 193.218 150.988 197.495C145.086 202.332 142.212 201.989 141.801 196.403C141.475 191.961 144.11 187.505 147.987 185.939Z"
        {...pathProps(11)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M63.7988 186.158C65.5749 184.383 69.6743 184.706 73.2851 186.908C77.3746 189.402 78.7911 192.124 78.4072 196.75C78.1482 199.866 77.6995 200.501 75.5986 200.734C73.7457 200.939 71.7394 199.699 67.8486 195.947C62.5854 190.87 61.5614 188.396 63.7988 186.158Z"
        {...pathProps(11)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M161.349 164.471C168.473 159.21 169.913 159.865 170.958 168.832C171.752 175.649 171.607 176.728 169.043 183.097C164.729 193.814 162.924 194.312 160.495 185.458C159.891 183.258 158.767 179.348 157.998 176.771C155.816 169.459 156.123 168.328 161.349 164.471Z"
        {...pathProps(11)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M50.2871 161.708C51.1173 160.262 53.4181 160.987 58.2363 164.219C62.5758 167.129 63.0856 167.856 62.9736 170.969C62.8486 174.458 59.4663 187.744 58.1689 189.845C56.636 192.326 54.7336 190.608 51.6826 183.989C48.673 177.46 48.5151 176.563 49.165 169.739C49.546 165.735 50.0511 162.121 50.2871 161.708Z"
        {...pathProps(11)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M141.799 171.157C143.55 169.407 146.652 169.694 150.349 171.946C154.446 174.444 154.484 176.881 150.495 181.423C146.94 185.472 145.41 185.769 142.599 182.958C140.317 180.676 139.807 173.149 141.799 171.157Z"
        {...pathProps(11)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M69.3486 171.529C72.7044 169.709 76.7833 169.542 78.3994 171.157C80.3912 173.149 79.8803 180.676 77.5986 182.958C74.881 185.676 73.9447 185.503 69.999 181.559C65.7163 177.276 65.4789 173.628 69.3486 171.529Z"
        {...pathProps(11)}
      />

      {/* Hamstrings */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M449.829 340.208C451.274 338.428 453.268 338.663 454.078 340.708C456.426 346.64 457.979 394.868 456.051 401.958C454.904 406.172 443.465 429.315 441.494 431.407C439.782 433.224 438.579 430.362 437.499 421.897C436.736 415.914 436.732 411.421 437.485 406.458C438.07 402.608 439.46 392.503 440.575 384.003C443.322 363.063 447.561 343.001 449.829 340.208Z"
        {...pathProps(12)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M399.114 340.912C400.017 338.068 402.321 338.52 404.061 341.885C406.117 345.861 410.069 365.255 412.532 383.458C413.649 391.708 415.027 401.608 415.595 405.458C416.258 409.956 416.305 415.615 415.729 421.292C414.839 430.044 413.76 432.793 411.714 431.528C411.13 431.165 407.419 424.254 403.467 416.166L396.278 401.458L396.376 385.958C396.478 369.883 398.031 344.322 399.114 340.912Z"
        {...pathProps(12)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M459.296 328.958C462.146 328.958 469.532 333.932 471.056 336.875C474.208 342.97 477.332 352.733 477.962 358.458C478.933 367.284 475.987 413.52 474.06 419.691C472.461 424.806 463.167 407.826 461.555 396.844C460.959 392.782 459.995 387.27 459.414 384.595C458.774 381.652 458.624 375.532 459.033 369.095C459.516 361.512 459.24 354.869 458.071 345.958C457.17 339.085 456.261 333.288 456.051 333.077C455.841 332.867 456.119 331.854 456.669 330.827C457.219 329.799 458.401 328.958 459.296 328.958Z"
        {...pathProps(12)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M388.099 331.23C396.579 326.396 397.677 328.786 395.112 346.519C394.186 352.914 393.574 362.571 393.707 368.66C393.953 379.914 392.452 397.111 390.735 402.71C388.786 409.065 382.251 419.958 380.389 419.958C378.951 419.958 378.598 419.122 378.591 415.708C378.587 413.371 378.156 408.758 377.633 405.458C375.79 393.828 374.553 364.354 375.673 358.746C378.402 345.085 379.042 342.838 381.486 338.33C383.176 335.212 385.511 332.705 388.099 331.23Z"
        {...pathProps(12)}
      />

      {/* Quadriceps */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M125.162 354.152C127.233 349.196 128.378 350.934 129.676 361.002C130.276 365.653 131.644 372.485 132.718 376.186C133.832 380.025 134.93 387.772 135.277 394.234C135.944 406.694 134.69 411.541 130.003 414.612C126.816 416.7 122.681 414.648 120.311 409.802C117.704 404.468 116.75 390.738 118.329 381.269C119.901 371.837 123.135 359.005 125.162 354.152Z"
        {...pathProps(13)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M91.1865 353.137C92.4957 346.886 95.9222 354.414 100.209 372.958C105.267 394.839 102.296 414.958 94.0059 414.958C90.2 414.958 88.5885 413.859 86.5557 409.875C83.7269 404.328 83.908 391.937 87.0059 379.144C88.3298 373.676 89.7026 366.109 90.0576 362.329C90.4116 358.55 90.9195 354.414 91.1865 353.137Z"
        {...pathProps(13)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M52.2646 325.176C53.0465 323.921 54.0644 323.128 54.5244 323.412C54.9854 323.698 55.6614 327.425 56.0283 331.693C57.7643 351.907 59.6078 361.248 64.7656 375.958C72.1413 396.994 73.3759 405.542 69.6943 410.089C67.7934 412.436 67.7861 412.437 65.6123 410.47C59.4654 404.906 51.1055 380.012 48.5596 359.688C47.4967 351.201 47.567 348.438 49.0898 338.688C50.0538 332.512 51.4826 326.431 52.2646 325.176Z"
        {...pathProps(13)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M165.171 324.095C166.065 321.4 168.315 324.898 169.427 330.719C171.549 341.825 172.422 346.313 172.43 350.802C172.435 353.98 172.006 357.16 171.28 362.689C170.357 369.71 168.447 379.283 167.034 383.958C164.017 393.948 155.931 410.617 153.684 411.48C152.728 411.845 151.384 411.178 150.237 409.77C147.35 406.217 148.543 396.079 153.484 382.177C159.702 364.688 161.376 357.502 163.111 340.871C163.995 332.394 164.922 324.845 165.171 324.095Z"
        {...pathProps(13)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M66.498 282.147C67.178 280.877 68.2661 280.009 68.917 280.219C70.1009 280.602 70.445 281.594 74.5488 296.458C75.7638 300.858 78.6841 309.633 81.0391 315.958C83.3927 322.282 85.6151 329.081 85.9775 331.064C87.1954 337.741 86.7461 362.37 85.2031 373.458C83.3902 386.482 82.1852 391.011 79.7295 394.045C75.6506 399.081 72.2122 393.39 67.1953 373.299C65.2944 365.686 63.2694 356.533 62.6943 352.958C60.8514 341.499 59.3457 317.693 59.9756 309.958C60.6137 302.133 64.3671 286.129 66.498 282.147Z"
        {...pathProps(13)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M148.731 283.647C149.528 280.541 150.109 279.892 151.867 280.147C153.327 280.358 154.249 281.428 154.718 283.458C155.099 285.108 156.154 288.933 157.061 291.958C160.169 302.321 161.088 315.872 159.762 331.844C157.947 353.716 156.006 363.978 149.953 383.706C145.403 398.537 141.868 399.599 137.811 387.36C134.67 377.882 132.773 356.848 133.627 340.958C134.271 328.958 134.522 327.865 139.89 313.651C142.965 305.508 145.992 296.282 146.616 293.151C147.241 290.02 148.192 285.742 148.731 283.647Z"
        {...pathProps(13)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M419.874 324.03C424.154 323.854 424.37 331.274 420.974 361.671C418.455 384.216 416.827 386.279 414.069 370.423C412.531 361.578 410.392 352.708 407.204 341.958C403.506 329.486 403.584 329.258 412.723 326.013C415.68 324.963 418.898 324.07 419.874 324.03Z"
        {...pathProps(13)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M431.146 323.882C431.863 322.72 432.002 322.748 440.597 325.841C448.671 328.745 449.053 329.766 446.088 340.498C443.092 351.342 440.167 364.202 438.724 372.879C437.484 380.341 436.104 382.431 434.769 378.871C432.274 372.217 429.289 326.89 431.146 323.882Z"
        {...pathProps(13)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M483.566 318.082C484.722 313.787 486.827 312.701 488.162 315.708C488.589 316.671 489.133 324.477 489.37 333.053C489.901 352.236 486.976 375.601 483.578 379.309C483.15 379.775 482.055 377.6 481.146 374.476C477.888 363.266 479.119 334.599 483.566 318.082Z"
        {...pathProps(13)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M366.532 312.958C370.204 312.96 373.657 332.635 373.528 352.818C373.441 366.457 372.935 371.326 370.913 377.958C369.975 381.037 367.833 375.939 365.96 366.169C364.531 358.712 364.099 351.814 364.099 336.458C364.099 325.459 364.422 315.671 364.818 314.708C365.213 313.746 365.985 312.958 366.532 312.958Z"
        {...pathProps(13)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M146.46 265.006C149.393 263.346 148.968 268.569 145.087 281.865C139.391 301.382 136.709 309.516 131.869 321.958C129.408 328.283 125.595 338.858 123.396 345.458C119.146 358.211 118.042 360.293 116.695 358.113C115.515 356.2 113.599 335.906 113.599 325.313C113.599 316.414 113.655 316.205 117.504 310.83C119.652 307.831 123.978 300.67 127.118 294.917C134.397 281.581 144.339 266.206 146.46 265.006Z"
        {...pathProps(13)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M71.0205 265.3C71.3396 264.47 72.1619 263.971 72.8496 264.188C74.6781 264.766 88.7197 286.011 94.1787 296.458C96.7646 301.408 100.618 307.801 102.74 310.665C106.527 315.775 106.599 316.035 106.599 324.611C106.599 335.582 104.677 356.153 103.539 357.365C101.982 359.016 99.8891 356.053 98.1191 349.691C97.1659 346.263 93.5801 336.032 90.1514 326.958C80.2137 300.662 70.0382 267.865 71.0205 265.3Z"
        {...pathProps(13)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M158.147 254.553C160.618 252.081 162.572 252.65 164.089 256.279C165.248 259.055 168.31 274.993 172.578 300.475C173.294 304.751 174.004 320.268 173.696 324.922C173.494 327.973 170.797 323.526 168.727 316.732C167.6 313.033 163.971 302.784 160.66 293.959C152.109 271.159 151.476 261.224 158.147 254.553Z"
        {...pathProps(13)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M56.7471 254.708C57.995 252.341 59.8402 252.507 62.2998 255.208C69.0437 262.613 68.1664 270.456 57.3525 299.458C54.277 307.707 51.2838 316.27 50.7002 318.488C50.1173 320.705 48.9921 323.404 48.2012 324.487C46.8063 326.395 46.7409 326.374 46.0859 323.763C44.551 317.638 53.2391 261.362 56.7471 254.708Z"
        {...pathProps(13)}
      />

      {/* Glutes */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M441.374 255.024C443.98 253.507 445.593 253.744 451.599 256.528C456.802 258.941 467.561 266.608 470.408 269.93C473.307 273.314 477.573 283.835 478.54 289.985C480.454 302.158 476.779 314.498 469.814 319.29C464.394 323.02 461.23 323.958 454.071 323.958C442.769 323.958 432.586 318.404 429.66 310.644C428.263 306.935 428.301 277.583 429.71 272.458C430.901 268.126 438.576 256.655 441.374 255.024Z"
        {...pathProps(14)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M401.099 256.868C407.232 253.894 409.201 253.484 412.062 254.583C414.367 255.469 423.425 269.523 424.139 273.32C424.466 275.063 424.591 284.393 424.416 294.054L424.099 311.621L421.207 315.407C417.328 320.488 410.945 323.188 401.479 323.748C392.488 324.281 387.86 323.004 382.854 318.609C377.109 313.563 374.62 307.011 374.609 296.891C374.603 292.178 375.264 286.081 376.077 283.344C379.201 272.823 388.516 262.968 401.099 256.868Z"
        {...pathProps(14)}
      />

      {/* Traps */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M415.099 53.9581C417.731 51.0497 421.405 51.3384 422.203 54.5177C423.28 58.8076 421.616 70.6547 418.528 80.6886C416.918 85.9199 415.599 91.0221 415.599 92.0284C415.599 93.0324 416.773 97.5718 418.209 102.115C422.725 116.412 423.591 125.04 423.595 155.78C423.599 182.147 423.479 184.081 421.86 183.771C419.515 183.318 413.003 172.326 405.384 155.958L399.099 142.458L398.599 128.958C397.93 110.896 396.421 108.303 382.599 101.458C375.534 97.9594 370.599 94.243 370.599 92.421C370.6 90.249 376.949 86.5434 388.518 81.964C399.994 77.42 407.051 72.9167 409.198 68.7667C410.838 65.596 411.017 62.3341 409.599 61.4581C409.049 61.1175 408.599 59.7411 408.599 58.3986C408.599 56.5052 409.125 55.9581 410.944 55.9581C412.234 55.9578 414.104 55.0577 415.099 53.9581Z"
        {...pathProps(15)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M430.989 54.5421C431.531 52.3835 432.941 51.5803 434.577 52.0655L445.948 54.0343C446.975 54.212 447.693 55.1481 447.599 56.1857L446.25 71.0597C449.581 74.6615 454.919 77.7181 463.606 81.3341C476.423 86.6674 482.597 90.273 482.599 92.421C482.598 94.243 477.663 97.9593 470.599 101.458C456.831 108.276 455.436 110.721 454.613 129.458L453.998 143.458L444.169 162.693C438.764 173.27 433.744 182.421 433.013 183.028C429.944 185.575 429.599 182.803 429.604 155.649C429.61 126.828 430.808 114.003 434.464 103.604C437.487 95.0016 437.824 91.0509 436.061 84.9581L435.819 84.1232C434.951 81.1222 433.759 76.9987 433.043 74.5245C431.216 68.2046 430.153 57.8692 430.989 54.5421Z"
        {...pathProps(15)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M123.591 75.4757C125.843 70.4567 127.017 68.8911 128.341 69.1437C129.76 69.4157 130.222 70.9244 130.738 76.9689C131.089 81.0876 132.366 87.064 133.575 90.2501C135.984 96.5937 135.508 98.3595 131.164 99.1896C127.847 99.8236 125.599 98.2963 125.599 95.4073C125.598 91.6987 122.974 92.4051 120.152 96.8741C114.808 105.34 113.303 102.347 117.559 91.7159C119.23 87.5412 120.599 83.679 120.599 83.1349C120.599 82.5878 121.945 79.1422 123.591 75.4757Z"
        {...pathProps(15)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M90.2412 69.7277C91.3123 67.9968 93.6479 69.1535 95.2207 72.1925C97.1384 75.9021 104.596 97.7229 104.599 99.63C104.599 101.696 102.267 100.172 99.7197 96.4415C97.1571 92.6884 94.599 91.8479 94.5986 94.7579C94.5986 97.1977 92.6642 98.9579 89.9814 98.9581C84.1975 98.9581 83.4234 96.939 86.4863 89.8351C87.5243 87.4278 88.6873 82.0914 89.0703 77.9777C89.4523 73.864 89.9802 70.1507 90.2412 69.7277Z"
        {...pathProps(15)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M134.266 79.6251C135.803 78.0885 139.732 79.3153 150.599 84.7286C157.605 88.2199 162.096 91.0435 162.099 91.9581C162.098 93.011 159.348 94.1691 152.876 95.8409C144.192 98.0839 143.506 98.1264 141.134 96.5724C136.681 93.6537 131.938 81.953 134.266 79.6251Z"
        {...pathProps(15)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M83.0986 79.256C87.3144 79.6819 85.7359 91.1309 80.9404 94.9034C77.7314 97.4284 72.6939 97.5491 64.584 95.2941C55.4982 92.7682 56.2891 91.1519 69.8486 84.5402C76.0359 81.5236 81.9977 79.1455 83.0986 79.256Z"
        {...pathProps(15)}
      />

      {/* Calves */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M80.6201 547.249C85.6709 544.759 89.3303 544.423 93.0332 546.109C96.1729 547.54 96.3167 548.061 97.1387 560.989L97.8076 571.523L91.5146 578.259L79.5449 577.656C67.1616 577.034 62.3655 575.696 61.7881 572.703C61.5878 571.657 63.7034 568.603 67.0918 565.051C70.6575 561.312 73.3565 557.361 74.4346 554.299C75.8694 550.228 76.8544 549.107 80.6201 547.249Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M127.914 545.965C131.442 544.544 134.335 544.824 139.06 547.045C142.731 548.771 143.803 549.938 145.253 553.795C146.29 556.553 149.407 560.978 152.883 564.626C162.506 574.728 160.896 576.492 141.025 577.617L129.952 578.245L123.099 572.106L123.399 561.374C123.719 549.903 124.466 547.354 127.914 545.965Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M442.278 518.959C442.381 518.969 443.166 521.396 444.028 524.361C445.126 528.138 445.599 534.01 445.599 543.861C445.599 556.624 445.788 558.147 447.599 559.958C450.156 562.515 450.632 562.484 456.626 559.35C458.826 558.199 459.929 557.436 461.064 557.384C462.806 557.303 464.625 558.891 470.599 563.293C475.635 567.005 476.896 570.702 473.784 572.624C472.746 573.265 467.222 574.775 461.509 575.978C448.619 578.693 443.137 578.284 439.764 574.362C437.462 571.688 437.383 571.11 437.875 560.516C438.157 554.434 439.08 546.962 439.927 543.912C440.774 540.861 441.609 533.999 441.783 528.663C441.957 523.326 442.18 518.959 442.278 518.959Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M408.74 525.983C410.308 521.488 411.195 523.59 411.919 533.523C412.243 537.958 413.022 542.909 413.651 544.523C414.279 546.137 415.197 552.346 415.691 558.318C416.45 567.509 416.341 569.701 414.983 572.563C412.495 577.805 407.888 578.774 395.56 576.647C381.085 574.151 378.164 573.017 377.788 569.759C377.534 567.562 378.188 566.611 381.302 564.646C383.407 563.318 385.76 561.469 386.531 560.539C389.498 556.965 391.252 556.811 396.973 559.614C402.22 562.188 402.538 562.227 405.018 560.604L407.599 558.912V544.084C407.599 535.557 408.084 527.866 408.74 525.983Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M384.273 500.418C384.263 497.717 391.293 497.514 397.15 497.813C401.482 498.033 404.553 501.926 404.094 506.238C402.225 523.771 399.449 548.879 398.886 550.287C398.869 550.33 398.848 550.354 398.824 550.363C398.485 551.591 397.75 551.958 396.515 551.958C393.374 551.958 391.709 547.87 390.181 536.417C389.378 530.389 387.568 520.624 386.159 514.716C384.751 508.809 383.599 503.086 383.599 501.998C383.599 500.993 383.847 500.483 384.273 500.418Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M456.536 497.813C462.054 497.531 468.611 497.695 469.345 499.973C470.757 500.153 470.397 502.319 467.034 515.958C465.746 521.183 464.022 530.569 463.205 536.814C461.744 547.966 460.127 551.958 457.066 551.958C454.961 551.958 454.1 550.659 454.188 546.594C453.119 538.731 451.072 520.113 449.593 506.238C449.133 501.925 452.204 498.033 456.536 497.813Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M59.2061 451.54C60.8059 447.37 62.6247 450.957 63.2197 459.458C63.7598 467.177 67.8173 485.071 75.123 511.958C77.086 519.184 79.5914 533.607 79.5957 537.708C79.5977 540.255 79.1809 540.958 77.666 540.958C75.6381 540.958 75.1819 539.991 74.1289 533.458C73.1196 527.196 66.7025 500.504 65.1435 496.086C60.7057 483.506 57.1563 456.882 59.2061 451.54Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M157.697 453.107C160.036 446.398 161.98 450.739 161.881 462.458C161.816 470.237 158.612 485.143 152.532 505.958C151.327 510.083 149.093 519.452 147.569 526.776C146.045 534.096 144.547 540.338 144.241 540.65C143.935 540.954 142.93 540.916 142.006 540.562C140.565 540.009 140.424 538.961 141.012 533.188C141.915 524.322 143.959 515.276 148.637 499.458C152.439 486.599 156.598 465.71 156.599 459.479C156.599 457.706 157.093 454.839 157.697 453.107Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M66.1768 434.125C66.9598 431.658 69.0827 433.504 71.7783 438.998C78.2111 452.11 79.4144 458.909 84.7373 512.217C85.7913 522.776 85.3295 529.135 83.6387 527.354C81.6088 525.211 73.1645 496.368 69.7627 479.958C63.1929 448.263 62.8959 444.472 66.1768 434.125Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M149.606 436.135C150.735 434.307 152.208 432.994 152.878 433.218C154.451 433.742 155.889 441.792 155.784 449.486C155.678 457.313 151.038 479.986 145.457 499.958C143.843 505.733 141.787 513.158 140.887 516.458C138.83 524.004 136.794 528.197 135.556 527.433C134.228 526.61 134.407 519.555 136.114 505.458C136.913 498.858 138.042 488.283 138.623 481.958C139.205 475.633 140.133 467.758 140.686 464.458C142.07 456.195 147.121 440.157 149.606 436.135Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M121.721 443.745C123.288 440.791 125.37 442.866 128.791 450.793C131.8 457.766 132.094 459.331 132.042 468.109C132.01 473.416 131.397 479.538 130.679 481.714C129.785 484.422 129.683 486.267 130.354 487.564C131.54 489.86 130.263 510.632 128.432 518.813L127.177 524.423L125.856 519.94C125.13 517.475 124.309 510.31 124.032 504.018C123.754 497.727 123.172 492.103 122.738 491.518C121.626 490.024 119.98 483.665 118.547 475.331C117.504 469.257 117.58 466.525 119.068 456.831C120.027 450.577 121.221 444.689 121.721 443.745Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M97.0967 441.958C98.7617 441.958 98.8737 442.382 101.196 457.686C103.061 469.973 102.471 477.315 98.6924 488.824C97.6214 492.088 96.577 499.138 96.2109 505.587C95.863 511.707 94.9952 518.399 94.2832 520.457L92.9883 524.197L91.8652 520.328C89.9673 513.78 88.1765 490.609 89.3164 487.339C89.8711 485.749 89.9955 483.55 89.5937 482.453C89.1916 481.355 88.5405 476.542 88.1455 471.758C87.3537 462.168 88.6582 455.722 93.2041 446.751C94.5399 444.115 96.2916 441.959 97.0967 441.958Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M397.592 425.972C399.758 421.924 404.631 424.251 408.122 431.002C410.431 435.468 417.335 463.515 418.143 471.708C418.874 479.131 417.404 488.904 414.984 492.708C413.028 495.783 410.321 495.531 406.172 491.888C401.021 487.365 398.537 482.713 397.25 475.177C395.814 466.763 396.077 428.802 397.592 425.972Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M452.116 423.958C455.57 423.958 456.398 428.052 457.075 448.458C457.671 466.422 457.538 469.243 455.771 476.174C454.69 480.417 452.826 485.471 451.631 487.405C448.872 491.869 444.246 495.188 441.357 494.776C438.426 494.358 436.877 490.916 435.52 481.786C434.26 473.315 435.428 465.121 440.699 445.458C444.369 431.771 445.069 430.008 448.179 426.654C449.555 425.171 451.326 423.958 452.116 423.958Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M381.467 426.208C383.996 421.26 387.555 420.429 390.021 424.208C392.447 427.927 393.979 441.38 394.203 460.958C394.432 481.01 393.723 486.056 390.348 488.421C384.979 492.181 379.047 488.463 376.375 479.663C373.295 469.515 376.494 435.937 381.467 426.208Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M463.03 424.423C465.484 420.678 468.946 421.187 471.599 425.683C476.496 433.983 480.123 465.065 477.588 477.011C475.524 486.733 470.47 491.39 464.611 488.963C460.2 487.136 459.437 483.788 459.325 465.792C459.201 445.718 460.804 427.82 463.03 424.423Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M131.822 422.516C134.349 420.746 141.77 420.444 144.665 421.993C147.452 423.485 147.134 428.169 143.991 431.903C138.694 438.198 135.251 438.243 131.777 432.062C129.01 427.136 129.021 424.477 131.822 422.516Z"
        {...pathProps(16)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M75.3486 422.038C78.0298 420.477 85.8768 420.765 88.376 422.516C91.1066 424.428 91.1543 425.948 88.6416 430.875C85.4477 437.135 81.311 437.672 76.7031 432.423C73.1766 428.407 72.5583 423.664 75.3486 422.038Z"
        {...pathProps(16)}
      />

      {/* Lower Back */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M385.358 245.381C393.587 242.444 404.723 244.823 405.413 249.666C405.68 251.545 404.377 252.551 396.668 256.423C387.926 260.814 385.429 262.911 375.787 273.958C371.305 279.094 370.144 277.252 372.076 268.068C372.913 264.086 373.599 259.912 373.599 258.794C373.599 255.642 376.644 249.975 379.258 248.262C380.555 247.412 383.302 246.115 385.358 245.381Z"
        {...pathProps(17)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M452.893 245.223C454.656 244.544 458.657 244.162 461.784 244.373C469.387 244.886 475.022 248.114 477.532 253.393C480.075 258.742 482.878 275.084 481.486 276.452C480.793 277.132 477.812 274.63 472.28 268.73C465.953 261.978 462.324 259.058 456.267 255.848C445.918 250.362 445.224 248.177 452.893 245.223Z"
        {...pathProps(17)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M423.344 200.732C423.917 199.916 425.173 200.37 425.12 201.366C424.625 210.565 423.476 236.391 425.139 253.019C425.213 253.767 424.484 254.326 423.795 254.022C419.006 251.901 404.601 244.751 405.319 235.793C406.091 226.18 418.45 207.71 423.344 200.732Z"
        {...pathProps(17)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M428.21 201.366C428.157 200.37 429.413 199.916 429.986 200.732C434.88 207.71 447.239 226.18 448.011 235.793C448.729 244.751 434.324 251.901 429.535 254.022C428.846 254.327 428.117 253.767 428.191 253.019C429.854 236.391 428.705 210.565 428.21 201.366Z"
        {...pathProps(17)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M381.212 218.958C382.69 218.958 388.268 230.091 389.258 235.014C389.838 237.903 389.317 238.435 381.883 242.543C378.225 244.565 376.353 245.111 375.612 244.371C374.343 243.1 375.571 233.26 378.064 224.708C379.124 221.074 380.282 218.958 381.212 218.958Z"
        {...pathProps(17)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M470.415 219.708C472.502 217.264 473.461 217.52 474.184 220.708C474.527 222.22 475.398 225.933 476.119 228.958C478.605 239.387 478.834 242.517 477.213 243.862C475.976 244.889 474.681 244.511 469.905 241.72C466.714 239.855 463.946 237.515 463.753 236.52C463.358 234.461 468.154 222.356 470.415 219.708Z"
        {...pathProps(17)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M110.194 0.00207031C116.268 -0.0358892 118.211 0.426319 123.694 3.20813C132.66 7.75687 134.599 10.9598 134.599 21.212C134.599 28.3352 134.873 29.495 137.217 32.2794C139.535 35.0353 139.771 35.9995 139.285 40.715C138.875 44.6858 137.989 46.8882 135.8 49.382C134.186 51.2198 132.578 54.2541 132.228 56.1251C131.338 60.8582 120.561 71.3942 115.099 72.8683C108.596 74.622 105.27 74.1749 100.292 70.878C95.1662 67.483 87.5991 58.6394 87.5986 56.0441C87.598 55.1334 86.0233 51.9455 84.0986 48.9581C79.9159 42.4653 79.3667 36.3395 82.5986 32.2306C84.1754 30.2257 84.5986 28.1735 84.5986 22.5353C84.5988 10.7907 88.4672 5.27273 99.456 1.3468C101.46 0.630834 106.292 0.0260698 110.194 0.00207031Z"
        {...pathProps(0)}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M412.611 3.12609C418.751 -0.0265775 419.559 -0.186064 427.664 0.174922C434.964 0.499917 437.033 1.00934 441.664 3.62121C448.878 7.68907 450.667 10.9576 451.29 21.213C451.658 27.2798 452.324 30.2135 453.809 32.3214C456.818 36.5932 455.952 44.9354 452.078 48.9796C448.741 52.4626 447.076 52.7168 445.604 49.9679C443.59 46.2063 439.541 45.0835 427.008 44.8165C414.142 44.5415 411.815 45.1544 407.916 49.8361C406.151 51.957 405.396 52.2519 403.966 51.381C398.232 47.8837 395.737 37.5023 399.387 32.3234C400.874 30.2135 401.54 27.2834 401.908 21.213C402.572 10.2935 404.281 7.40401 412.611 3.12609Z"
        {...pathProps(0)}
      />
        </>
  );


  return (
    <main
      className="muscle-map-page"
      style={{ "--accent-color": accentColor } as CSSProperties & Record<"--accent-color", string>}
    >
      <div
        ref={muscleMapRef}
        aria-label="Front and back muscle map"
        className={`muscle-map ${isBreathingActive ? "is-estimating" : ""} ${isBreathingPaused ? "is-breathing-paused" : ""} ${isScrubbingBreathing ? "is-scrubbing-breathing" : ""} ${estimateStatus === "complete" ? "is-complete" : ""} ${isClearingReveal ? "is-clearing-reveal" : ""} ${isScrubbingReveal ? "is-scrubbing-reveal" : ""} ${hoveredActivationMuscleId !== null ? "is-activation-hovering" : ""}`}
        onPointerMove={(event) => {
          const paths = muscleMapRef.current?.querySelectorAll<SVGGraphicsElement>("[data-muscle-name]");
          if (!paths) return;

          const directTarget = event.target instanceof Element
            ? event.target.closest<SVGGraphicsElement>("[data-muscle-name]")
            : null;
          let closestPath = directTarget;
          let closestDistance = 0;

          if (!closestPath) {
            const distanceToRect = (rect: DOMRect) => {
              const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
              const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
              return Math.hypot(dx, dy);
            };

            closestDistance = Number.POSITIVE_INFINITY;
            paths.forEach((path) => {
              const distance = distanceToRect(path.getBoundingClientRect());
              if (distance < closestDistance) {
                closestDistance = distance;
                closestPath = path;
              }
            });
          }

          if (!closestPath || (!directTarget && closestDistance > 10)) {
            setMuscleTooltip((current) => current ? { ...current, visible: false } : null);
            setHoveredMapMuscleId(null);
            return;
          }
          const muscleId = Number(closestPath.dataset.muscleId);
          setHoveredMapMuscleId(muscleId);
          const bounds = event.currentTarget.getBoundingClientRect();
          setMuscleTooltip({
            name: closestPath.dataset.muscleName ?? "Muscle",
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
            visible: true,
          });
        }}
        onPointerLeave={() => {
          setMuscleTooltip((current) => current ? { ...current, visible: false } : null);
          setHoveredMapMuscleId(null);
        }}
        style={{
          "--reveal-time": `${revealTime}ms`,
          "--reveal-shock-duration": `${SHOCKWAVE_DURATION * (revealDuration / REVEAL_DURATION)}ms`,
          "--breathing-duration": `${breathingConfig.duration}ms`,
          "--breathing-easing": BREATHING_EASINGS[breathingEasing],
          "--breathing-time": `${(breathingConfig.duration / BREATHING_FRAME_COUNT) * breathingFrame}ms`,
          "--breathing-scale-delta": breathingConfig.scaleDelta,
          "--breathing-min-opacity": breathingConfig.minOpacity,
        } as CSSProperties & Record<
          "--reveal-time" | "--reveal-shock-duration" | "--breathing-duration" | "--breathing-easing" | "--breathing-time" | "--breathing-scale-delta" | "--breathing-min-opacity",
          string | number
        >}
      >
        <svg viewBox={BODYMAP_VIEWBOX} fill="none" overflow="visible" preserveAspectRatio="xMidYMid meet" aria-label="Front and back muscle map">
          <g>{paths}</g>
        </svg>
        {muscleTooltip && (
          <span
            className="t-tt-wrap muscle-tooltip-anchor"
            style={{ left: muscleTooltip.x, top: muscleTooltip.y }}
          >
            <span
              className={`t-tt t-resize ${muscleTooltip.visible ? "is-visible" : ""}`}
              role="tooltip"
              aria-hidden={!muscleTooltip.visible}
            >
              <TextSwap text={muscleTooltip.name} />
            </span>
          </span>
        )}
      </div>
      <form
        className={`exercise-entry${estimateError ? " is-error" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          if (estimateStatus === "estimating") {
            cancelEstimate();
          } else {
            handleEstimate();
          }
        }}
      >
        <label className="muscle-input-wrap">
        <span className="visually-hidden">Muscle name</span>
        {!muscleName && isTypewriterActive && typewriterText && (
          <span className="exercise-placeholder" aria-hidden="true">
            {typewriterText}
          </span>
        )}
        {muscleName && !isExerciseInputOverflowing && (
          <span className="exercise-autocomplete" aria-hidden="true">
            <span>{muscleName}</span><span className="exercise-autocomplete__suffix">{suggestionSuffix}</span>
          </span>
        )}
        {isExerciseInputOverflowing && (
          <span className="exercise-input-overflow-prefix" aria-hidden="true">…</span>
        )}
        <textarea
          ref={exerciseInputRef}
          rows={1}
          value={muscleName}
          onChange={(event) => {
            if (!event.target.value) {
              clearExerciseInput();
              return;
            }
            clearBodyMapBeforeInputChange();
            setMuscleName(event.target.value);
            setEstimateStatus("idle");
            setEstimateError(null);
            resizeExerciseInput(event.currentTarget);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
              return;
            }
            if (event.key !== "Tab") return;
            if (!suggestionSuffix && typewriterText) {
              event.preventDefault();
              acceptTypewriterSuggestion();
              return;
            }
            if (!suggestionSuffix) return;
            event.preventDefault();
            acceptSuggestion();
          }}
          autoFocus
          placeholder={typewriterText ? "" : "Exercise name"}
          aria-label="Exercise name"
          aria-describedby={suggestionSuffix ? "exercise-autocomplete-hint" : undefined}
          disabled={estimateStatus === "estimating"}
        />
        {muscleName && (
          <button
            type="button"
            className="exercise-clear-button"
            onClick={clearExerciseInput}
            aria-label="Clear exercise name"
            disabled={estimateStatus === "estimating"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" />
              <path d="m9 9 6 6m0-6-6 6" />
            </svg>
          </button>
        )}
        {suggestionSuffix && (
          <span id="exercise-autocomplete-hint" className="visually-hidden">
            Press Tab to use {exerciseSuggestion?.name} and load its muscle usage.
          </span>
        )}
        </label>
        {showTouchExerciseChips && (
          <div className="exercise-touch-suggestions" aria-label="Suggested exercises">
            {DEMO_EXERCISES.slice(0, 5).map((exercise) => (
              <button
                key={exercise}
                type="button"
                onPointerUp={(event) => {
                  if (event.pointerType !== "touch") return;
                  event.preventDefault();
                  touchChipPressRef.current = true;
                  window.setTimeout(() => { touchChipPressRef.current = false; }, 500);
                  handleExerciseChipClick(exercise);
                }}
                onClick={(event) => {
                  if (touchChipPressRef.current) {
                    touchChipPressRef.current = false;
                    return;
                  }
                  handleExerciseChipClick(exercise);
                }}
                disabled={estimateStatus === "estimating"}
              >
                {exercise}
              </button>
            ))}
          </div>
        )}
        {exerciseSuggestions.length > 0 && (
          <div className="exercise-mobile-suggestions" aria-label="Suggested exercises">
            {exerciseSuggestions.slice(0, 5).map((suggestion) => (
              <button
                key={suggestion.name}
                type="button"
                onClick={() => acceptSuggestion(suggestion)}
              >
                {suggestion.name}
              </button>
            ))}
          </div>
        )}
        {!muscleName && isTypewriterActive && (typewriterExerciseRef.current || typewriterText) && (
          <div className="exercise-mobile-suggestions" aria-label="Suggested exercise">
            <button type="button" onClick={acceptTypewriterSuggestion}>
              {typewriterExerciseRef.current || typewriterText}
            </button>
          </div>
        )}
        {!muscleName && isTypewriterActive && (
          <span className="exercise-suggestion-hint">
            <kbd>Tab</kbd>
            <span>to accept</span>
          </span>
        )}
        <SquircleButton
          type="submit"
          aria-busy={estimateStatus === "estimating"}
          aria-label={estimateStatus === "estimating" ? "Cancel estimation" : undefined}
          className={`estimate-button estimate-button--${estimateStatus}`}
        >
          <span className="estimate-button-content">
            {estimateStatus === "complete" && (
              <span className="t-success-check estimate-check" data-state="in" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none">
                  <path d="M4.5 10.25 8.25 14l7.25-8" pathLength="20" />
                </svg>
              </span>
            )}
            {estimateStatus === "estimating" ? (
              <>
                <span className="estimate-button-label estimate-button-label--estimating">Estimating</span>
                <span className="estimate-button-label estimate-button-label--cancel" aria-hidden="true">Cancel</span>
              </>
            ) : (
              <TextSwap text={estimateStatus === "complete" ? "Completed" : "Estimate"} />
            )}
          </span>
        </SquircleButton>
      </form>
      {estimateError && (
        <div className="estimate-error" role="alert">
          <span className="estimate-error__icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none">
              <g clipPath="url(#exercise-warning-clip)">
                <path d="M7.38413 2.14649C8.73128 -0.186847 12.0992 -0.186851 13.4463 2.14648L19.722 13.0164C21.0692 15.3497 19.3852 18.2664 16.6909 18.2664H4.1395C1.4452 18.2664 -0.238741 15.3497 1.10841 13.0164L7.38413 2.14649Z" fill="#FFCC00" />
                <g className="estimate-error__mark">
                  <path fillRule="evenodd" clipRule="evenodd" d="M8.78843 10.2471L8.84592 4.41181C8.86568 3.6489 9.57388 3.13584 10.5525 3.18367C11.496 3.22978 12.2026 3.82641 12.1478 4.58761L11.6018 10.3846C11.5465 11.1601 11.0193 11.5523 10.1629 11.5105C9.25434 11.4661 8.76865 11.01 8.78843 10.2471Z" fill="#FF8D28" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M9.92565 16.3656C8.87725 16.3144 8.00958 15.4313 8.05997 14.4002C8.11121 13.3518 9.0434 12.5565 10.1093 12.6086C11.1578 12.6599 12.0088 13.5248 11.9567 14.5907C11.9055 15.6393 10.9567 16.416 9.92565 16.3656Z" fill="#FF8D28" />
                </g>
              </g>
              <defs>
                <clipPath id="exercise-warning-clip">
                  <rect width="20.8301" height="18.6621" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </span>
          <span className="estimate-error__copy">
            <strong>{isInvalidExerciseError ? "Exercise not recognized" : "Couldn’t estimate exercise"}</strong>
            <span>{isInvalidExerciseError
              ? "Try a specific name, like Barbell squat or Bench press."
              : estimateError}
            </span>
          </span>
        </div>
      )}
      <section
        className={`activated-muscles${isRevealActive ? " is-visible" : ""}${(hoveredActivationMuscleId ?? hoveredMapMuscleId) !== null ? " is-hovering" : ""}`}
        aria-label="Muscle activation"
        aria-hidden={!isRevealActive}
      >
          <div className="activated-muscles__list">
            {musclesForActivationSliders.map(({ id, name }) => {
              const activation = Math.round(activationByMuscle[id] * 100);
              const highlightedMuscleId = hoveredActivationMuscleId ?? hoveredMapMuscleId;
              return (
                <label
                  className={`activated-muscle${highlightedMuscleId !== null && highlightedMuscleId !== id ? " is-dimmed" : ""}`}
                  key={id}
                  onPointerEnter={() => setHoveredActivationMuscleId(id)}
                  onPointerLeave={() => setHoveredActivationMuscleId(null)}
                >
                  <span
                    className={`activated-muscle__label${activation === 0 ? " is-empty" : ""}`}
                    style={{ "--activation": `${activation}%` } as CSSProperties & Record<"--activation", string>}
                  >
                    <span>{name}</span>
                    <output>{activation}%</output>
                  </span>
                  <SquircleRangeInput
                    type="range"
                    min="0"
                    max="100"
                    value={activation}
                    aria-label={`${name} activation`}
                    style={{ "--activation": `${activation}%` } as CSSProperties & Record<"--activation", string>}
                    onChange={(event) => {
                      const nextActivation = Number(event.target.value);
                      setActivationByMuscle((current) => ({
                        ...current,
                        [id]: nextActivation / 100,
                      }));
                    }}
                  />
                </label>
              );
            })}
          </div>
          {activationDataSource && (
            <p className="activated-muscles__source">
              <span className="activated-muscles__source-icon" aria-hidden="true">
                {activationDataSource === "generated" ? (
                  <svg viewBox="0 0 16 16" fill="none">
                    <path d="m8 1 .8 4.2L13 6l-4.2.8L8 11l-.8-4.2L3 6l4.2-.8L8 1ZM12.5 10.5l.3 1.7 1.7.3-1.7.3-.3 1.7-.3-1.7-1.7-.3 1.7-.3.3-1.7Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" fill="none">
                    <ellipse cx="8" cy="4" rx="5" ry="2.25" />
                    <path d="M3 4v4c0 1.24 2.24 2.25 5 2.25S13 9.24 13 8V4M3 8v4c0 1.24 2.24 2.25 5 2.25S13 13.24 13 12V8" />
                  </svg>
                )}
              </span>
              {activationDataSource === "generated" ? (
                <>
                  <span>Generated</span>
                  {(rawLlmResponse || llmReasoning) && (
                    <button
                      type="button"
                      className="activated-muscles__source-button"
                      onClick={() => setIsRawLlmResponseOpen((open) => !open)}
                      aria-expanded={isRawLlmResponseOpen}
                      aria-controls="generated-llm-response"
                    >
                      {isRawLlmResponseOpen ? "Hide details" : "See more"}
                    </button>
                  )}
                </>
              ) : null}
              {activationDataSource === "cache" && (
                <>
                  <span>Loaded from cache from previous generation</span>
                  <button type="button" className="activated-muscles__clear-button" onClick={clearEstimateCache}>
                    {cacheClearLabel}
                  </button>
                </>
              )}
              {activationDataSource === "exercise-list" && "Loaded from exercise list"}
            </p>
          )}
          {isRawLlmResponseOpen && (llmReasoning || rawLlmResponse) && (
            <pre id="generated-llm-response" className="activated-muscles__raw-response">{[
              llmReasoning ? `Reasoning\n${llmReasoning}` : null,
              rawLlmResponse ? `Response\n${rawLlmResponse}` : null,
            ].filter(Boolean).join("\n\n")}</pre>
          )}
      </section>
      {isStateMachineHidden ? (
        <button
          type="button"
          className={`state-machine-show is-${stateMachineCorner}`}
          onClick={() => setIsStateMachineHidden(false)}
          aria-label="Show animation state machine controls"
        >
          Show controls
        </button>
      ) : <section
        className={`reveal-state-machine is-${stateMachineCorner} ${isDraggingStateMachine ? "is-dragging" : ""} ${isStateMachineCollapsed ? "is-collapsed" : ""}`}
        style={stateMachineDragStyle}
        aria-label="Animation state machine controls"
        onWheel={(event) => {
          event.preventDefault();
          if (controlTab === "reveal") {
            setRevealFrame(revealFrame + (event.deltaY > 0 ? 1 : -1));
          } else {
            setBreathingFrame(breathingFrame + (event.deltaY > 0 ? 1 : -1));
          }
        }}
      >
        <div
          className="reveal-state-machine__header"
          onPointerDown={handleStateMachinePointerDown}
          onPointerMove={handleStateMachinePointerMove}
          onPointerUp={handleStateMachinePointerUp}
          onPointerCancel={handleStateMachinePointerUp}
          onClick={handleStateMachineHeaderClick}
          aria-expanded={!isStateMachineCollapsed}
        >
          <span className="reveal-state-machine__title">
            <span className="state-machine-drag-icon" aria-hidden="true">
              <span /><span /><span /><span /><span /><span />
            </span>
            Animation state machine
          </span>
          <span className={`reveal-state-machine__state is-${estimateStatus}`}>
            {estimateStatus === "estimating" ? "loading" : estimateStatus}
          </span>
        </div>
        <div className="state-machine-body">
        <div className="state-machine-body__content">
        <div className="animation-controls-toolbar">
          <div ref={controlTabsRef} className="animation-control-tabs t-tabs" role="tablist" aria-label="Animation controls">
            <span ref={controlTabsPillRef} className="t-tabs-pill" aria-hidden="true" />
            <button
              type="button"
              id="breathing-controls-tab"
              role="tab"
              aria-selected={controlTab === "breathing"}
              aria-controls="breathing-controls-panel"
              onClick={startBreathingPreview}
            >
              Breathing
            </button>
            <button
              type="button"
              id="reveal-controls-tab"
              role="tab"
              aria-selected={controlTab === "reveal"}
              aria-controls="reveal-controls-panel"
              onClick={triggerReveal}
            >
              Reveal
            </button>
          </div>
          {controlTab === "breathing" ? (
            <div className="animation-controls-toolbar__actions">
              <button
                type="button"
                className="breathing-action-button"
                onClick={toggleBreathingPreview}
                aria-label={!isBreathingActive ? "Preview breathing" : isBreathingPaused || isScrubbingBreathing ? "Resume breathing" : "Pause breathing"}
              >
                {!isBreathingActive ? (
                  <svg className="breathing-icon--play" viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 7 5-7 5z" /></svg>
                ) : isBreathingPaused || isScrubbingBreathing ? (
                  <svg className="breathing-icon--play" viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 7 5-7 5z" /></svg>
                ) : (
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 3.5v9M11.5 3.5v9" /></svg>
                )}
              </button>
              <button
                type="button"
                className="breathing-action-button"
                onClick={stopBreathingPreview}
                disabled={!isBreathingActive}
                aria-label="Stop breathing"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4h8v8H4z" /></svg>
              </button>
            </div>
          ) : (
            <div className="animation-controls-toolbar__actions">
              <button type="button" className="reveal-action-button" onClick={resetAnimations} aria-label="Reset reveal">
                <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M14.5 6.5A6 6 0 1 0 15 10" /><path d="M14.5 3.5v3h-3" /></svg>
              </button>
              <button type="button" className="reveal-action-button" onClick={triggerReveal} aria-label="Trigger reveal">
                <svg className="reveal-icon--play" viewBox="0 0 18 18" aria-hidden="true"><path d="m6 3.5 7 5.5-7 5.5z" /></svg>
              </button>
              <button type="button" className="reveal-action-button error-preview-button" onClick={previewInvalidExerciseError} aria-label="Preview invalid exercise error" title="Preview invalid exercise error">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.25 17 16.5H3L10 3.25Z" /><path d="M10 7.5v4M10 14v.1" /></svg>
              </button>
            </div>
          )}
        </div>
        {controlTab === "breathing" ? (
          <div
            id="breathing-controls-panel"
            className="animation-tab-panel"
            role="tabpanel"
            aria-labelledby="breathing-controls-tab"
            >
            <div className="breathing-controls">
              <label>
                <span>Max scale <output>{breathingMaxScale.toFixed(3)}×</output></span>
                <SquircleRangeInput
                  type="range"
                  className="t-range"
                  min="1"
                  max="1.1"
                  step="0.001"
                  value={breathingMaxScale}
                  style={{ "--range-progress": getRangeProgress(breathingMaxScale, 1, 1.1) } as CSSProperties & Record<"--range-progress", string>}
                  aria-label="Breathing maximum scale"
                  onChange={(event) => setBreathingMaxScale(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Transparency <output>{breathingTransparency}%</output></span>
                <SquircleRangeInput
                  type="range"
                  className="t-range"
                  min="0"
                  max="60"
                  step="1"
                  value={breathingTransparency}
                  style={{ "--range-progress": getRangeProgress(breathingTransparency, 0, 60) } as CSSProperties & Record<"--range-progress", string>}
                  aria-label="Breathing transparency"
                  onChange={(event) => setBreathingTransparency(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Spread strength <output>{breathingSpreadStrength}px</output></span>
                <SquircleRangeInput
                  type="range"
                  className="t-range"
                  min={BREATHING_SPREAD_MIN}
                  max={BREATHING_SPREAD_MAX}
                  step="1"
                  value={breathingSpreadStrength}
                  style={{ "--range-progress": getRangeProgress(breathingSpreadStrength, BREATHING_SPREAD_MIN, BREATHING_SPREAD_MAX) } as CSSProperties & Record<"--range-progress", string>}
                  aria-label="Breathing spread strength"
                  onChange={(event) => setBreathingSpreadStrength(
                    getBreathingSpreadStrength(Number(event.target.value)),
                  )}
                />
              </label>
              <label>
                <span>Easing</span>
                <select
                  value={breathingEasing}
                  aria-label="Breathing easing"
                  onChange={(event) => setBreathingEasing(
                    getBreathingEasing(event.target.value),
                  )}
                >
                  <option value="smooth">Smooth</option>
                  <option value="easeOut">Ease out</option>
                  <option value="linear">Linear</option>
                </select>
              </label>
              <label>
                <span>Cycle <output>{(breathingDuration / 1000).toFixed(1)}s</output></span>
                <SquircleRangeInput
                  type="range"
                  className="t-range"
                  min={BREATHING_DURATION_MIN}
                  max="5000"
                  step="100"
                  value={breathingDuration}
                  style={{ "--range-progress": getRangeProgress(breathingDuration, BREATHING_DURATION_MIN, 5000) } as CSSProperties & Record<"--range-progress", string>}
                  aria-label="Breathing cycle duration"
                  onChange={(event) => setBreathingDuration(Number(event.target.value))}
                />
              </label>
            </div>
            <div className="reveal-scrubber breathing-scrubber">
              <span className="reveal-scrubber__label">
                Frame <output aria-live="polite">{breathingFrame}/{BREATHING_FRAME_COUNT}</output>
              </span>
              <button
                type="button"
                className="reveal-scrubber__step"
                aria-label="Previous breathing frame"
                onClick={() => setBreathingFrame(breathingFrame - 1)}
                disabled={breathingFrame === 0}
              >
                <svg viewBox="0 0 12 16" aria-hidden="true">
                  <path d="m8.5 3-4 5 4 5" />
                </svg>
              </button>
              <div
                className="reveal-scrubber__range"
                style={{ "--range-progress": `${(breathingFrame / BREATHING_FRAME_COUNT) * 100}%` } as CSSProperties & Record<"--range-progress", string>}
              >
                <SquircleRangeInput
                  type="range"
                  className="t-range"
                  min="0"
                  max={BREATHING_FRAME_COUNT}
                  step="1"
                  value={breathingFrame}
                  aria-label="Breathing frame"
                  onChange={(event) => setBreathingFrame(Number(event.target.value))}
                />
              </div>
              <button
                type="button"
                className="reveal-scrubber__step"
                aria-label="Next breathing frame"
                onClick={() => setBreathingFrame(breathingFrame + 1)}
                disabled={breathingFrame === BREATHING_FRAME_COUNT}
              >
                <svg viewBox="0 0 12 16" aria-hidden="true">
                  <path d="m3.5 3 4 5-4 5" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div
            id="reveal-controls-panel"
            className="animation-tab-panel"
            role="tabpanel"
            aria-labelledby="reveal-controls-tab"
            >
            <label className="reveal-path-toggle">
              <button
                type="button"
                className={`t-toggle ${hasInitializedPathToggle ? "is-init" : ""}`}
                role="switch"
                aria-checked={showTouchExerciseChips}
                data-on={String(showTouchExerciseChips)}
                onClick={() => {
                  setHasInitializedPathToggle(true);
                  setShowTouchExerciseChips((isOn) => !isOn);
                }}
              >
                <span className="t-toggle-thumb" />
              </button>
              <span>Exercise suggestion chips</span>
            </label>
            <label className="reveal-path-toggle">
              <button
                type="button"
                className={`t-toggle ${hasInitializedPathToggle ? "is-init" : ""}`}
                role="switch"
                aria-checked={animatePathsIndependently}
                data-on={String(animatePathsIndependently)}
                onClick={() => {
                  setHasInitializedPathToggle(true);
                  setAnimatePathsIndependently((isOn) => !isOn);
                }}
              >
                <span className="t-toggle-thumb" />
              </button>
              <span>Animate paths independently</span>
            </label>
            <label className="reveal-strength-control">
              <span>Spread strength <output>{spreadStrength}px</output></span>
              <SquircleRangeInput
                type="range"
                className="t-range"
                min={REVEAL_SPREAD_MIN}
                max={REVEAL_SPREAD_MAX}
                step="1"
                value={spreadStrength}
                style={{ "--range-progress": getRangeProgress(spreadStrength, REVEAL_SPREAD_MIN, REVEAL_SPREAD_MAX) } as CSSProperties & Record<"--range-progress", string>}
                aria-label="Reveal spread strength"
                onChange={(event) => setSpreadStrength(Number(event.target.value))}
              />
            </label>
            <label className="reveal-strength-control reveal-easing-control">
              <span>Animation length <output>{(revealDuration / 1000).toFixed(2)}s</output></span>
              <SquircleRangeInput
                type="range"
                className="t-range"
                min={REVEAL_DURATION_MIN}
                max={REVEAL_DURATION_MAX}
                step="60"
                value={revealDuration}
                style={{ "--range-progress": getRangeProgress(revealDuration, REVEAL_DURATION_MIN, REVEAL_DURATION_MAX) } as CSSProperties & Record<"--range-progress", string>}
                aria-label="Reveal animation length"
                onChange={(event) => setRevealAnimationDuration(Number(event.target.value))}
              />
            </label>
            <label className="reveal-strength-control reveal-easing-control">
              <span>Easing</span>
              <select
                value={revealEasing}
                aria-label="Reveal easing"
                onChange={(event) => setRevealEasing(getRevealEasing(event.target.value))}
              >
                <option value="easeOut">Ease out</option>
                <option value="smooth">Smooth</option>
                <option value="linear">Linear</option>
              </select>
            </label>
            <div className="reveal-scrubber">
          <span className="reveal-scrubber__label">
            Frame <output aria-live="polite">{revealFrame}/{REVEAL_FRAME_COUNT}</output>
          </span>
          <button
            type="button"
            className="reveal-scrubber__step"
            aria-label="Previous reveal frame"
            onClick={() => setRevealFrame(revealFrame - 1)}
            disabled={revealFrame === 0}
          >
            <svg viewBox="0 0 12 16" aria-hidden="true">
              <path d="m8.5 3-4 5 4 5" />
            </svg>
          </button>
          <div
            className="reveal-scrubber__range"
            style={{ "--range-progress": `${(revealFrame / REVEAL_FRAME_COUNT) * 100}%` } as CSSProperties & Record<"--range-progress", string>}
          >
            <SquircleRangeInput
              type="range"
              className="t-range"
              min="0"
              max={REVEAL_FRAME_COUNT}
              step="1"
              value={revealFrame}
              aria-label="Reveal frame"
              onChange={(event) => setRevealFrame(Number(event.target.value))}
            />
          </div>
          <button
            type="button"
            className="reveal-scrubber__step"
            aria-label="Next reveal frame"
            onClick={() => setRevealFrame(revealFrame + 1)}
            disabled={revealFrame === REVEAL_FRAME_COUNT}
          >
            <svg viewBox="0 0 12 16" aria-hidden="true">
              <path d="m3.5 3 4 5-4 5" />
            </svg>
          </button>
            </div>
          </div>
        )}
        <label className="accent-color-control">
          <span>Accent color</span>
          <input
            type="color"
            value={accentColor}
            onChange={(event) => setAccentColor(getAccentColor(event.target.value))}
            aria-label="Accent color"
          />
          <output>{accentColor}</output>
        </label>
        <div className="state-machine-settings">
          <button type="button" onClick={copySettings}>{settingsCopyLabel}</button>
          <button type="button" onClick={resetSettings}>Reset settings</button>
          <button type="button" onClick={() => setIsStateMachineHidden(true)}>Hide</button>
        </div>
        </div>
        </div>
      </section>}
      <footer className="page-footer">
        <div className="page-footer__meta">
          <p className="page-footer__about">
            Estimates use GPT-5 Nano via OpenRouter, with processing and caching powered by Convex.
          </p>
          <div className="page-footer__identity">
            <a href="https://olkre.com" target="_blank" rel="noopener noreferrer">Oleksandr Kreshchuk</a>
            <span>2026</span>
            <a href="https://x.com/ol_dsn" target="_blank" rel="noopener noreferrer">X</a>
          </div>
        </div>
        <nav className="page-footer__links" aria-label="Footer links">
          <a href="https://sgym.space" target="_blank" rel="noopener noreferrer">
            <img className="page-footer__app-icon" src={`${ASSET_BASE_URL}favicon.png`} alt="" aria-hidden="true" />
            Main site
          </a>
          <a href="https://github.com/Olkre/Sasha-s-Body-Map" target="_blank" rel="noopener noreferrer">
            <svg className="page-footer__link-icon page-footer__github-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.5a9.5 9.5 0 0 0-3 18.51c.47.09.65-.2.65-.45v-1.7c-2.64.57-3.2-1.12-3.2-1.12-.43-1.1-1.05-1.4-1.05-1.4-.86-.59.07-.58.07-.58.95.07 1.45.98 1.45.98.84 1.45 2.2 1.03 2.74.79.08-.61.33-1.03.6-1.27-2.11-.24-4.33-1.05-4.33-4.7 0-1.04.37-1.89.98-2.56-.1-.24-.42-1.21.09-2.52 0 0 .8-.26 2.62.98a9.1 9.1 0 0 1 4.76 0c1.82-1.24 2.62-.98 2.62-.98.51 1.31.19 2.28.09 2.52.61.67.98 1.52.98 2.56 0 3.66-2.23 4.46-4.35 4.7.34.29.64.86.64 1.73v2.57c0 .25.17.54.65.45A9.5 9.5 0 0 0 12 2.5Z" />
            </svg>
            GitHub
          </a>
          <a href="https://apps.apple.com/us/app/sashas-gym-convex/id6759359272" target="_blank" rel="noopener noreferrer">
            <img className="page-footer__app-icon" src={`${ASSET_BASE_URL}app-store-icon.png`} alt="" aria-hidden="true" />
            {/*
              <g clipPath="url(#appstore-icon-clip)">
                <path fill="url(#appstore-icon-gradient)" d="M15.96 0H4.04A4.04 4.04 0 0 0 0 4.04v11.92C0 18.2 1.8 20 4.04 20h11.92C18.2 20 20 18.2 20 15.96V4.04A4.04 4.04 0 0 0 15.96 0" />
              <path fill="#fff" d="m11.9 5.52.48-.84a1.09 1.09 0 1 1 1.9 1.08l-3.6 6.02h3.38c1.1 0 1.72 1.28 1.24 2.18H4.3a1.09 1.09 0 0 1 0-2.18h2.8l3.57-6.02-1.12-1.92a1.09 1.09 0 1 1 1.9-1.1l.45.78Zm-3.1 11.65-1.06 1.81a1.09 1.09 0 1 1-1.9-1.08l.78-1.36q1.32-.4 2.18.63Zm9.04-3.31h2.84a1.09 1.09 0 1 1 0 2.18h-1.58l1.08 1.85a1.09 1.09 0 0 1-1.91 1.08l-4.03-6.98c-.91-1.58-.27-3.17.38-3.7Z" />
              </g>
              <defs>
                <linearGradient id="appstore-icon-gradient" x1="10" x2="10" y1="0" y2="20" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#18bffb" />
                  <stop offset="1" stopColor="#2072f3" />
                </linearGradient>
                <clipPath id="appstore-icon-clip"><path fill="#fff" d="M0 0h20v20H0z" /></clipPath>
              </defs>
            </svg> */}
            App Store
          </a>
        </nav>
      </footer>
    </main>
  );
}
