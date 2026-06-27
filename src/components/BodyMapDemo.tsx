import { type CSSProperties, type PointerEvent, useState } from "react";

import FemaleBody from "./FemaleBody";
import MaleBody from "./MaleBody";

type DemoGender = "male" | "female";

type HoverState = {
  label: string;
  x: number;
  y: number;
} | null;

const wrapperStyle: CSSProperties = {
  position: "relative",
  width: "min(100%, 760px)",
  margin: "0 auto",
  padding: "24px",
  borderRadius: "28px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,247,244,0.98) 100%)",
  boxShadow:
    "0 24px 80px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
};

const segmentedStyle: CSSProperties = {
  display: "inline-flex",
  padding: "4px",
  borderRadius: "999px",
  background: "#edf1ed",
  gap: "4px",
  marginBottom: "18px",
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
  transition: "background 140ms ease, color 140ms ease",
});

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
});

const bodyStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  color: "#d8ddda",
};

const titleStyle: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "28px",
  lineHeight: 1.05,
  letterSpacing: "-0.04em",
  color: "#162117",
};

const subtitleStyle: CSSProperties = {
  margin: "0 0 18px",
  fontSize: "14px",
  lineHeight: 1.5,
  color: "#5f6d5f",
};

const formatMuscleName = (muscle: string) =>
  muscle
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export default function BodyMapDemo() {
  const [gender, setGender] = useState<DemoGender>("male");
  const [hovered, setHovered] = useState<HoverState>(null);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const muscle = target?.dataset?.muscle;

    if (!muscle) {
      setHovered(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    setHovered({
      label: formatMuscleName(muscle),
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };

  const BodyComponent = gender === "male" ? MaleBody : FemaleBody;

  return (
    <section style={wrapperStyle}>
      <h2 style={titleStyle}>Body Map Demo</h2>
      <p style={subtitleStyle}>
        Hover any region to read its muscle label from the SVG&apos;s
        <code> data-muscle </code>
        metadata.
      </p>

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

      <div
        style={{ position: "relative" }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHovered(null)}
      >
        <BodyComponent style={bodyStyle} />
        {hovered ? <div style={tooltipStyle(hovered)}>{hovered.label}</div> : null}
      </div>
    </section>
  );
}
