import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import BodyMapDemo from "../components/BodyMapDemo";
import {
  BODYMAP_DEFAULTS,
  EASING_OPTIONS,
  SCALE_ORIGIN_OPTIONS,
} from "./animation-control/constants";
import "./styles.css";

function App() {
  return (
    <div className="studio-shell">
      <div className="studio-board">
        <section className="control-panel">
          <div className="control-head">
            <p className="control-kicker">Animation Control</p>
            <h1>Muscle Map</h1>
            <button type="button" className="replay-pill">
              <span className="play-icon" aria-hidden="true" />
              Replay
            </button>
          </div>

          <button type="button" className="close-orb" aria-label="Close preview">
            ×
          </button>

          <div className="control-group">
            <div className="range-with-icons">
              <span className="glyph person-left" aria-hidden="true" />
              <div className="range-track">
                <div className="range-thumb" style={{ left: "7%" }} />
              </div>
              <span className="glyph person-right" aria-hidden="true" />
            </div>
          </div>

          <div className="tab-card" role="tablist" aria-label="Animation focus">
            {SCALE_ORIGIN_OPTIONS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`tab-chip${tab.key === "top" ? " is-active" : ""}`}
                role="tab"
                aria-selected={tab.key === "top"}
              >
                <span className="tab-bars" aria-hidden="true" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="control-group">
            <div className="range-with-icons compact">
              <span className="emoji-glyph" aria-hidden="true">
                🐢
              </span>
              <div className="range-track dotted">
                <div className="range-thumb" style={{ left: "78%" }} />
              </div>
              <span className="emoji-glyph" aria-hidden="true">
                🐇
              </span>
            </div>
          </div>

          <div className="control-group">
            <div className="range-with-icons compact">
              <span className="glyph dot-left" aria-hidden="true" />
              <div className="range-track">
                <div className="range-thumb" style={{ left: "22%" }} />
              </div>
              <span className="glyph dot-grid" aria-hidden="true" />
            </div>
          </div>

          <div className="easing-block">
            <p className="section-label">Easing Curve</p>
            <div className="easing-card">
              <div className="curve-plot" aria-hidden="true">
                <svg viewBox="0 0 210 210" className="curve-svg">
                  <path d="M24 182H182" className="curve-axis" />
                  <path d="M24 182V24" className="curve-axis" />
                  <path d="M24 128H182" className="curve-grid" />
                  <path d="M95 182V24" className="curve-grid" />
                    <path
                      d={`M 24 182 C ${
                      24 + BODYMAP_DEFAULTS.customBezier.x1 * 158
                    } ${24 + (1.5 - BODYMAP_DEFAULTS.customBezier.y1) * 79} ${
                      24 + BODYMAP_DEFAULTS.customBezier.x2 * 158
                    } ${24 + (1.5 - BODYMAP_DEFAULTS.customBezier.y2) * 79} 182 24`}
                    className="curve-line"
                  />
                  <circle cx="24" cy="182" r="8" className="curve-point origin" />
                  <circle
                    cx={24 + BODYMAP_DEFAULTS.customBezier.x1 * 158}
                    cy={24 + (1.5 - BODYMAP_DEFAULTS.customBezier.y1) * 79}
                    r="8"
                    className="curve-point handle"
                  />
                </svg>
                <p>
                  {`${BODYMAP_DEFAULTS.customBezier.x1.toFixed(2)}, ${BODYMAP_DEFAULTS.customBezier.y1.toFixed(
                    2,
                  )}, ${BODYMAP_DEFAULTS.customBezier.x2.toFixed(2)}, ${BODYMAP_DEFAULTS.customBezier.y2.toFixed(2)}`}
                </p>
              </div>

              <div className="easing-list">
                {EASING_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`easing-option${
                      option.key === "easeIOSDrawer" ? " is-active" : ""
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button type="button" className="reset-pill">
            Reset to defaults
          </button>
        </section>

        <section className="preview-panel" aria-label="Live muscle map preview">
          <div className="calendar-card">
            <div>
              <h2>March, 2026</h2>
              <div className="calendar-weekdays">
                <span>SUN</span>
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span className="is-current">THU</span>
                <span>FRI</span>
                <span>SAT</span>
              </div>
            </div>
            <div className="calendar-badge">Week</div>
            <div className="calendar-days">
              <span className="day muted">22</span>
              <span className="day">23</span>
              <span className="day">24</span>
              <span className="day muted">25</span>
              <span className="day active">26</span>
              <span className="day">27</span>
              <span className="day">28</span>
            </div>
          </div>

          <div className="preview-toggle" role="tablist" aria-label="Body preset">
            <button type="button" className="toggle-button is-active" role="tab" aria-selected="true">
              Male
            </button>
            <button type="button" className="toggle-button" role="tab" aria-selected="false">
              Female
            </button>
          </div>

          <div className="preview-demo-wrap">
            <BodyMapDemo mode="embedded" />
          </div>

          <div className="legend-row" aria-label="Muscle intensity legend">
            <span><i className="dot dot-0" /> Not worked</span>
            <span><i className="dot dot-1" /> Light</span>
            <span><i className="dot dot-2" /> Moderate</span>
            <span><i className="dot dot-3" /> Strong</span>
            <span><i className="dot dot-4" /> Max</span>
          </div>
        </section>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
