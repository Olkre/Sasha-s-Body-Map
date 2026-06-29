import React from "react";
import { AnimatedSliderLabel } from "./AnimatedSliderLabel";
import {
  SLIDER_LABEL_DEBOUNCE_MS,
  SLIDER_THUMB_HEIGHT,
  SLIDER_THUMB_WIDTH,
  SLIDER_TRACK_HEIGHT,
} from "./constants";
import {
  sliderThumbLeft,
  sliderThumbTop,
  sliderTickDotTop,
  sliderTrackTop,
  SLIDER_TICK_DOT_SIZE,
  snapToStep,
} from "./sliderUtils";

export type LiquidSliderProps = {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  invert?: boolean;
  tickCount?: number;
  label: string;
  ariaLabel: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
  hideIcons?: boolean;
  className?: string;
};

export function LiquidSlider({
  min,
  max,
  step,
  value,
  onChange,
  invert = false,
  tickCount,
  label,
  ariaLabel,
  leftIcon,
  rightIcon,
  disabled = false,
  hideIcons = false,
  className = "",
}: LiquidSliderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [displayLabel, setDisplayLabel] = React.useState(label);
  const isDraggingRef = React.useRef(false);
  const labelDebounceRef = React.useRef<number | null>(null);
  const pendingLabelRef = React.useRef(label);
  const rangeSpan = max - min;
  const snappedValue = snapToStep(value, min, max, step);
  const inputValue = invert ? min + max - snappedValue : snappedValue;
  const thumbProgress =
    rangeSpan === 0
      ? 0
      : invert
        ? (max - snappedValue) / rangeSpan
        : (snappedValue - min) / rangeSpan;

  const clearLabelDebounce = React.useCallback(() => {
    if (labelDebounceRef.current !== null) {
      window.clearTimeout(labelDebounceRef.current);
      labelDebounceRef.current = null;
    }
  }, []);

  const flushDisplayLabel = React.useCallback(
    (nextLabel: string) => {
      clearLabelDebounce();
      pendingLabelRef.current = nextLabel;
      setDisplayLabel(nextLabel);
    },
    [clearLabelDebounce],
  );

  const scheduleDisplayLabel = React.useCallback((nextLabel: string) => {
    pendingLabelRef.current = nextLabel;

    if (labelDebounceRef.current !== null) {
      return;
    }

    labelDebounceRef.current = window.setTimeout(() => {
      const resolvedLabel = pendingLabelRef.current;
      setDisplayLabel(resolvedLabel);
      labelDebounceRef.current = null;

      if (isDraggingRef.current && resolvedLabel !== pendingLabelRef.current) {
        scheduleDisplayLabel(pendingLabelRef.current);
      }
    }, SLIDER_LABEL_DEBOUNCE_MS);
  }, []);

  React.useEffect(() => {
    pendingLabelRef.current = label;

    if (!isDraggingRef.current) {
      flushDisplayLabel(label);
      return;
    }

    scheduleDisplayLabel(label);
  }, [label, flushDisplayLabel, scheduleDisplayLabel]);

  React.useEffect(() => clearLabelDebounce, [clearLabelDebounce]);

  const isLabelStale = isDragging && displayLabel !== label;
  const tickProgress = (tickValue: number) => {
    if (rangeSpan === 0) return 0;
    const normalized = (tickValue - min) / rangeSpan;
    return invert ? 1 - normalized : normalized;
  };
  const ticks =
    tickCount && tickCount > 1
      ? Array.from({ length: tickCount }, (_, index) => {
          const progress = index / (tickCount - 1);
          const tickValue = min + progress * rangeSpan;
          return { key: index, left: sliderThumbLeft(tickProgress(tickValue)) };
        })
      : [];

  return (
    <div
      className={[
        hideIcons
          ? "relative h-[52px] w-full min-w-0"
          : "grid h-[52px] w-[349px] max-w-full grid-cols-[32px_minmax(0,253px)_32px] items-center justify-center gap-3 px-1",
        disabled ? "pointer-events-none opacity-40" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!hideIcons && (
        <div className="flex h-[52px] items-center justify-center text-[17px] font-semibold text-[rgba(60,60,67,0.6)]">
          {leftIcon}
        </div>
      )}
      <div
        className={
          hideIcons
            ? "group/slider relative h-[52px] w-full"
            : "group/slider relative h-[52px]"
        }
      >
        <div
          className="absolute left-0 right-0 rounded-full bg-[rgba(120,120,120,0.2)]"
          style={{ top: sliderTrackTop, height: SLIDER_TRACK_HEIGHT }}
        />
        {ticks.map((tick) => (
          <div
            key={tick.key}
            className="pointer-events-none absolute z-[1] -translate-x-1/2 rounded-full bg-[rgba(120,120,120,0.32)]"
            style={{
              left: tick.left,
              top: sliderTickDotTop,
              width: SLIDER_TICK_DOT_SIZE,
              height: SLIDER_TICK_DOT_SIZE,
            }}
            aria-hidden="true"
          />
        ))}
        <div
          className={`bodymap-liquid-slider-thumb pointer-events-none absolute z-10 bg-white shadow-[0_4px_14px_rgba(0,0,0,0.2)]${isDragging ? " is-active" : ""}`}
          style={{
            left: sliderThumbLeft(thumbProgress),
            top: sliderThumbTop,
            width: SLIDER_THUMB_WIDTH,
            height: SLIDER_THUMB_HEIGHT,
            borderRadius: SLIDER_THUMB_HEIGHT / 2,
          }}
          aria-hidden="true"
        />
        <div
          className={`bodymap-liquid-slider-label pointer-events-none absolute z-30 -translate-x-1/2 whitespace-nowrap text-sm font-semibold leading-none tracking-[0.02em] text-[#111]${isLabelStale ? " is-stale" : ""}`}
          style={{
            left: sliderThumbLeft(thumbProgress),
            top: sliderThumbTop - 22,
          }}
        >
          <AnimatedSliderLabel text={displayLabel} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            if (disabled) return;
            const next = parseFloat(e.target.value);
            const resolvedValue = invert ? min + max - next : next;
            onChange(snapToStep(resolvedValue, min, max, step));
          }}
          onPointerDown={(e) => {
            isDraggingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsDragging(true);
          }}
          onPointerUp={(e) => {
            isDraggingRef.current = false;
            e.currentTarget.releasePointerCapture(e.pointerId);
            setIsDragging(false);
            flushDisplayLabel(label);
          }}
          onPointerCancel={() => {
            isDraggingRef.current = false;
            setIsDragging(false);
            flushDisplayLabel(label);
          }}
          className="bodymap-liquid-slider absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
          aria-label={ariaLabel}
        />
      </div>
      {!hideIcons && (
        <div className="flex h-[52px] items-center justify-center text-[17px] font-semibold text-[rgba(60,60,67,0.6)]">
          {rightIcon}
        </div>
      )}
    </div>
  );
}
