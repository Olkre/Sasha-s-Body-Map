import React from "react";
import {
  resetLiquidGlassPointerVars,
  setLiquidGlassPointerVars,
} from "./liquidGlass";

type LiquidGlassButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  size?: "default" | "compact";
  layout?: "row" | "column";
  "aria-label"?: string;
  "aria-pressed"?: boolean;
};

export function LiquidGlassButton({
  children,
  onClick,
  className = "",
  size = "default",
  layout = "row",
  "aria-label": ariaLabel,
  "aria-pressed": ariaPressed,
}: LiquidGlassButtonProps) {
  const sizeClassName =
    size === "compact"
      ? "h-8 px-3.5 text-xs font-semibold"
      : "h-11 px-5 text-sm font-semibold";
  const layoutClassName =
    layout === "column"
      ? "flex-col gap-1.5 whitespace-normal"
      : "gap-2 whitespace-nowrap";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
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
      className={`bodymap-liquid-glass flex items-center justify-center ${layoutClassName} ${sizeClassName} ${className}`}
    >
      <span
        className={`relative z-[2] flex items-center justify-center ${
          layout === "column" ? "w-full flex-col gap-1.5" : "gap-2"
        }`}
      >
        {children}
      </span>
    </button>
  );
}
