import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MuscleMap from "./MuscleMap";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MuscleMap />
  </StrictMode>,
);
