import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import FemaleBody from "./FemaleBody";
import MaleBody from "./MaleBody";

type DemoGender = "male" | "female";

type HoverState = {
  label: string;
  muscleId: number;
  x: number;
  y: number;
} | null;

type Ripple = {
  id: number;
  x: number;
  y: number;
};

const MUSCLE_CONNECTIONS: Readonly<Record<number, readonly number[]>> = {
  0: [15, 4, 8, 2, 10],
  1: [2, 6, 10],
  2: [1, 4, 15],
  3: [5, 6, 7, 9],
  4: [2, 5, 6, 15],
  5: [4, 3, 8],
  6: [4, 1, 3, 9],
  7: [8, 3, 17, 14],
  8: [5, 7, 15],
  9: [6, 3],
  10: [1, 11, 13],
  11: [10, 14, 17],
  12: [14, 16, 17, 13],
  13: [10, 16, 12],
  14: [7, 11, 17, 12],
  15: [2, 4, 8, 7],
  16: [12, 13],
  17: [7, 11, 14, 12],
};

const MUSCLE_TINTS: Record<number, string> = {
  0: "#d8ddda",
  1: "#22c55e",
  2: "#4ade80",
  3: "#bef264",
};

const wrapperStyle: CSSProperties = {
  position: "relative",
  width: "min(100%, 860px)",
  margin: "0 auto",
  padding: "24px",
  borderRadius: "32px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,247,244,0.98) 100%)",
  boxShadow:
    "0 24px 80px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
};

const topRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "18px",
  marginBottom: "22px",
};

const segmentedStyle: CSSProperties = {
  display: "inline-flex",
  padding: "4px",
  borderRadius: "999px",
  background: "#edf1ed",
  gap: "4px",
};

const buttonStyle = (active: boolean): CSSProperties => ({
  border: 0,
  borderRadius: "999px",
  padding: "10px 16px",
  fontSize: "14px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  cursor: "pointer",
  color: active ? "#ffffff" : "#466046",
  background: active ? "#2f6f42" : "transparent",
  transition: "background 160ms ease, color 160ms ease, transform 160ms ease",
  transform: active ? "translateY(-1px)" : "translateY(0)",
});

const actionButtonStyle: CSSProperties = {
  border: "1px solid rgba(47, 111, 66, 0.14)",
  borderRadius: "999px",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  cursor: "pointer",
  color: "#25412c",
  background: "#f7fbf7",
};

const tooltipStyle = (hovered: HoverState): CSSProperties => ({
  position: "absolute",
  left: hovered.x,
  top: hovered.y,
  transform: "translate(-50%, calc(-100% - 14px))",
  pointerEvents: "none",
  padding: "9px 12px",
  borderRadius: "999px",
  background: "rgba(17, 24, 19, 0.94)",
  color: "#f8faf8",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  whiteSpace: "nowrap",
  boxShadow: "0 14px 30px rgba(17, 24, 19, 0.18)",
  zIndex: 5,
});

const bodyStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
};

const titleStyle: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "28px",
  lineHeight: 1.05,
  letterSpacing: "-0.04em",
  color: "#162117",
};

const subtitleStyle: CSSProperties = {
  margin: "0",
  maxWidth: "38rem",
  fontSize: "14px",
  lineHeight: 1.55,
  color: "#5f6d5f",
};

const stageStyle: CSSProperties = {
  position: "relative",
  borderRadius: "28px",
  overflow: "hidden",
  background:
    "radial-gradient(circle at 50% 0%, rgba(134, 239, 172, 0.18), transparent 30%), linear-gradient(180deg, #fbfefb 0%, #eef5ee 100%)",
  border: "1px solid rgba(47, 111, 66, 0.08)",
  padding: "20px 18px 10px",
};

const stageInnerStyle: CSSProperties = {
  position: "relative",
  isolation: "isolate",
};

const bodyShellStyle = (gender: DemoGender): CSSProperties => ({
  position: "relative",
  zIndex: 2,
  color: "#d8ddda",
  animation: `bodyMapMorphIn 420ms cubic-bezier(0.22, 1, 0.36, 1)`,
  transformOrigin: gender === "male" ? "46% 30%" : "54% 30%",
});

const metaRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "12px",
  marginTop: "18px",
};

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "#edf6ef",
  color: "#24412a",
  fontSize: "13px",
  fontWeight: 600,
};

const helperStyle: CSSProperties = {
  margin: "0",
  fontSize: "13px",
  lineHeight: 1.5,
  color: "#687669",
};

const statDotStyle = (color: string): CSSProperties => ({
  width: "9px",
  height: "9px",
  borderRadius: "999px",
  background: color,
  boxShadow: `0 0 0 4px ${color}22`,
});

const formatMuscleName = (muscle: string) =>
  muscle
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const getWaveLayers = (originMuscleId: number, maxDepth = 3) => {
  const layers = new Map<number, number>([[originMuscleId, 0]]);
  const queue: Array<{ id: number; depth: number }> = [
    { id: originMuscleId, depth: 0 },
  ];
  const visited = new Set<number>([originMuscleId]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= maxDepth) continue;

    for (const neighborId of MUSCLE_CONNECTIONS[current.id] ?? []) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      const nextDepth = current.depth + 1;
      layers.set(neighborId, nextDepth);
      queue.push({ id: neighborId, depth: nextDepth });
    }
  }

  return layers;
};

type BodyMapDemoProps = {
  mode?: "full" | "embedded";
};

export default function BodyMapDemo({
  mode = "full",
}: BodyMapDemoProps) {
  const [gender, setGender] = useState<DemoGender>("male");
  const [hovered, setHovered] = useState<HoverState>(null);
  const [selectedMuscleId, setSelectedMuscleId] = useState<number | null>(2);
  const [selectedLabel, setSelectedLabel] = useState("Upper Chest");
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rippleIdRef = useRef(0);
  const clearRippleTimerRef = useRef<number | null>(null);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const muscle = target?.dataset?.muscle;
    const muscleId = Number(target?.dataset?.muscleId);

    if (!muscle || Number.isNaN(muscleId)) {
      setHovered(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    setHovered({
      label: formatMuscleName(muscle),
      muscleId,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };

  const triggerShockwave = (muscleId: number, sourcePath?: SVGPathElement | null) => {
    const stage = stageRef.current;
    if (!stage) return;

    const layers = getWaveLayers(muscleId, 3);
    const paths = Array.from(stage.querySelectorAll<SVGPathElement>("path[data-muscle-id]"));

    for (const path of paths) {
      const pathMuscleId = Number(path.dataset.muscleId);
      const layer = layers.get(pathMuscleId);
      if (layer === undefined) continue;

      const tint = MUSCLE_TINTS[Math.min(layer + 1, 3)];
      const delay = layer * 65;
      const scale = layer === 0 ? 1.14 : layer === 1 ? 1.08 : layer === 2 ? 1.045 : 1.02;

      path.animate(
        [
          { fill: tint, transform: "scale(1)" },
          { fill: tint, transform: `scale(${scale})`, offset: 0.42 },
          { fill: tint, transform: "scale(0.992)", offset: 0.72 },
          { fill: tint, transform: "scale(1)" },
        ],
        {
          duration: 520 - layer * 40,
          delay,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "none",
        },
      );
    }

    const originRect = (sourcePath ?? paths.find((path) => Number(path.dataset.muscleId) === muscleId))?.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

    if (!originRect) return;

    const x = ((originRect.left + originRect.width / 2 - stageRect.left) / stageRect.width) * 100;
    const y = ((originRect.top + originRect.height / 2 - stageRect.top) / stageRect.height) * 100;

    const nextRipple = { id: rippleIdRef.current++, x, y };
    setRipples((current) => [...current, nextRipple]);

    if (clearRippleTimerRef.current) {
      window.clearTimeout(clearRippleTimerRef.current);
    }

    clearRippleTimerRef.current = window.setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== nextRipple.id));
    }, 900);
  };

  const handleStageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as SVGPathElement | null;
    const muscle = target?.dataset?.muscle;
    const muscleId = Number(target?.dataset?.muscleId);

    if (!muscle || Number.isNaN(muscleId)) return;

    setSelectedMuscleId(muscleId);
    setSelectedLabel(formatMuscleName(muscle));
    triggerShockwave(muscleId, target);
  };

  const playCurrentSelection = () => {
    if (selectedMuscleId == null) return;
    triggerShockwave(selectedMuscleId);
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const paths = Array.from(stage.querySelectorAll<SVGPathElement>("path[data-muscle-id]"));
    const hoveredId = hovered?.muscleId ?? null;
    const activeLayers =
      selectedMuscleId == null ? null : getWaveLayers(selectedMuscleId, 2);

    for (const path of paths) {
      const muscleId = Number(path.dataset.muscleId);
      const isSelected = selectedMuscleId === muscleId;
      const isHovered = hoveredId === muscleId;
      const layer = activeLayers?.get(muscleId);

      path.style.transformBox = "fill-box";
      path.style.transformOrigin = "center";
      path.style.transition =
        "fill 180ms ease, opacity 180ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1), filter 180ms ease";
      path.style.cursor = "pointer";

      if (isSelected) {
        path.style.fill = "#16a34a";
        path.style.opacity = "1";
        path.style.transform = "scale(1.035)";
        path.style.filter = "drop-shadow(0 0 10px rgba(34, 197, 94, 0.16))";
        continue;
      }

      if (isHovered) {
        path.style.fill = "#84cc16";
        path.style.opacity = "1";
        path.style.transform = "scale(1.022)";
        path.style.filter = "drop-shadow(0 0 8px rgba(132, 204, 22, 0.18))";
        continue;
      }

      if (layer !== undefined && layer > 0) {
        path.style.fill = layer === 1 ? "#b7e4be" : "#d7ecd9";
        path.style.opacity = "1";
        path.style.transform = "scale(1)";
        path.style.filter = "none";
        continue;
      }

      path.style.fill = "#d8ddda";
      path.style.opacity = hoveredId == null || path.dataset.muscleId === String(hoveredId) ? "1" : "0.9";
      path.style.transform = "scale(1)";
      path.style.filter = "none";
    }
  }, [gender, hovered, selectedMuscleId]);

  useEffect(() => {
    return () => {
      if (clearRippleTimerRef.current) {
        window.clearTimeout(clearRippleTimerRef.current);
      }
    };
  }, []);

  const BodyComponent = gender === "male" ? MaleBody : FemaleBody;
  const isEmbedded = mode === "embedded";

  return (
    <section style={wrapperStyle}>
      <style>
        {`
          @keyframes bodyMapMorphIn {
            0% {
              opacity: 0;
              transform: translateY(18px) scale(0.985);
              filter: saturate(0.92) blur(6px);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
              filter: saturate(1) blur(0);
            }
          }

          @keyframes bodyMapRipple {
            0% {
              opacity: 0.48;
              transform: translate(-50%, -50%) scale(0.18);
            }
            70% {
              opacity: 0.18;
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `}
      </style>

      {isEmbedded ? null : (
        <div style={topRowStyle}>
          <div>
            <h2 style={titleStyle}>Body Map Demo</h2>
            <p style={subtitleStyle}>
              Click any muscle to select it, fire the package shockwave, and preview the
              transition treatment the body map uses in the app.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "flex-end" }}>
            <div style={segmentedStyle}>
              <button
                type="button"
                style={buttonStyle(gender === "male")}
                onClick={() => setGender("male")}
              >
                Male
              </button>
              <button
                type="button"
                style={buttonStyle(gender === "female")}
                onClick={() => setGender("female")}
              >
                Female
              </button>
            </div>

            <button
              type="button"
              style={actionButtonStyle}
              onClick={playCurrentSelection}
              disabled={selectedMuscleId == null}
            >
              Replay Shockwave
            </button>
          </div>
        </div>
      )}

      <div
        ref={stageRef}
        style={stageStyle}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHovered(null)}
        onClick={handleStageClick}
      >
        <div style={stageInnerStyle}>
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              style={{
                position: "absolute",
                left: `${ripple.x}%`,
                top: `${ripple.y}%`,
                width: "clamp(110px, 16vw, 170px)",
                aspectRatio: "1",
                borderRadius: "999px",
                border: "2px solid rgba(34, 197, 94, 0.38)",
                background:
                  "radial-gradient(circle, rgba(34, 197, 94, 0.22) 0%, rgba(132, 204, 22, 0.08) 40%, transparent 68%)",
                animation: "bodyMapRipple 820ms cubic-bezier(0.2, 0.9, 0.25, 1) forwards",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
          ))}

          <div key={gender} style={bodyShellStyle(gender)}>
            <BodyComponent style={bodyStyle} />
          </div>
        </div>

        {hovered ? <div style={tooltipStyle(hovered)}>{hovered.label}</div> : null}
      </div>

      {isEmbedded ? null : (
        <div style={metaRowStyle}>
          <div style={chipStyle}>
            <span style={statDotStyle("#16a34a")} />
            Selected: {selectedLabel}
          </div>
          <div style={chipStyle}>
            <span style={statDotStyle("#84cc16")} />
            Hover: {hovered?.label ?? "Move over a region"}
          </div>
          <p style={helperStyle}>
            The standalone package demo now shows three app-like behaviors: body swap
            transitions, click selection state, and radial ripple propagation across
            connected muscle groups.
          </p>
        </div>
      )}
    </section>
  );
}
