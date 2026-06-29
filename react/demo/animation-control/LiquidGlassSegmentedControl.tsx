import {
  resetLiquidGlassPointerVars,
  setLiquidGlassPointerVars,
} from "./liquidGlass";

export type LiquidGlassSegmentedControlProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  size?: "default" | "compact";
};

export function LiquidGlassSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
  size = "default",
}: LiquidGlassSegmentedControlProps<T>) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const isCompact = size === "compact";
  const barPadding = isCompact ? 4 : 6;
  const segmentRadius = isCompact ? "rounded-[14px]" : "rounded-[20px]";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={[
        "bodymap-liquid-glass-bar relative grid max-w-full gap-0",
        isCompact
          ? "h-9 w-[228px] p-1"
          : "h-[52px] w-[349px] p-1.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
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
        className={`pointer-events-none absolute z-[1] bg-[#E4E4E4] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${segmentRadius}`}
        style={{
          top: barPadding,
          bottom: barPadding,
          left: barPadding,
          width: isCompact
            ? `calc((100% - ${barPadding * 2}px) / ${options.length})`
            : `calc((100% - 12px) / ${options.length})`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`font-sans relative z-[2] min-w-0 text-center transition-[background-color,color,transform] duration-150 ease-out hover:bg-white/35 active:scale-[0.97] ${segmentRadius} ${
            isCompact
              ? "px-3.5 text-xs leading-4"
              : "px-2 text-sm leading-[18px]"
          } ${
            value === option.value
              ? "font-semibold text-[#111]"
              : "font-medium text-[rgba(60,60,67,0.6)]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
