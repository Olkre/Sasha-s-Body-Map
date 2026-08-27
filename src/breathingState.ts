export const BREATHING_DURATION_MIN = 800;
export const BREATHING_DURATION_MAX = 5000;
export const BREATHING_DURATION_DEFAULT = 2700;
export const BREATHING_FRAME_COUNT = 36;
export const BREATHING_MAX_SCALE_MIN = 1;
export const BREATHING_MAX_SCALE_MAX = 1.1;
export const BREATHING_MAX_SCALE_DEFAULT = 1.041;
export const BREATHING_TRANSPARENCY_MIN = 0;
export const BREATHING_TRANSPARENCY_MAX = 60;
export const BREATHING_TRANSPARENCY_DEFAULT = 60;
export const BREATHING_SPREAD_MIN = 0;
export const BREATHING_SPREAD_MAX = 40;
export const BREATHING_SPREAD_DEFAULT = 0;
export const BREATHING_EASINGS = {
  smooth: "var(--ease-in-out)",
  easeOut: "var(--ease-out)",
  linear: "linear",
} as const;
export type BreathingEasing = keyof typeof BREATHING_EASINGS;
export const BREATHING_EASING_DEFAULT: BreathingEasing = "linear";

export const getBreathingEasing = (easing: unknown): BreathingEasing =>
  typeof easing === "string" && easing in BREATHING_EASINGS
    ? easing as BreathingEasing
    : BREATHING_EASING_DEFAULT;

export const getBreathingSpreadStrength = (strength: number) =>
  Math.max(BREATHING_SPREAD_MIN, Math.min(BREATHING_SPREAD_MAX, strength));

export const getBreathingConfig = (
  maxScale: number,
  transparency: number,
  duration: number,
) => {
  const clampedMaxScale = Math.max(
    BREATHING_MAX_SCALE_MIN,
    Math.min(BREATHING_MAX_SCALE_MAX, maxScale),
  );
  const clampedTransparency = Math.max(
    BREATHING_TRANSPARENCY_MIN,
    Math.min(BREATHING_TRANSPARENCY_MAX, transparency),
  );

  return {
    duration: Math.max(BREATHING_DURATION_MIN, Math.min(BREATHING_DURATION_MAX, duration)),
    scaleDelta: clampedMaxScale - 1,
    minOpacity: 1 - clampedTransparency / 100,
  };
};

export const getBreathingDelay = (
  pathDelay: number,
  duration: number,
  travelDuration: number,
  synchronized = false,
) => {
  if (synchronized) return 0;
  const position = Math.max(0, Math.min(1, pathDelay / travelDuration));
  return -((1 - position) * (duration / 2));
};
