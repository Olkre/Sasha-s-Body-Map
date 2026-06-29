import {
  DURATION_FINE_STEP,
  DURATION_MAGNET_RADIUS,
  DURATION_MAGNET_STEP,
  DURATION_MAGNET_STRENGTH,
  DURATION_MAX,
  DURATION_MIN,
  SLIDER_AREA_HEIGHT,
  SLIDER_THUMB_HEIGHT,
  SLIDER_THUMB_WIDTH,
  SLIDER_TRACK_HEIGHT,
} from "./constants";

export const sliderThumbTop = (SLIDER_AREA_HEIGHT - SLIDER_THUMB_HEIGHT) / 2;
export const sliderTrackTop = (SLIDER_AREA_HEIGHT - SLIDER_TRACK_HEIGHT) / 2;
export const sliderTickDotTop = sliderTrackTop + SLIDER_TRACK_HEIGHT + 5;
export const SLIDER_TICK_DOT_SIZE = 4;

export const formatDuration = (durationMs: number) =>
  durationMs >= 1000
    ? `${(durationMs / 1000).toFixed(durationMs % 1000 === 0 ? 0 : 2)}s`
    : `${durationMs}ms`;

export const formatBlur = (blur: number) =>
  Number.isInteger(blur) ? `${blur}px` : `${blur.toFixed(1)}px`;

export const sliderThumbLeft = (progress: number) =>
  `calc(${progress * 100}% + ${(0.5 - progress) * SLIDER_THUMB_WIDTH}px)`;

export const snapToStep = (
  value: number,
  min: number,
  max: number,
  step?: number,
) => {
  if (!step || step <= 0) return value;
  const snapped = min + Math.round((value - min) / step) * step;
  return Math.min(max, Math.max(min, snapped));
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const durationMagnetStops = Array.from(
  { length: 5 },
  (_, index) => DURATION_MIN + index * DURATION_MAGNET_STEP,
);

export const applyDurationMagnet = (value: number) => {
  const clampedValue = clamp(value, DURATION_MIN, DURATION_MAX);
  const nearestStop = durationMagnetStops.reduce((nearest, stop) =>
    Math.abs(stop - clampedValue) < Math.abs(nearest - clampedValue)
      ? stop
      : nearest,
  );
  const distance = Math.abs(nearestStop - clampedValue);

  if (distance > DURATION_MAGNET_RADIUS) {
    return snapToStep(
      clampedValue,
      DURATION_MIN,
      DURATION_MAX,
      DURATION_FINE_STEP,
    );
  }

  const influence =
    (1 - distance / DURATION_MAGNET_RADIUS) * DURATION_MAGNET_STRENGTH;
  return snapToStep(
    clampedValue + (nearestStop - clampedValue) * influence,
    DURATION_MIN,
    DURATION_MAX,
    DURATION_FINE_STEP,
  );
};
