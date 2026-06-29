export type BezierCoords = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type ScaleOriginVariant = "center" | "mixed" | "top" | "bottom";

export type ScaleOriginBar = "top" | "middle" | "bottom";

export type EasingPresetKey =
  | "linear"
  | "easeOutStrong"
  | "easeInOutStrong"
  | "easeIOSDrawer"
  | "easeInOutCubic"
  | "easeOutElastic"
  | "easeOutBounce"
  | "custom";

export type EasingOption = {
  key: EasingPresetKey;
  label: string;
};

export type ScaleOriginOption = {
  key: ScaleOriginVariant;
  label: string;
};
