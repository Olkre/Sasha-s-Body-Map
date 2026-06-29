import type { BezierCoords, EasingOption, ScaleOriginOption } from "./types";

export const BODYMAP_DEFAULTS = {
  scaleOrigin: "top" as const,
  animDuration: 870,
  easingType: "easeIOSDrawer" as const,
  customBezier: { x1: 0.32, y1: 0.72, x2: 0, y2: 1 } satisfies BezierCoords,
  maxBlur: 4,
  bezierInputText: "0.32, 0.72, 0.00, 1.00",
};

export const BODYMAP_SETTINGS_VERSION = "bodymap-defaults-2026-05-25-v4";

export const SLIDER_THUMB_WIDTH = 38;
export const SLIDER_THUMB_HEIGHT = 24;
export const SLIDER_TRACK_HEIGHT = 6;
export const SLIDER_AREA_HEIGHT = 52;
export const SLIDER_LABEL_DEBOUNCE_MS = 180;

export const DURATION_MIN = 200;
export const DURATION_MAX = 5000;
export const DURATION_MAGNET_STEP = 1200;
export const DURATION_FINE_STEP = 10;
export const DURATION_MAGNET_RADIUS = 300;
export const DURATION_MAGNET_STRENGTH = 0.62;

export const SCALE_ORIGIN_OPTIONS: ScaleOriginOption[] = [
  { key: "center", label: "Center" },
  { key: "mixed", label: "Mixed" },
  { key: "top", label: "Top" },
  { key: "bottom", label: "Bottom" },
];

export const EASING_OPTIONS: EasingOption[] = [
  { key: "linear", label: "Linear" },
  { key: "easeOutStrong", label: "Strong Out" },
  { key: "easeInOutStrong", label: "Strong in" },
  { key: "easeIOSDrawer", label: "Strong In-Out" },
  { key: "easeInOutCubic", label: "Smooth In-Out" },
];
