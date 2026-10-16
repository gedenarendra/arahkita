import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// App.css removed
import "./assets/index.css";
import App from "./App.jsx";

// Nonaktifkan gesture pinch-to-zoom pada iOS Safari & perangkat mobile
if (typeof document !== "undefined") {
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("gesturechange", (e) => e.preventDefault());
  document.addEventListener("gestureend", (e) => e.preventDefault());

  // Cegah pinch zoom dengan 2 jari agar viewport tetap fixed
  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false },
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
