export const REVEAL_DURATION = 1260;
export const REVEAL_DURATION_MIN = 480;
export const REVEAL_DURATION_MAX = 3000;
export const REVEAL_FRAME_COUNT = 36;
export const SHOCKWAVE_DURATION = 560;
export const SHOCKWAVE_TRAVEL_DURATION = REVEAL_DURATION - SHOCKWAVE_DURATION;
const PATH_STAGGER = 30;
// Keep enough of the geographic timing to make the scan read from head to toe.
// A pure inverse ease-out bunches nearly every upper-body muscle into the first 140ms.
const REVEAL_TRAVEL_LINEAR_WEIGHT = 0.75;
const MAX_PATH_SPREAD = 210;
export const REVEAL_SPREAD_MIN = 0;
export const REVEAL_SPREAD_DEFAULT = 6;
export const REVEAL_SPREAD_MAX = 40;
export const REVEAL_EASINGS = {
  smooth: "var(--ease-in-out)",
  easeOut: "var(--ease-out)",
  linear: "linear",
} as const;
export type RevealEasing = keyof typeof REVEAL_EASINGS;
export const REVEAL_EASING_DEFAULT: RevealEasing = "linear";

export const getRevealDuration = (duration: number) =>
  Math.max(REVEAL_DURATION_MIN, Math.min(REVEAL_DURATION_MAX, duration));
const BODY_FILL = "#e6e6e6";
const ACTIVE_FILL = "#9d91ff";
const BODY_RGB = [230, 230, 230] as const;
const ACTIVE_WAVE_RGB = [199, 192, 255] as const;
const ACTIVE_RGB = [157, 145, 255] as const;

const getAccentRgb = (color?: string) => {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return ACTIVE_RGB;
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ] as const;
};

export const getRevealEasing = (easing: unknown): RevealEasing =>
  typeof easing === "string" && easing in REVEAL_EASINGS
    ? easing as RevealEasing
    : REVEAL_EASING_DEFAULT;

const cubicCoordinate = (time: number, first: number, second: number) => {
  const inverse = 1 - time;
  return 3 * inverse * inverse * time * first
    + 3 * inverse * time * time * second
    + time * time * time;
};

const cubicDerivative = (time: number, first: number, second: number) =>
  3 * (1 - time) * (1 - time) * first
  + 6 * (1 - time) * time * (second - first)
  + 3 * time * time * (1 - second);

const cubicBezierProgress = (
  progress: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => {
  let time = progress;
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const error = cubicCoordinate(time, x1, x2) - progress;
    const derivative = cubicDerivative(time, x1, x2);
    if (Math.abs(error) < 0.000001 || Math.abs(derivative) < 0.000001) break;
    time = Math.max(0, Math.min(1, time - error / derivative));
  }
  return cubicCoordinate(time, y1, y2);
};

export const easeRevealProgress = (progress: number, easing: RevealEasing) => {
  const clamped = Math.max(0, Math.min(1, progress));
  if (easing === "linear") return clamped;
  if (easing === "smooth") return cubicBezierProgress(clamped, 0.77, 0, 0.175, 1);
  return cubicBezierProgress(clamped, 0.23, 1, 0.32, 1);
};

export const getRevealTravelDelay = (
  delay: number,
  easing: RevealEasing,
  travelDuration = SHOCKWAVE_TRAVEL_DURATION,
) => {
  const position = Math.max(0, Math.min(1, delay / travelDuration));
  if (position === 0 || position === 1 || easing === "linear") {
    return position * travelDuration;
  }

  let lowerTime = 0;
  let upperTime = 1;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const candidateTime = (lowerTime + upperTime) / 2;
    if (easeRevealProgress(candidateTime, easing) < position) {
      lowerTime = candidateTime;
    } else {
      upperTime = candidateTime;
    }
  }
  const easedDelay = ((lowerTime + upperTime) / 2) * travelDuration;
  const linearDelay = position * travelDuration;

  return linearDelay * REVEAL_TRAVEL_LINEAR_WEIGHT
    + easedDelay * (1 - REVEAL_TRAVEL_LINEAR_WEIGHT);
};

const interpolateFill = (
  startColor: readonly number[],
  endColor: readonly number[],
  progress: number,
) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const channels = startColor.map((start, index) =>
    Math.round(start + (endColor[index] - start) * clampedProgress),
  );

  return `rgb(${channels.join(" ")})`;
};

const getAssignmentFillByOpacity = (
  assignmentOpacity: number,
  activeRgb: readonly number[] = ACTIVE_RGB,
) => {
  if (assignmentOpacity <= 0) return BODY_FILL;
  if (assignmentOpacity >= 1) return activeRgb === ACTIVE_RGB ? ACTIVE_FILL : `rgb(${activeRgb.join(" ")})`;
  return interpolateFill(BODY_RGB, activeRgb, assignmentOpacity);
};

const interpolateActiveFill = (
  progress: number,
  assignmentOpacity: number,
  activeRgb: readonly number[] = ACTIVE_RGB,
) => {
  const activeWaveRgb = activeRgb === ACTIVE_RGB
    ? ACTIVE_WAVE_RGB
    : activeRgb.map((channel, index) =>
        Math.round(BODY_RGB[index] + (channel - BODY_RGB[index]) * 0.72),
      );
  if (progress <= 0) return BODY_FILL;
  if (progress < 0.28) {
    return interpolateFill(BODY_RGB, activeWaveRgb, progress / 0.28);
  }
  const assignmentFill = BODY_RGB.map((channel, index) =>
    channel + (activeRgb[index] - channel) * assignmentOpacity,
  );
  if (progress >= 0.78) return getAssignmentFillByOpacity(assignmentOpacity, activeRgb);
  return interpolateFill(activeWaveRgb, assignmentFill, (progress - 0.28) / 0.5);
};

export type ShockwaveTiming = { delay: number; impact: number };
export type PathShockwave = ShockwaveTiming & {
  spreadX: number;
  spreadY: number;
};
export type PathMeasurement = {
  pathKey: string;
  muscleId: number;
  centerX: number;
  centerY: number;
};

export const SHOCKWAVE_BY_MUSCLE: Record<number, ShockwaveTiming> = {
  0: { delay: 0, impact: 1 },
  2: { delay: 70, impact: 0.96 },
  4: { delay: 120, impact: 0.92 },
  5: { delay: 140, impact: 0.9 },
  8: { delay: 160, impact: 0.88 },
  3: { delay: 190, impact: 0.84 },
  15: { delay: 180, impact: 0.86 },
  6: { delay: 220, impact: 0.8 },
  7: { delay: 240, impact: 0.78 },
  9: { delay: 260, impact: 0.75 },
  1: { delay: 260, impact: 0.74 },
  10: { delay: 280, impact: 0.72 },
  11: { delay: 300, impact: 0.7 },
  14: { delay: 380, impact: 0.6 },
  17: { delay: 390, impact: 0.58 },
  13: { delay: 420, impact: 0.54 },
  12: { delay: 450, impact: 0.5 },
  16: { delay: 520, impact: 0.44 },
};

export const ASSIGNED_MUSCLE_IDS = new Set([2, 4, 6, 10, 13, 14, 16]);

// Completed assignments use color as a lightweight intensity scale.
export const ASSIGNMENT_OPACITY_BY_MUSCLE: Record<number, number> = {
  2: 0.95, // Upper chest
  4: 0.78, // Front delts
  6: 0.88, // Biceps
  10: 0.62, // Abs
  13: 1, // Quadriceps
  14: 0.92, // Glutes
  16: 0.48, // Calves
};

export const getAssignmentOpacity = (muscleId: number) =>
  ASSIGNMENT_OPACITY_BY_MUSCLE[muscleId] ?? 1;

export const getAssignmentFill = (
  muscleId: number,
  assignmentOpacity = getAssignmentOpacity(muscleId),
  accentColor?: string,
) => getAssignmentFillByOpacity(assignmentOpacity, getAccentRgb(accentColor));

export const createPathShockwaveSchedule = (measurements: PathMeasurement[]) => {
  const pathsByMuscle = new Map<number, PathMeasurement[]>();

  for (const measurement of measurements) {
    const musclePaths = pathsByMuscle.get(measurement.muscleId) ?? [];
    musclePaths.push(measurement);
    pathsByMuscle.set(measurement.muscleId, musclePaths);
  }

  const sortedCenterXs = [...measurements].map(({ centerX }) => centerX).sort((a, b) => a - b);
  let bodySplit = Number.POSITIVE_INFINITY;
  let largestGap = 0;
  for (let index = 1; index < sortedCenterXs.length; index += 1) {
    const gap = sortedCenterXs[index] - sortedCenterXs[index - 1];
    if (gap > largestGap) {
      largestGap = gap;
      bodySplit = (sortedCenterXs[index] + sortedCenterXs[index - 1]) / 2;
    }
  }

  const bodyCenters = [false, true].map((isRightBody) => {
    const bodyPaths = measurements.filter(({ centerX }) => (centerX > bodySplit) === isRightBody);
    const centerXs = bodyPaths.map(({ centerX }) => centerX);
    const centerYs = bodyPaths.map(({ centerY }) => centerY);
    return {
      x: (Math.min(...centerXs) + Math.max(...centerXs)) / 2,
      y: (Math.min(...centerYs) + Math.max(...centerYs)) / 2,
    };
  });
  const schedule: Record<string, PathShockwave> = {};
  for (const [muscleId, musclePaths] of pathsByMuscle) {
    const baseTiming = SHOCKWAVE_BY_MUSCLE[muscleId] ?? { delay: 0, impact: 0 };
    const sortedPaths = [...musclePaths].sort(
      (a, b) => a.centerY - b.centerY || a.centerX - b.centerX,
    );
    const spread = Math.min(MAX_PATH_SPREAD, (sortedPaths.length - 1) * PATH_STAGGER);
    const start = Math.max(
      0,
      Math.min(SHOCKWAVE_TRAVEL_DURATION - spread, baseTiming.delay - spread / 2),
    );

    sortedPaths.forEach((path, index) => {
      const delay = sortedPaths.length === 1
        ? baseTiming.delay
        : start + (index / (sortedPaths.length - 1)) * spread;
      const bodyCenter = bodyCenters[path.centerX > bodySplit ? 1 : 0];
      const deltaX = path.centerX - bodyCenter.x;
      const deltaY = path.centerY - bodyCenter.y;
      const distance = Math.hypot(deltaX, deltaY) || 1;
      schedule[path.pathKey] = {
        delay,
        impact: baseTiming.impact,
        spreadX: deltaX / distance,
        spreadY: deltaY / distance,
      };
    });
  }

  return schedule;
};

export const getRevealPathState = (
  muscleId: number,
  revealTime: number,
  timing = SHOCKWAVE_BY_MUSCLE[muscleId] ?? { delay: 0, impact: 0 },
  spread = { x: 0, y: 0 },
  spreadStrength = REVEAL_SPREAD_DEFAULT,
  assignmentOpacity = getAssignmentOpacity(muscleId),
  accentColor?: string,
) => {
  const shockwave = timing;
  const elapsed = revealTime - shockwave.delay;
  const isAssigned = ASSIGNED_MUSCLE_IDS.has(muscleId);
  const activeRgb = getAccentRgb(accentColor);

  if (elapsed <= 0) {
    return { scale: 1, transform: "scale(1)", opacity: 1, fill: BODY_FILL };
  }

  if (elapsed >= SHOCKWAVE_DURATION) {
    return {
      scale: 1,
      transform: "scale(1)",
      opacity: 1,
      fill: isAssigned ? getAssignmentFill(muscleId, assignmentOpacity, accentColor) : BODY_FILL,
    };
  }

  const progress = elapsed / SHOCKWAVE_DURATION;
  let scale: number;
  let spreadProgress: number;
  const fill = isAssigned ? interpolateActiveFill(progress, assignmentOpacity, activeRgb) : BODY_FILL;

  if (progress < 0.28) {
    const phase = progress / 0.28;
    scale = 1 - phase * shockwave.impact * 0.25;
    spreadProgress = phase;
  } else if (progress < 0.58) {
    const phase = (progress - 0.28) / 0.3;
    scale = 1 - shockwave.impact * 0.25 + phase * shockwave.impact * 0.3;
    spreadProgress = 1 - phase * 0.65;
  } else if (progress < 0.78) {
    const phase = (progress - 0.58) / 0.2;
    scale = 1 + shockwave.impact * 0.05 - phase * shockwave.impact * 0.065;
    spreadProgress = 0.35 - phase * 0.25;
  } else {
    const phase = (progress - 0.78) / 0.22;
    scale = 1 - (1 - phase) * shockwave.impact * 0.015;
    spreadProgress = 0.1 * (1 - phase);
  }

  const motionOpacity = 1 - Math.abs(1 - scale);
  const opacity = motionOpacity;
  const safeSpreadStrength = Math.max(REVEAL_SPREAD_MIN, Math.min(REVEAL_SPREAD_MAX, spreadStrength));
  const translateX = spread.x * safeSpreadStrength * shockwave.impact * spreadProgress;
  const translateY = spread.y * safeSpreadStrength * shockwave.impact * spreadProgress;
  const transform = spread.x === 0 && spread.y === 0
    ? `scale(${scale})`
    : `translate(${translateX}px, ${translateY}px) scale(${scale})`;

  return { scale, translateX, translateY, transform, opacity, fill };
};
