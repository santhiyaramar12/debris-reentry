import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// 1. SILENCE THIRD-PARTY WARNINGS (THREE.js Clock Deprecation)
if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    // Specifically filter out the THREE.Clock warning from react-globe.gl
    if (
      args[0] &&
      typeof args[0] === "string" &&
      args[0].includes("THREE.Clock")
    ) {
      return;
    }
    originalWarn(...args);
  };
}

// 2. RENDER THE APP
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
