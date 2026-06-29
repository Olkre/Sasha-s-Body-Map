import { LiquidGlassButton } from "./LiquidGlassButton";

type AnimationControlHeaderProps = {
  onClose: () => void;
  onReplay: () => void;
};

export function AnimationControlHeader({
  onClose,
  onReplay,
}: AnimationControlHeaderProps) {
  return (
    <>
      <div className="flex w-full justify-between gap-1">
        <div className="text-[13.333px] font-medium leading-[18px] text-black/50">
          <span>Animation Control</span>
          <h2 className="font-heading mt-2 text-[32px] font-black leading-none tracking-[-0.025em] text-[#111]">
            Muscle Map
          </h2>
        </div>

        <LiquidGlassButton
          onClick={onClose}
          size="compact"
          className="size-8 shrink-0 px-0"
          aria-label="Close settings"
        >
          <svg
            aria-hidden="true"
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </LiquidGlassButton>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <LiquidGlassButton onClick={onReplay} className="flex gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 10 10"
            className="me-1 -mt-1 inline size-5"
          >
            <path
              fill="#000"
              d="M3.3 6.9V3q0-.5.5-.5h.4l3 1.8q.4.3.4.6t-.4.6l-3 1.7-.4.1q-.5 0-.5-.5"
            />
          </svg>
          Replay
        </LiquidGlassButton>
      </div>
    </>
  );
}
