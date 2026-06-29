import {
  SLIDER_THUMB_HEIGHT,
  SLIDER_THUMB_WIDTH,
  SLIDER_TRACK_HEIGHT,
} from "./constants";

export const ANIMATION_CONTROL_STYLES = `
        .bodymap-liquid-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        .bodymap-liquid-slider::-webkit-slider-runnable-track,
        .bodymap-liquid-slider::-webkit-slider-container {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          border: 0;
        }
        .bodymap-liquid-slider::-webkit-slider-runnable-track {
          height: ${SLIDER_TRACK_HEIGHT}px;
        }
        .bodymap-liquid-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: ${SLIDER_THUMB_WIDTH}px;
          height: ${SLIDER_THUMB_HEIGHT}px;
          border: 0;
          background: transparent;
          box-shadow: none;
          cursor: ew-resize;
        }
        .bodymap-liquid-slider::-moz-range-track {
          background: transparent;
          border: 0;
        }
        .bodymap-liquid-slider::-moz-range-thumb {
          width: ${SLIDER_THUMB_WIDTH}px;
          height: ${SLIDER_THUMB_HEIGHT}px;
          border: 0;
          background: transparent;
          box-shadow: none;
          cursor: ew-resize;
        }
        .bodymap-liquid-slider-thumb {
          box-sizing: border-box;
          flex-shrink: 0;
          transform: translateX(-50%) scale(1);
          transform-origin: center center;
          transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
          will-change: transform;
        }
        @media (hover: hover) and (prefers-reduced-motion: no-preference) {
          .group\\/slider:hover .bodymap-liquid-slider-thumb {
            transform: translateX(-50%) scale(1.08);
          }
          .group\\/slider:hover .bodymap-liquid-slider-thumb.is-active {
            transform: translateX(-50%) scale(0.92);
          }
        }
        .bodymap-liquid-slider-thumb.is-active {
          transform: translateX(-50%) scale(0.92);
          transition-duration: 80ms;
        }
        .bodymap-liquid-slider-label {
          --digit-dur: 500ms;
          --digit-distance: 8px;
          --digit-stagger: 70ms;
          --digit-blur: 2px;
          --label-stale-blur: 4px;
          --digit-ease: cubic-bezier(0.34, 1.45, 0.64, 1);
          --digit-dir-x: 0;
          --digit-dir-y: 1;
          opacity: 0;
          transition:
            opacity 150ms ease-out,
            filter 180ms ease-out;
        }
        .bodymap-liquid-slider-label .t-digit-group {
          display: inline-flex;
          align-items: baseline;
          transition: opacity 180ms ease-out;
        }
        .bodymap-liquid-slider-label.is-stale {
          filter: blur(var(--label-stale-blur));
        }
        .bodymap-liquid-slider-label.is-stale .t-digit-group {
          opacity: 0.35;
        }
        .bodymap-liquid-slider-label.is-stale .t-digit-group .t-digit {
          animation: none;
        }
        @keyframes bodymap-digit-pop-in {
          0% {
            transform: translate(
              calc(var(--digit-distance) * var(--digit-dir-x)),
              calc(var(--digit-distance) * var(--digit-dir-y))
            );
            opacity: 0;
            filter: blur(var(--digit-blur));
          }
          100% {
            transform: translate(0, 0);
            opacity: 1;
            filter: blur(0);
          }
        }
        .bodymap-liquid-slider-label .t-digit {
          display: inline-block;
          will-change: transform, opacity, filter;
        }
        @media (hover: hover) {
          .group\\/slider:hover .bodymap-liquid-slider-label .t-digit-group .t-digit {
            animation: bodymap-digit-pop-in var(--digit-dur) var(--digit-ease) both;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .bodymap-liquid-slider-label .t-digit-group .t-digit {
            animation: none !important;
          }
        }
        @media (hover: hover) {
          .group\\/slider:hover .bodymap-liquid-slider-label {
            opacity: 1;
          }
        }
        .bodymap-liquid-slider:focus-visible {
          outline: none;
        }
        .bodymap-liquid-glass,
        .bodymap-liquid-glass-fill,
        .bodymap-liquid-glass-bar {
          --highlight-x: 0px;
          --highlight-y: -3px;
          --glow-x: 0px;
          --glow-y: 0px;
          --shine-x: 50%;
          --shine-y: 50%;
          --shine-size: 140px;
          --border-angle: 225deg;
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.92);
          background: linear-gradient(0deg, #fff 0%, #fff 100%), #f7f7f7;
          box-shadow:
            var(--highlight-x) var(--highlight-y) 4px 0 #fff inset,
            var(--glow-x) var(--glow-y) 9.4px 1px rgba(0, 11, 80, 0.07) inset,
            0 8px 40px rgba(0, 0, 0, 0.12);
          color: #111111;
          transform: scale(1);
          transform-origin: center;
          transition:
            transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
            box-shadow 260ms cubic-bezier(0.23, 1, 0.32, 1),
            background-color 160ms ease-out;
          will-change: transform, box-shadow;
        }
        .bodymap-liquid-glass {
          border-radius: 1000px;
        }
        .bodymap-liquid-glass-bar {
          border-radius: 26px;
        }
        .bodymap-liquid-glass-fill {
          border-radius: 20px;
          box-shadow:
            var(--highlight-x) var(--highlight-y) 4px 0 #fff inset,
            var(--glow-x) var(--glow-y) 9.4px 1px rgba(0, 11, 80, 0.07) inset,
            0 8px 40px rgba(0, 0, 0, 0.12);
        }
        .bodymap-liquid-glass-fill > * {
          position: relative;
          z-index: 2;
        }
        .bodymap-liquid-glass::before,
        .bodymap-liquid-glass-fill::before,
        .bodymap-liquid-glass-bar::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          border-radius: inherit;
          padding: 1px;
          pointer-events: none;
          opacity: 0;
          background: conic-gradient(
            from var(--border-angle) at 50% 50%,
            rgba(255, 255, 255, 1) 0deg,
            rgba(255, 255, 255, 0.42) 52deg,
            rgba(186, 206, 255, 0.18) 108deg,
            rgba(255, 255, 255, 0.38) 168deg,
            rgba(255, 255, 255, 0.96) 228deg,
            rgba(255, 255, 255, 0.5) 292deg,
            rgba(255, 255, 255, 1) 360deg
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          mask-composite: exclude;
          transition: opacity 0.38s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .bodymap-liquid-glass::after,
        .bodymap-liquid-glass-fill::after,
        .bodymap-liquid-glass-bar::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          filter: blur(16px);
          background-image: radial-gradient(
            var(--shine-size) 140% at var(--shine-x) var(--shine-y),
            rgba(255, 255, 255, 0.5) 0%,
            rgba(255, 255, 255, 0.24) 32%,
            rgba(255, 255, 255, 0.08) 52%,
            rgba(255, 255, 255, 0) 72%
          );
          background-repeat: no-repeat;
          background-size: 100% 100%;
          transition:
            opacity 0.38s cubic-bezier(0.23, 1, 0.32, 1),
            filter 0.38s cubic-bezier(0.23, 1, 0.32, 1);
        }
        @media (hover: hover) and (prefers-reduced-motion: no-preference) {
          .bodymap-liquid-glass:hover {
            transform: scale(1.04);
            border-color: transparent;
          }
          .bodymap-liquid-glass:hover::before,
          .bodymap-liquid-glass-fill:hover::before,
          .bodymap-liquid-glass-bar:hover::before {
            opacity: 1;
            transition: opacity 0.55s cubic-bezier(0.23, 1, 0.32, 1);
          }
          .bodymap-liquid-glass:hover::after,
          .bodymap-liquid-glass-fill:hover::after,
          .bodymap-liquid-glass-bar:hover::after {
            opacity: 1;
            filter: blur(10px);
            transition:
              opacity 0.55s cubic-bezier(0.23, 1, 0.32, 1),
              filter 0.55s cubic-bezier(0.23, 1, 0.32, 1);
          }
          .bodymap-liquid-glass-fill:hover {
            border-color: transparent;
          }
          .bodymap-liquid-glass-bar:hover {
            border-color: transparent;
          }
        }
        .bodymap-liquid-glass:active,
        .bodymap-liquid-glass-fill:active {
          transform: scale(0.97);
        }
        .bodymap-liquid-glass-week-inactive {
          border-color: transparent;
          background: rgba(0, 0, 0, 0.045);
          box-shadow: none;
          color: rgba(0, 0, 0, 0.42);
          font-weight: 500;
        }
        .bodymap-liquid-glass-week-inactive::before,
        .bodymap-liquid-glass-week-inactive::after {
          opacity: 0 !important;
        }
        @media (hover: hover) and (prefers-reduced-motion: no-preference) {
          .bodymap-liquid-glass-week-inactive:hover {
            transform: scale(1.02);
            border-color: transparent;
            background: rgba(0, 0, 0, 0.07);
            color: rgba(0, 0, 0, 0.58);
            box-shadow: none;
          }
        }
        .bodymap-liquid-glass-week-active {
          border-color: rgba(255, 255, 255, 0.92);
          background: linear-gradient(0deg, #fff 0%, #fff 100%), #f7f7f7;
          box-shadow:
            var(--highlight-x) var(--highlight-y) 4px 0 #fff inset,
            var(--glow-x) var(--glow-y) 9.4px 1px rgba(0, 11, 80, 0.07) inset,
            0 8px 40px rgba(0, 0, 0, 0.12);
          color: #111111;
        }
      `;
