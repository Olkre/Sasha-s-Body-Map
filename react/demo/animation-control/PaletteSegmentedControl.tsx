import { useState } from "react";
import { motion, type MotionStyle } from "motion/react";
import {
  resetLiquidGlassPointerVars,
  setLiquidGlassPointerVars,
} from "./liquidGlass";

type PaletteSegmentedControlProps<T extends string> = {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  getPaletteColors: (value: T) => readonly string[];
  ariaLabel?: string;
};

const formatPaletteLabel = (palette: string) =>
  palette.charAt(0).toUpperCase() + palette.slice(1);

const RADIAL_REST = {
  x: "12%",
  y: "18%",
  ellipseX: "200%",
  ellipseY: "180%",
} as const;

const getPaletteStopStep = (count: number) =>
  count <= 1 ? "100%" : `${100 / (count - 1)}%`;

const formatRadialColorStops = (colors: readonly string[]) => {
  if (colors.length <= 1) return colors[0] ?? "transparent";

  const step = 100 / (colors.length - 1);
  return colors
    .map((color, index) => `${color} ${index * step}%`)
    .join(", ");
};

const getRadialGradient = (
  colors: readonly string[],
  atX = RADIAL_REST.x,
  atY = RADIAL_REST.y,
  ellipseX = RADIAL_REST.ellipseX,
  ellipseY = RADIAL_REST.ellipseY,
) =>
  `radial-gradient(ellipse ${ellipseX} ${ellipseY} at ${atX} ${atY}, ${formatRadialColorStops(colors)})`;

const buildShiftedRadialStops = (colors: readonly string[]) => {
  const count = colors.length;
  if (count <= 1) return colors[0] ?? "transparent";

  const stops: string[] = [];

  for (let index = -1; index <= count; index += 1) {
    const color = colors[((index % count) + count) % count];
    stops.push(`${color} calc(${index} * var(--rg-step) - var(--rg-shift))`);
  }

  return stops.join(", ");
};

const getShiftedRadialGradientStyle = (
  colors: readonly string[],
): MotionStyle => ({
  background: `radial-gradient(ellipse ${RADIAL_REST.ellipseX} ${RADIAL_REST.ellipseY} at ${RADIAL_REST.x} ${RADIAL_REST.y}, ${buildShiftedRadialStops(colors)})`,
  "--rg-step": getPaletteStopStep(colors.length),
  "--rg-shift": "0%",
});

function PaletteRadialSwatch({
  colors,
  replayKey,
}: {
  colors: readonly string[];
  replayKey: number;
}) {
  if (replayKey === 0) {
    return (
      <span
        className="absolute inset-0"
        style={{ background: getRadialGradient(colors) }}
      />
    );
  }

  return (
    <motion.span
      key={`radial-${replayKey}`}
      className="absolute inset-0"
      style={getShiftedRadialGradientStyle(colors)}
      initial={{ "--rg-shift": "100%" }}
      animate={{ "--rg-shift": "0%" }}
      transition={{
        duration: 0.78,
        ease: [0.22, 1, 0.32, 1],
      }}
    />
  );
}

function PalettePreviewSwatch({
  colors,
  replayKey,
}: {
  colors: readonly string[];
  replayKey: number;
}) {
  const previewBody = (
    <PaletteRadialSwatch colors={colors} replayKey={replayKey} />
  );

  if (replayKey === 0) {
    return (
      <span
        className="relative h-5 w-8 shrink-0 overflow-hidden rounded-[6px]"
        aria-hidden="true"
      >
        {previewBody}
      </span>
    );
  }

  return (
    <motion.span
      key={`jump-${replayKey}`}
      className="relative h-5 w-8 shrink-0 overflow-hidden rounded-[6px]"
      aria-hidden="true"
      initial={{ scale: 0.82, y: 5, opacity: 0.9 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 560,
        damping: 18,
        mass: 0.45,
      }}
    >
      {previewBody}
    </motion.span>
  );
}

export function PaletteSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  getPaletteColors,
  ariaLabel = "Wave color",
}: PaletteSegmentedControlProps<T>) {
  const [replayTicks, setReplayTicks] = useState<Partial<Record<T, number>>>(
    {},
  );
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option === value),
  );

  const handleSelect = (option: T) => {
    setReplayTicks((current) => ({
      ...current,
      [option]: (current[option] ?? 0) + 1,
    }));
    onChange(option);
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="bodymap-liquid-glass-bar relative grid h-[78px] w-[349px] max-w-full gap-0 p-1.5"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
      onPointerEnter={(event) =>
        setLiquidGlassPointerVars(
          event.currentTarget,
          event.clientX,
          event.clientY,
        )
      }
      onPointerMove={(event) =>
        setLiquidGlassPointerVars(
          event.currentTarget,
          event.clientX,
          event.clientY,
        )
      }
      onPointerLeave={(event) =>
        resetLiquidGlassPointerVars(event.currentTarget)
      }
    >
      <div
        className="pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 z-[1] rounded-[20px] bg-[#E4E4E4] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{
          width: `calc((100% - 12px) / ${options.length})`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />
      {options.map((option) => {
        const isSelected = value === option;
        const colors = getPaletteColors(option);
        const replayKey = replayTicks[option] ?? 0;

        return (
          <button
            key={option}
            type="button"
            aria-pressed={isSelected}
            onClick={() => handleSelect(option)}
            onPointerEnter={(event) =>
              setLiquidGlassPointerVars(
                event.currentTarget,
                event.clientX,
                event.clientY,
              )
            }
            onPointerMove={(event) =>
              setLiquidGlassPointerVars(
                event.currentTarget,
                event.clientX,
                event.clientY,
              )
            }
            onPointerLeave={(event) =>
              resetLiquidGlassPointerVars(event.currentTarget)
            }
            className={`font-sans relative z-[2] flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[20px] px-1 transition-[background-color,color,transform] duration-150 ease-out hover:bg-white/35 hover:scale-[1.02] active:scale-[0.97] ${
              isSelected ? "text-[#111]" : "text-[rgba(60,60,67,0.6)]"
            }`}
          >
            {isSelected ? (
              <PalettePreviewSwatch colors={colors} replayKey={replayKey} />
            ) : (
              <span
                className="h-5 w-8 shrink-0 rounded-[6px]"
                style={{ background: getRadialGradient(colors) }}
                aria-hidden="true"
              />
            )}
            <span
              className={`w-full truncate text-center text-sm leading-[18px] ${
                isSelected ? "font-semibold" : "font-medium"
              }`}
            >
              {formatPaletteLabel(option)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
