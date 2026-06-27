import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import BodyMapDemo from "../components/BodyMapDemo";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BodyMapDemo />
  </StrictMode>,
);
