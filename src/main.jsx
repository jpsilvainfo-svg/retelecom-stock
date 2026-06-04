import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Registra Service Worker para PWA (offline + instalável)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(r => console.log("[PWA] SW registrado:", r.scope))
      .catch(e => console.warn("[PWA] SW falhou:", e));
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
