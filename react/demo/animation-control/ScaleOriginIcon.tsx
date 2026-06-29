import { motion } from "motion/react";
import type { ScaleOriginBar, ScaleOriginVariant } from "./types";

function getBarTransformOrigin(
  variant: ScaleOriginVariant,
  position: ScaleOriginBar,
): string {
  if (variant === "top") return "50% 0%";
  if (variant === "bottom") return "50% 100%";
  if (variant === "center") return "50% 50%";
  if (position === "top") return "50% 0%";
  if (position === "bottom") return "50% 100%";
  return "50% 50%";
}

function getBarTapAnimation(
  variant: ScaleOriginVariant,
  position: ScaleOriginBar,
  index: number,
  isHighlighted: boolean,
) {
  const origin = getBarTransformOrigin(variant, position);
  const targetOpacity = isHighlighted ? 1 : 0.2;
  const startOpacity = isHighlighted ? 0.35 : 0.08;

  if (origin === "50% 0%") {
    return {
      origin,
      initial: { scaleY: 0, y: -5, opacity: startOpacity },
      animate: { scaleY: 1, y: 0, opacity: targetOpacity },
      delay: index * 0.04,
    };
  }

  if (origin === "50% 100%") {
    return {
      origin,
      initial: { scaleY: 0, y: 5, opacity: startOpacity },
      animate: { scaleY: 1, y: 0, opacity: targetOpacity },
      delay: (2 - index) * 0.04,
    };
  }

  return {
    origin,
    initial: { scale: 0.35, opacity: startOpacity },
    animate: { scale: 1, opacity: targetOpacity },
    delay: Math.abs(index - 1) * 0.03,
  };
}

type ScaleOriginIconProps = {
  variant: ScaleOriginVariant;
  active: boolean;
  replayKey: string;
};

export function ScaleOriginIcon({
  variant,
  active,
  replayKey,
}: ScaleOriginIconProps) {
  const bars: ScaleOriginBar[] = ["top", "middle", "bottom"];

  const isBarHighlighted = (position: ScaleOriginBar) =>
    (variant === "center" && position === "middle") ||
    (variant === "mixed" && (position === "top" || position === "bottom")) ||
    (variant === "top" && position === "top") ||
    (variant === "bottom" && position === "bottom");

  return (
    <div
      className="inline-flex h-[16px] w-4 flex-col items-start justify-start gap-px"
      aria-hidden="true"
    >
      {bars.map((position, index) => {
        const isHighlighted = isBarHighlighted(position);
        const tapAnimation = getBarTapAnimation(
          variant,
          position,
          index,
          isHighlighted,
        );

        return (
          <motion.div
            key={`${position}-${active ? replayKey : "idle"}`}
            className="h-1 w-4 rounded-full bg-current"
            style={{ transformOrigin: tapAnimation.origin }}
            initial={active ? tapAnimation.initial : false}
            animate={tapAnimation.animate}
            transition={{
              type: "spring",
              stiffness: 560,
              damping: 26,
              mass: 0.5,
              delay: active ? tapAnimation.delay : 0,
            }}
          />
        );
      })}
    </div>
  );
}
