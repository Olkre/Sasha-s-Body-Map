import {
  resetLiquidGlassPointerVars,
  setLiquidGlassPointerVars,
} from "./liquidGlass";
import { ScaleOriginIcon } from "./ScaleOriginIcon";
import type { ScaleOriginOption, ScaleOriginVariant } from "./types";

type ScaleOriginSegmentedControlProps = {
  options: ScaleOriginOption[];
  value: ScaleOriginVariant;
  selectedIndex: number;
  replayTick: number;
  onChange: (value: ScaleOriginVariant) => void;
};

export function ScaleOriginSegmentedControl({
  options,
  value,
  selectedIndex,
  replayTick,
  onChange,
}: ScaleOriginSegmentedControlProps) {
  return (
    <div
      className="bodymap-liquid-glass-bar relative grid h-[78px] w-[349px] max-w-full grid-cols-4 gap-0 p-1.5"
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
          width: "calc((100% - 12px) / 4)",
          transform: `translateX(${Math.max(0, selectedIndex) * 100}%)`,
        }}
      />
      {options.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
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
            value === key
              ? "text-[#111]"
              : "text-[rgba(60,60,67,0.6)]"
          }`}
        >
          <ScaleOriginIcon
            variant={key}
            active={value === key}
            replayKey={value === key ? `${key}-${replayTick}` : "idle"}
          />
          <span
            className={`w-full truncate text-center text-sm leading-[18px] ${
              value === key ? "font-semibold" : "font-medium"
            }`}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
