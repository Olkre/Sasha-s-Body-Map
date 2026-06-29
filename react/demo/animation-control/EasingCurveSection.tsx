import type { BezierCoords } from "./types";

type EasingCurveOption<K extends string> = {
  key: K;
  label: string;
};

type EasingCurveSectionProps<K extends string = string> = {
  displayBezier: BezierCoords;
  options: EasingCurveOption<K>[];
  selectedIndex: number;
  previewedEasingType: K;
  onSelect: (key: K) => void;
  onPreview: (key: K) => void;
  onPreviewEnd: () => void;
  scrollable?: boolean;
};

export function EasingCurveSection({
  displayBezier,
  options,
  selectedIndex,
  previewedEasingType,
  onSelect,
  onPreview,
  onPreviewEnd,
  scrollable = false,
}: EasingCurveSectionProps<K>) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium hidden leading-[18px] text-[#111]">
        Easing Curve
      </div>
      <div className="grid grid-cols-[158px_minmax(0,177px)] gap-4">
        <div className="space-y-1">
          <div className="relative h-[158px] overflow-hidden rounded-[17px] bg-white">
            <svg
              viewBox="0 0 158 158"
              className="h-full w-full"
              aria-hidden="true"
            >
              <path
                d="M20 20V138H138"
                stroke="rgba(17,17,17,0.3)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M20 49.5H138M20 108.5H138"
                stroke="rgba(17,17,17,0.05)"
              />
              <path d="M79 20V138" stroke="rgba(17,17,17,0.06)" />
              <path
                d={`M 20 138 C ${20 + displayBezier.x1 * 120} ${20 + (1.5 - displayBezier.y1) * 60} ${20 + displayBezier.x2 * 120} ${20 + (1.5 - displayBezier.y2) * 60} 138 20`}
                stroke="#111"
                strokeWidth="2.4"
                fill="none"
              />
              <circle
                cx="20"
                cy="138"
                r="5.4"
                fill="#fff"
                stroke="#111"
                strokeWidth="2.4"
              />
              <circle
                cx={20 + displayBezier.x1 * 120}
                cy={20 + (1.5 - displayBezier.y1) * 60}
                r="5.4"
                fill="#fff"
                stroke="#111"
                strokeWidth="2.4"
              />
            </svg>
          </div>
          <div className="text-center text-[9.6px] leading-[14.88px] text-[#111] opacity-30">
            {`${displayBezier.x1.toFixed(2)}, ${displayBezier.y1.toFixed(2)}, ${displayBezier.x2.toFixed(2)}, ${displayBezier.y2.toFixed(2)}`}
          </div>
        </div>
        <div
          className={[
            "relative flex flex-col gap-px rounded-[17px] bg-[#E4E4E4] p-0.5",
            scrollable
              ? "max-h-[158px] overflow-y-auto overscroll-contain"
              : "h-[158px] justify-center",
          ].join(" ")}
          onPointerLeave={onPreviewEnd}
        >
          {!scrollable ? (
            <div
              className="pointer-events-none absolute left-0.5 right-0.5 top-0.5 h-[30px] rounded-[20px] bg-white transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{
                opacity: selectedIndex >= 0 ? 1 : 0,
                transform: `translateY(${Math.max(0, selectedIndex) * 31}px)`,
              }}
            />
          ) : null}
          {options.map(({ key, label }) => {
            const isSelected = options[selectedIndex]?.key === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                onPointerEnter={() => onPreview(key)}
                className={`font-sans relative z-[1] h-[30px] rounded-[20px] px-4 text-center text-sm leading-[18px] transition-[background-color,color,transform] duration-150 ease-out hover:bg-white/45 active:scale-[0.97] ${
                  scrollable && isSelected ? "bg-white" : ""
                } ${
                  previewedEasingType === key
                    ? "font-semibold text-[#111]"
                    : "font-medium text-[rgba(60,60,67,0.6)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
