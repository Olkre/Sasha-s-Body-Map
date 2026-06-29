import type { ReactNode } from "react";
import { AnimationControlHeader } from "./AnimationControlHeader";
import {
  DURATION_FINE_STEP,
  DURATION_MAX,
  DURATION_MIN,
  EASING_OPTIONS,
  SCALE_ORIGIN_OPTIONS,
} from "./constants";
import { EasingCurveSection } from "./EasingCurveSection";
import { LiquidGlassButton } from "./LiquidGlassButton";
import { LiquidSlider } from "./LiquidSlider";
import { ScaleOriginSegmentedControl } from "./ScaleOriginSegmentedControl";
import {
  FastSpeedIcon,
  FemaleBodyIcon,
  HighBlurIcon,
  LowBlurIcon,
  MaleBodyIcon,
  SlowSpeedIcon,
} from "./SliderIcons";
import {
  applyDurationMagnet,
  formatBlur,
  formatDuration,
} from "./sliderUtils";
import type { BezierCoords, EasingPresetKey, ScaleOriginVariant } from "./types";

export type AnimationControlPanelProps = {
  onClose: () => void;
  onReplay: () => void;
  onReset: () => void;
  progress: number;
  onGenderProgressChange: (value: number) => void;
  scaleOrigin: ScaleOriginVariant;
  scaleOriginIndex: number;
  scaleOriginReplayTick: number;
  onScaleOriginChange: (value: ScaleOriginVariant) => void;
  animDuration: number;
  onAnimDurationChange: (value: number) => void;
  maxBlur: number;
  onMaxBlurChange: (value: number) => void;
  displayBezier: BezierCoords;
  previewedEasingType: EasingPresetKey;
  easingIndex: number;
  onEasingSelect: (key: EasingPresetKey) => void;
  onEasingPreview: (key: EasingPresetKey) => void;
  onEasingPreviewEnd: () => void;
  advancedEditor?: ReactNode;
};

export function AnimationControlPanel({
  onClose,
  onReplay,
  onReset,
  progress,
  onGenderProgressChange,
  scaleOrigin,
  scaleOriginIndex,
  scaleOriginReplayTick,
  onScaleOriginChange,
  animDuration,
  onAnimDurationChange,
  maxBlur,
  onMaxBlurChange,
  displayBezier,
  previewedEasingType,
  easingIndex,
  onEasingSelect,
  onEasingPreview,
  onEasingPreviewEnd,
  advancedEditor,
}: AnimationControlPanelProps) {
  return (
    <div className="flex w-full flex-col gap-2 lg:w-[349px]">
      <AnimationControlHeader onClose={onClose} onReplay={onReplay} />

      <LiquidSlider
        min={0}
        max={100}
        step={1}
        value={Math.round(progress)}
        label={`${Math.round(progress)}%`}
        ariaLabel="Gender scrub"
        onChange={onGenderProgressChange}
        leftIcon={<MaleBodyIcon />}
        rightIcon={<FemaleBodyIcon />}
      />

      <div className="flex flex-col gap-4">
        <ScaleOriginSegmentedControl
          options={SCALE_ORIGIN_OPTIONS}
          value={scaleOrigin}
          selectedIndex={scaleOriginIndex}
          replayTick={scaleOriginReplayTick}
          onChange={onScaleOriginChange}
        />

        <LiquidSlider
          min={DURATION_MIN}
          max={DURATION_MAX}
          step={DURATION_FINE_STEP}
          invert
          tickCount={5}
          value={animDuration}
          label={formatDuration(animDuration)}
          ariaLabel="Transition duration"
          onChange={(val) => onAnimDurationChange(applyDurationMagnet(val))}
          leftIcon={<SlowSpeedIcon />}
          rightIcon={<FastSpeedIcon />}
        />

        <LiquidSlider
          min={0}
          max={24}
          step={0.25}
          value={maxBlur}
          label={formatBlur(maxBlur)}
          ariaLabel="Scale-down blur"
          onChange={(val) => onMaxBlurChange(Math.round(val * 100) / 100)}
          leftIcon={<LowBlurIcon />}
          rightIcon={<HighBlurIcon />}
        />

        <EasingCurveSection
          displayBezier={displayBezier}
          options={EASING_OPTIONS}
          selectedIndex={easingIndex}
          previewedEasingType={previewedEasingType}
          onSelect={onEasingSelect}
          onPreview={onEasingPreview}
          onPreviewEnd={onEasingPreviewEnd}
        />

        {advancedEditor}

        <LiquidGlassButton onClick={onReset} className="w-[200px] whitespace-nowrap">
          Reset to defaults
        </LiquidGlassButton>
      </div>
    </div>
  );
}
